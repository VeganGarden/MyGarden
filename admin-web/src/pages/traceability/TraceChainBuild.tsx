/**
 * 溯源链构建页
 */

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Form, Input, Select, Button, Space, message, Steps, List, Modal } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, DeleteOutlined } from '@ant-design/icons'
import { traceChainAPI } from '@/services/traceability'
import type { TraceChainFormData } from '@/types/traceability'
import { NodeType } from '@/types/traceability'
import dayjs from 'dayjs'

const { Step } = Steps

const TraceChainBuildPage: React.FC = () => {
  const { t } = useTranslation()
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
      message.error(t('pages.traceability.traceChainBuild.messages.addNodeRequired'))
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
        message.success(t('pages.traceability.traceChainBuild.messages.buildSuccess'))
        navigate(`/traceability/chains/${result.data?.traceId}`)
      } else {
        message.error(result.error || t('pages.traceability.traceChainBuild.messages.buildFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const nodeTypeMap: Record<NodeType, string> = {
    [NodeType.SUPPLIER]: t('pages.traceability.traceChainBuild.nodeTypes.supplier'),
    [NodeType.PROCESSOR]: t('pages.traceability.traceChainBuild.nodeTypes.processor'),
    [NodeType.TRANSPORT]: t('pages.traceability.traceChainBuild.nodeTypes.transport'),
    [NodeType.RESTAURANT]: t('pages.traceability.traceChainBuild.nodeTypes.restaurant'),
    [NodeType.OTHER]: t('pages.traceability.traceChainBuild.nodeTypes.other')
  }

  const steps = [
    {
      title: t('pages.traceability.traceChainBuild.steps.selectMenuItem'),
      content: (
        <Form form={form} layout="vertical">
          <Form.Item
            name="menuItemId"
            label={t('pages.traceability.traceChainBuild.fields.menuItemId')}
            rules={[{ required: true, message: t('pages.traceability.traceChainBuild.messages.menuItemIdRequired') }]}
          >
            <Input placeholder={t('pages.traceability.traceChainBuild.placeholders.menuItemId')} />
          </Form.Item>
          <Form.Item
            name="lotId"
            label={t('pages.traceability.traceChainBuild.fields.lotId')}
            rules={[{ required: true, message: t('pages.traceability.traceChainBuild.messages.lotIdRequired') }]}
          >
            <Input placeholder={t('pages.traceability.traceChainBuild.placeholders.lotId')} />
          </Form.Item>
          <Form.Item name="restaurantId" label={t('pages.traceability.traceChainBuild.fields.restaurantId')}>
            <Input placeholder={t('pages.traceability.traceChainBuild.placeholders.restaurantId')} />
          </Form.Item>
          <Form.Item name="chainType" label={t('pages.traceability.traceChainBuild.fields.chainType')}>
            <Select defaultValue="full">
              <Select.Option value="full">{t('pages.traceability.traceChainBuild.chainTypes.full')}</Select.Option>
              <Select.Option value="partial">{t('pages.traceability.traceChainBuild.chainTypes.partial')}</Select.Option>
              <Select.Option value="simplified">{t('pages.traceability.traceChainBuild.chainTypes.simplified')}</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      )
    },
    {
      title: t('pages.traceability.traceChainBuild.steps.addNodes'),
      content: (
        <div>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAddNode} style={{ marginBottom: 16 }}>
            {t('pages.traceability.traceChainBuild.buttons.addNode')}
          </Button>
          <List
            dataSource={nodes}
            renderItem={(node, index) => (
              <List.Item
                actions={[
                  <Button type="link" onClick={() => handleRemoveNode(index)} icon={<DeleteOutlined />}>
                    {t('common.delete')}
                  </Button>
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>{t('pages.traceability.traceChainBuild.nodeLabel', { order: node.nodeOrder })}</span>
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
                      placeholder={t('pages.traceability.traceChainBuild.placeholders.nodeName')}
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
      title: t('pages.traceability.traceChainBuild.steps.verifyAndSubmit'),
      content: (
        <div>
          <p>{t('pages.traceability.traceChainBuild.verify.nodeCount', { count: nodes.length })}</p>
          <p>{t('pages.traceability.traceChainBuild.verify.confirmMessage')}</p>
        </div>
      )
    }
  ]

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/chains')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.traceChainBuild.title')}</span>
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
            {t('common.previous')}
          </Button>
        )}
        {currentStep < steps.length - 1 && (
          <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
            {t('common.next')}
          </Button>
        )}
        {currentStep === steps.length - 1 && (
          <Button type="primary" onClick={handleSubmit} loading={loading}>
            {t('common.submit')}
          </Button>
        )}
      </Space>
    </Card>
  )
}

export default TraceChainBuildPage

