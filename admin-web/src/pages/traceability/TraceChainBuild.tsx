/**
 * 溯源链构建页
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Form, Input, Select, Button, Space, message, Steps, List, Modal } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { traceChainAPI } from '@/services/traceability'
import type { TraceChainFormData } from '@/types/traceability'
import { NodeType } from '@/types/traceability'
import dayjs from 'dayjs'

const { Step } = Steps

const TraceChainBuildPage: React.FC = () => {
  const navigate = useNavigate()
  const [form] = Form.useForm()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [nodes, setNodes] = useState<any[]>([])

  const handleAddNode = () => {
    const newNode = {
      nodeType: NodeType.SUPPLIER,
      nodeOrder: nodes.length + 1,
      nodeName: '',
      timestamp: new Date(),
      entityId: '',
      location: {},
      operation: {},
      carbonFootprint: 0
    }
    setNodes([...nodes, newNode])
  }

  const handleRemoveNode = (index: number) => {
    const newNodes = nodes.filter((_, i) => i !== index)
    setNodes(newNodes.map((node, i) => ({ ...node, nodeOrder: i + 1 })))
  }

  const handleSubmit = async () => {
    if (nodes.length === 0) {
      message.error('请至少添加一个节点')
      return
    }

    setLoading(true)
    try {
      const values = form.getFieldsValue()
      const formData: TraceChainFormData & { tenantId: string } = {
        tenantId: 'default',
        menuItemId: values.menuItemId,
        lotId: values.lotId,
        restaurantId: values.restaurantId,
        chainType: values.chainType || 'full',
        nodes: nodes.map(node => ({
          ...node,
          timestamp: node.timestamp instanceof Date ? node.timestamp.toISOString() : node.timestamp
        }))
      }

      const result = await traceChainAPI.build(formData)
      if (result.success) {
        message.success('构建成功')
        navigate(`/traceability/chains/${result.data?.traceId}`)
      } else {
        message.error(result.error || '构建失败')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const nodeTypeMap: Record<NodeType, string> = {
    [NodeType.SUPPLIER]: '供应商',
    [NodeType.PROCESSOR]: '加工',
    [NodeType.TRANSPORT]: '运输',
    [NodeType.RESTAURANT]: '餐厅',
    [NodeType.OTHER]: '其他'
  }

  const steps = [
    {
      title: '选择菜品和批次',
      content: (
        <Form form={form} layout="vertical">
          <Form.Item
            name="menuItemId"
            label="菜品ID"
            rules={[{ required: true, message: '请输入菜品ID' }]}
          >
            <Input placeholder="请输入菜品ID" />
          </Form.Item>
          <Form.Item
            name="lotId"
            label="食材批次ID"
            rules={[{ required: true, message: '请输入批次ID' }]}
          >
            <Input placeholder="请输入批次ID" />
          </Form.Item>
          <Form.Item name="restaurantId" label="餐厅ID">
            <Input placeholder="请输入餐厅ID（可选）" />
          </Form.Item>
          <Form.Item name="chainType" label="溯源链类型">
            <Select defaultValue="full">
              <Select.Option value="full">完整</Select.Option>
              <Select.Option value="partial">部分</Select.Option>
              <Select.Option value="simplified">简化</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      )
    },
    {
      title: '添加溯源节点',
      content: (
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNode} style={{ marginBottom: 16 }}>
            添加节点
          </Button>
          <List
            dataSource={nodes}
            renderItem={(node, index) => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => handleRemoveNode(index)} icon={<DeleteOutlined />}>
                    删除
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>节点 {node.nodeOrder}</span>
                      <Select
                        value={node.nodeType}
                        onChange={(value) => {
                          const newNodes = [...nodes]
                          newNodes[index].nodeType = value
                          setNodes(newNodes)
                        }}
                        style={{ width: 120 }}
                      >
                        {Object.entries(nodeTypeMap).map(([key, value]) => (
                          <Select.Option key={key} value={key}>{value}</Select.Option>
                        ))}
                      </Select>
                    </Space>
                  }
                  description={
                    <Input
                      placeholder="节点名称"
                      value={node.nodeName}
                      onChange={(e) => {
                        const newNodes = [...nodes]
                        newNodes[index].nodeName = e.target.value
                        setNodes(newNodes)
                      }}
                    />
                  }
                />
              </List.Item>
            )}
          />
        </div>
      )
    },
    {
      title: '验证和提交',
      content: (
        <div>
          <p>节点数量: {nodes.length}</p>
          <p>请确认信息无误后提交</p>
        </div>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/chains')}>
            返回
          </Button>
          <span>构建溯源链</span>
        </Space>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} />
        ))}
      </Steps>

      <div style={{ minHeight: 300, marginBottom: 24 }}>
        {steps[currentStep].content}
      </div>

      <Space>
        {currentStep > 0 && (
          <Button onClick={() => setCurrentStep(currentStep - 1)}>
            上一步
          </Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
            下一步
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            提交
          </Button>
        )}
      </Space>
    </Card>
  )
}

export default TraceChainBuildPage

