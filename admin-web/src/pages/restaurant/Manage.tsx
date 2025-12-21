import { useAppSelector } from '@/store/hooks'
import { tenantAPI } from '@/services/cloudbase'
import { regionConfigAPI } from '@/services/regionConfig'
import { parseAddressToRegion, getRegionLabel, REGION_OPTIONS } from '@/utils/addressParser'
import {
  EditOutlined,
  PlusOutlined,
  ShopOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Form,
  AutoComplete,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Restaurant {
  id: string
  _id?: string
  name: string
  address: string
  phone: string
  email: string
  region?: string  // 基准值区域代码（如 'east_china'）
  factorRegion?: string  // 因子区域代码（如 'CN'）
  status: 'active' | 'inactive' | 'pending' | 'suspended'
  certificationLevel?: 'bronze' | 'silver' | 'gold' | 'platinum'
  certificationStatus?: string
  tenantId: string
  createdAt?: string
}

const RestaurantManage: React.FC = () => {
  const { t } = useTranslation()
  const { currentTenant } = useAppSelector((state: any) => state.tenant)
  const [dataSource, setDataSource] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState<Restaurant | null>(null)
  const [form] = Form.useForm()
  const [factorRegionOptions, setFactorRegionOptions] = useState<Array<{ value: string; label: string }>>([])
  
  // 处理地址输入完成，自动识别地区（在失去焦点时触发）
  const handleAddressBlur = () => {
    // 从表单中获取地址值
    const address = form.getFieldValue('address')
    
    // 如果地址不为空，尝试识别地区
    if (address && address.trim()) {
      const region = parseAddressToRegion(address)
      if (region) {
        const currentRegion = form.getFieldValue('region')
        // 每次失去焦点都自动识别并更新地区
        form.setFieldsValue({ region })
        // 如果地区发生了变化，显示提示
        if (currentRegion !== region) {
          message.success(`已自动识别地区：${getRegionLabel(region)}`)
        }
      }
    }
  }

  useEffect(() => {
    if (currentTenant?.id) {
      fetchRestaurants()
    }
    // 加载因子区域选项
    loadFactorRegionOptions()
  }, [currentTenant])

  // 加载因子区域选项
  const loadFactorRegionOptions = async () => {
    try {
      const result = await regionConfigAPI.list({
        configType: 'factor_region',
        status: 'active',
        pageSize: 100
      })
      
      const regions = Array.isArray(result.data) 
        ? result.data 
        : result.data?.list || []
      
      const options = regions.map((region: any) => ({
        value: region.code,
        label: `${region.name} (${region.code})`
      }))
      
      setFactorRegionOptions(options)
    } catch (error) {
      console.error('加载因子区域选项失败:', error)
      // 如果加载失败，使用默认选项
      setFactorRegionOptions([
        { value: 'CN', label: '中国 (CN)' },
        { value: 'US', label: '美国 (US)' },
        { value: 'JP', label: '日本 (JP)' },
      ])
    }
  }

  const fetchRestaurants = async () => {
    if (!currentTenant?.id) {
      return
    }

    setLoading(true)
    try {
      const result = await tenantAPI.getRestaurants({
        tenantId: currentTenant.id,
      })

      if (result && result.code === 0 && result.data) {
        const restaurants = Array.isArray(result.data) ? result.data : []
        setDataSource(
          restaurants.map((r: any) => ({
            id: r._id || r.id || '',
            _id: r._id,
            name: r.name || '',
            address: r.address || '',
            phone: r.phone || '',
            email: r.email || '',
            region: r.region || 'national_average',
            factorRegion: r.factorRegion || 'CN',
            status: r.status || 'active',
            certificationLevel: r.certificationLevel,
            certificationStatus: r.certificationStatus || 'none',
            tenantId: r.tenantId || currentTenant.id,
            createdAt: r.createdAt || '',
          }))
        )
      } else {
        setDataSource([])
      }
    } catch (error: any) {
      console.error('获取餐厅列表失败:', error)
      message.error(error.message || '获取餐厅列表失败')
      setDataSource([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record: Restaurant) => {
    setEditingRecord(record)
      form.setFieldsValue({
        name: record.name,
        address: record.address,
        phone: record.phone,
        email: record.email,
        region: record.region || 'national_average',
        factorRegion: record.factorRegion || 'CN',
      })
    setIsModalVisible(true)
  }

  const handleSubmit = async () => {
    try {
      let values = await form.validateFields()

      // 如果地址已填写，尝试自动识别地区（作为备用检查，主要识别在onBlur时完成）
      if (values.address) {
        const parsedRegion = parseAddressToRegion(values.address)
        if (parsedRegion) {
          values.region = parsedRegion
        }
      }

      if (!currentTenant?.id) {
        message.error('当前租户信息不存在')
        return
      }

      if (editingRecord) {
        // 更新餐厅
        const result = await tenantAPI.updateRestaurant(editingRecord.id, {
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          region: values.region,
          factorRegion: values.factorRegion || 'CN',
        })

        if (result && result.success) {
          message.success('更新成功')
          setIsModalVisible(false)
          fetchRestaurants()
        } else {
          message.error(result?.message || '更新失败')
        }
      } else {
        // 创建餐厅
        const result = await tenantAPI.createRestaurant({
          tenantId: currentTenant.id,
          name: values.name,
          address: values.address,
          phone: values.phone,
          email: values.email,
          region: values.region || 'national_average',
          factorRegion: values.factorRegion || 'CN',
        })

        if (result && result.success) {
          message.success('创建成功')
          setIsModalVisible(false)
          fetchRestaurants()
        } else {
          message.error(result?.message || '创建失败')
        }
      }
    } catch (error: any) {
      console.error('提交失败:', error)
      message.error(error.message || '操作失败')
    }
  }

  const handleCancel = () => {
    setIsModalVisible(false)
    setEditingRecord(null)
    form.resetFields()
  }

  const columns: ColumnsType<Restaurant> = [
    {
      title: '餐厅名称',
      dataIndex: 'name',
      key: 'name',
      width: 200,
    },
    {
      title: '地址',
      dataIndex: 'address',
      key: 'address',
      width: 200,
    },
    {
      title: '地区（基准值）',
      dataIndex: 'region',
      key: 'region',
      width: 140,
      render: (region: string) => {
        return <Tag color="blue">{getRegionLabel(region) || region || '未设置'}</Tag>
      },
    },
    {
      title: '因子区域',
      dataIndex: 'factorRegion',
      key: 'factorRegion',
      width: 120,
      render: (factorRegion: string) => {
        const option = factorRegionOptions.find(opt => opt.value === factorRegion)
        return <Tag color="green">{option ? option.label : factorRegion || 'CN'}</Tag>
      },
    },
    {
      title: '联系电话',
      dataIndex: 'phone',
      key: 'phone',
      width: 150,
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
      width: 200,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const config: Record<string, { color: string; text: string }> = {
          active: { color: 'success', text: '正常' },
          inactive: { color: 'default', text: '停用' },
          pending: { color: 'processing', text: '待审核' },
          suspended: { color: 'error', text: '已暂停' },
        }
        const cfg = config[status] || config.inactive
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '认证等级',
      dataIndex: 'certificationLevel',
      key: 'certificationLevel',
      width: 120,
      render: (level?: string) => {
        if (!level) return <Tag>未认证</Tag>
        const config: Record<string, { color: string; text: string }> = {
          bronze: { color: 'orange', text: '铜牌' },
          silver: { color: 'default', text: '银牌' },
          gold: { color: 'gold', text: '金牌' },
          platinum: { color: 'cyan', text: '白金' },
        }
        const cfg = config[level] || { color: 'default', text: level }
        return <Tag color={cfg.color}>{cfg.text}</Tag>
      },
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
            size="small"
          >
            编辑
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <ShopOutlined />
            <span>餐厅管理</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            创建餐厅
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={dataSource}
          rowKey="id"
          loading={loading}
          pagination={{
            total: dataSource.length,
            pageSize: 10,
            showTotal: (total) => `共 ${total} 条记录`,
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? '编辑餐厅' : '创建餐厅'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCancel}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            status: 'active',
            region: 'national_average',
            factorRegion: 'CN',
          }}
        >
          <Form.Item
            name="name"
            label="餐厅名称"
            rules={[{ required: true, message: '请输入餐厅名称' }]}
          >
            <Input placeholder="请输入餐厅名称" />
          </Form.Item>

          <Form.Item
            name="address"
            label="餐厅地址"
            rules={[{ required: true, message: '请输入餐厅地址' }]}
            tooltip="输入地址后，当输入框失去焦点时会自动识别并更新地区。您也可以手动选择地区进行覆盖。"
          >
            <AutoComplete
              placeholder="请输入餐厅地址，如：北京市朝阳区xxx街道xxx号（输入完成后点击其他区域或按Tab键，系统会自动识别地区）"
              allowClear
              onBlur={handleAddressBlur}
              onSelect={(value: string) => {
                // 选择自动完成项时，先更新地址字段，然后识别地区
                form.setFieldsValue({ address: value })
                setTimeout(() => {
                  handleAddressBlur()
                }, 100)
              }}
            />
          </Form.Item>

          <Form.Item
            name="phone"
            label="联系电话"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Form.Item
            name="email"
            label="邮箱"
            rules={[
              { required: true, message: '请输入邮箱' },
              { type: 'email', message: '请输入正确的邮箱地址' },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>

          <Form.Item
            name="region"
            label="地区（基准值）"
            rules={[{ required: true, message: '请选择餐厅所在地区' }]}
            tooltip="地区用于碳足迹计算时的基准值查询。输入地址后系统会自动识别，您也可以手动选择覆盖。"
            initialValue="national_average"
          >
            <Select placeholder="请选择地区（输入地址后将自动识别）">
              {REGION_OPTIONS.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            name="factorRegion"
            label="因子区域"
            rules={[{ required: true, message: '请选择因子区域' }]}
            tooltip="因子区域用于食材碳足迹因子的匹配。中国的餐厅通常选择'中国 (CN)'。"
            initialValue="CN"
          >
            <Select placeholder="请选择因子区域">
              {factorRegionOptions.map(option => (
                <Select.Option key={option.value} value={option.value}>
                  {option.label}
                </Select.Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default RestaurantManage

