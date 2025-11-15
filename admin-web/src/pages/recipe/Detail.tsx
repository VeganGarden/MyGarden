import React, { useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Table,
  message,
  Divider,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  EditOutlined,
  CopyOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRecipe, deleteRecipe } from '@/store/slices/recipeSlice'
import { Recipe, RecipeStatus, ChannelType } from '@/types'
import { Popconfirm } from 'antd'

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentRecipe, loading } = useAppSelector((state) => state.recipe)

  useEffect(() => {
    if (id) {
      loadRecipe()
    }
  }, [id])

  const loadRecipe = async () => {
    try {
      await dispatch(fetchRecipe(id!)).unwrap()
    } catch (error: any) {
      message.error(error.message || '加载菜谱失败')
      navigate('/recipe')
    }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteRecipe(id!)).unwrap()
      message.success('删除成功')
      navigate('/recipe')
    } catch (error: any) {
      message.error(error.message || '删除失败')
    }
  }

  const handleCopy = () => {
    if (currentRecipe) {
      navigate('/recipe/create', {
        state: {
          copyFrom: currentRecipe,
        },
      })
    }
  }

  const getCarbonLabelColor = (label?: string) => {
    switch (label) {
      case 'ultra_low':
      case 'low':
        return 'green'
      case 'medium':
        return 'orange'
      case 'high':
        return 'red'
      default:
        return 'default'
    }
  }

  const getCarbonLabelText = (label?: string) => {
    switch (label) {
      case 'ultra_low':
        return '超低碳'
      case 'low':
        return '低碳'
      case 'medium':
        return '中碳'
      case 'high':
        return '高碳'
      default:
        return '未计算'
    }
  }

  const getStatusTag = (status: RecipeStatus) => {
    const statusMap = {
      [RecipeStatus.DRAFT]: { color: 'default', text: '草稿' },
      [RecipeStatus.PUBLISHED]: { color: 'success', text: '已发布' },
      [RecipeStatus.ARCHIVED]: { color: 'default', text: '已归档' },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: '未知' }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const getChannelText = (channel: ChannelType) => {
    const channelMap = {
      [ChannelType.DINE_IN]: '堂食',
      [ChannelType.TAKE_OUT]: '外卖',
      [ChannelType.PROMOTION]: '宣传物料',
    }
    return channelMap[channel] || channel
  }

  const getCategoryText = (category: string) => {
    const categoryMap: Record<string, string> = {
      hot: '热菜',
      cold: '凉菜',
      soup: '汤品',
      staple: '主食',
      dessert: '甜品',
      drink: '饮品',
    }
    return categoryMap[category] || category
  }

  const getCookingMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      steamed: '蒸',
      boiled: '煮',
      stir_fried: '炒',
      fried: '炸',
      baked: '烤',
      stewed: '炖',
      cold_dish: '凉拌',
      raw: '生食',
    }
    return methodMap[method] || method
  }

  if (loading || !currentRecipe) {
    return <div>加载中...</div>
  }

  const ingredientColumns = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => `${quantity} ${record.unit || 'g'}`,
    },
    {
      title: '碳系数',
      dataIndex: 'carbonCoefficient',
      key: 'carbonCoefficient',
      render: (coeff: number) =>
        coeff !== undefined ? `${coeff.toFixed(2)} kg CO₂e/kg` : '-',
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/recipe')}
              type="text"
            >
              返回
            </Button>
            <span>{currentRecipe.name}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/recipe/edit/${id}`)}
            >
              编辑
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              复制
            </Button>
            <Popconfirm
              title="确定要删除这个菜谱吗？"
              onConfirm={handleDelete}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="菜谱名称">{currentRecipe.name}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(currentRecipe.status)}</Descriptions.Item>
          <Descriptions.Item label="分类">
            {getCategoryText(currentRecipe.category)}
          </Descriptions.Item>
          <Descriptions.Item label="烹饪方式">
            {getCookingMethodText(currentRecipe.cookingMethod)}
          </Descriptions.Item>
          <Descriptions.Item label="版本">v{currentRecipe.version}</Descriptions.Item>
          <Descriptions.Item label="渠道">
            {currentRecipe.channels.length > 0 ? (
              <Space>
                {currentRecipe.channels.map((ch) => (
                  <Tag key={ch}>{getChannelText(ch)}</Tag>
                ))}
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          {currentRecipe.description && (
            <Descriptions.Item label="描述" span={2}>
              {currentRecipe.description}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">碳足迹信息</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="碳足迹"
              value={currentRecipe.carbonFootprint || 0}
              precision={2}
              suffix="kg CO₂e"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="碳标签"
              value={currentRecipe.carbonLabel ? getCarbonLabelText(currentRecipe.carbonLabel) : '未计算'}
              valueRender={(value) => currentRecipe.carbonLabel ? (
                <Tag color={getCarbonLabelColor(currentRecipe.carbonLabel)}>
                  {value}
                </Tag>
              ) : value}
            />
          </Col>
          {currentRecipe.carbonScore !== undefined && (
            <Col span={8}>
              <Statistic title="碳评分" value={currentRecipe.carbonScore} suffix="分" />
            </Col>
          )}
        </Row>

        <Divider orientation="left">食材清单</Divider>
        <Table
          columns={ingredientColumns}
          dataSource={currentRecipe.ingredients}
          rowKey={(record, index) => `${record.ingredientId}-${index}`}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default RecipeDetail

