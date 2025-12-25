/**
 * 类别关键词管理组件
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Input,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  message,
  Modal,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'

interface KeywordManagementProps {
  categoryCode: string
}

const CategoryKeywordManagement: React.FC<KeywordManagementProps> = ({ categoryCode }) => {
  const [loading, setLoading] = useState(false)
  const [keywords, setKeywords] = useState<string[]>([])
  const [addModalVisible, setAddModalVisible] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [batchKeywords, setBatchKeywords] = useState('')

  useEffect(() => {
    loadKeywords()
  }, [categoryCode])

  const loadKeywords = async () => {
    setLoading(true)
    try {
      const result = await ingredientStandardAPI.category.get(categoryCode)
      if (result && result.code === 0 && result.data) {
        const categoryData = result.data
        setKeywords(categoryData.mapping?.keywords || [])
      }
    } catch (error: any) {
      console.error('获取关键词列表失败:', error)
      message.error(error.message || '获取关键词列表失败')
    } finally {
      setLoading(false)
    }
  }

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) {
      message.warning('请输入关键词')
      return
    }

    if (keywords.includes(newKeyword.trim())) {
      message.warning('关键词已存在')
      return
    }

    try {
      // 先获取当前的mapping信息
      const categoryResult = await ingredientStandardAPI.category.get(categoryCode)
      if (!categoryResult || categoryResult.code !== 0 || !categoryResult.data) {
        message.error('获取类别信息失败')
        return
      }
      const currentMapping = categoryResult.data.mapping || { factorSubCategory: categoryCode, keywords: [] }

      const updatedKeywords = [...keywords, newKeyword.trim()]
      const result = await ingredientStandardAPI.category.update(categoryCode, {
        mapping: {
          factorSubCategory: currentMapping.factorSubCategory, // 保持原有的factorSubCategory
          keywords: updatedKeywords,
        },
      })

      if (result && result.code === 0) {
        message.success('添加关键词成功')
        setNewKeyword('')
        setAddModalVisible(false)
        loadKeywords()
      } else {
        message.error(result?.message || '添加关键词失败')
      }
    } catch (error: any) {
      console.error('添加关键词失败:', error)
      message.error(error.message || '添加关键词失败')
    }
  }

  const handleBatchAddKeywords = async () => {
    if (!batchKeywords.trim()) {
      message.warning('请输入关键词')
      return
    }

    const newKeywords = batchKeywords
      .split(/[,\n，]/)
      .map(k => k.trim())
      .filter(k => k && !keywords.includes(k))

    if (newKeywords.length === 0) {
      message.warning('没有可添加的新关键词')
      return
    }

    try {
      // 先获取当前的mapping信息
      const categoryResult = await ingredientStandardAPI.category.get(categoryCode)
      if (!categoryResult || categoryResult.code !== 0 || !categoryResult.data) {
        message.error('获取类别信息失败')
        return
      }
      const currentMapping = categoryResult.data.mapping || { factorSubCategory: categoryCode, keywords: [] }

      const updatedKeywords = [...keywords, ...newKeywords]
      const result = await ingredientStandardAPI.category.update(categoryCode, {
        mapping: {
          factorSubCategory: currentMapping.factorSubCategory, // 保持原有的factorSubCategory
          keywords: updatedKeywords,
        },
      })

      if (result && result.code === 0) {
        message.success(`成功添加 ${newKeywords.length} 个关键词`)
        setBatchKeywords('')
        setAddModalVisible(false)
        loadKeywords()
      } else {
        message.error(result?.message || '批量添加关键词失败')
      }
    } catch (error: any) {
      console.error('批量添加关键词失败:', error)
      message.error(error.message || '批量添加关键词失败')
    }
  }

  const handleDeleteKeyword = async (keyword: string) => {
    try {
      // 先获取当前的mapping信息
      const categoryResult = await ingredientStandardAPI.category.get(categoryCode)
      if (!categoryResult || categoryResult.code !== 0 || !categoryResult.data) {
        message.error('获取类别信息失败')
        return
      }
      const currentMapping = categoryResult.data.mapping || { factorSubCategory: categoryCode, keywords: [] }

      const updatedKeywords = keywords.filter(k => k !== keyword)
      const result = await ingredientStandardAPI.category.update(categoryCode, {
        mapping: {
          factorSubCategory: currentMapping.factorSubCategory, // 保持原有的factorSubCategory
          keywords: updatedKeywords,
        },
      })

      if (result && result.code === 0) {
        message.success('删除关键词成功')
        loadKeywords()
      } else {
        message.error(result?.message || '删除关键词失败')
      }
    } catch (error: any) {
      console.error('删除关键词失败:', error)
      message.error(error.message || '删除关键词失败')
    }
  }

  const columns: ColumnsType<string> = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      key: 'keyword',
      render: (_, keyword) => <Tag>{keyword}</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_, keyword) => (
        <Popconfirm
          title="确定要删除这个关键词吗？"
          onConfirm={() => handleDeleteKeyword(keyword)}
          okText="确定"
          cancelText="取消"
        >
          <Button type="link" danger size="small" icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Card>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>关键词列表（共 {keywords.length} 个）</span>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setAddModalVisible(true)}
        >
          添加关键词
        </Button>
      </div>

      <Spin spinning={loading}>
        <Table
          columns={columns}
          dataSource={keywords}
          rowKey={(keyword) => keyword}
          pagination={false}
          locale={{
            emptyText: '暂无关键词',
          }}
        />
      </Spin>

      <Modal
        title="添加关键词"
        open={addModalVisible}
        onCancel={() => {
          setAddModalVisible(false)
          setNewKeyword('')
          setBatchKeywords('')
        }}
        footer={null}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div>
            <Input
              placeholder="输入单个关键词"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onPressEnter={handleAddKeyword}
            />
            <Button
              type="primary"
              onClick={handleAddKeyword}
              style={{ marginTop: '8px', width: '100%' }}
            >
              添加单个关键词
            </Button>
          </div>
          <div>
            <Input.TextArea
              placeholder="批量添加：每行一个关键词，或用逗号分隔"
              value={batchKeywords}
              onChange={(e) => setBatchKeywords(e.target.value)}
              rows={6}
            />
            <Button
              type="primary"
              onClick={handleBatchAddKeywords}
              style={{ marginTop: '8px', width: '100%' }}
            >
              批量添加关键词
            </Button>
          </div>
        </Space>
      </Modal>
    </Card>
  )
}

export default CategoryKeywordManagement

