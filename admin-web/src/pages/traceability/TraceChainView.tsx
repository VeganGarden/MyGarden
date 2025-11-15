/**
 * 溯源链可视化页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Button, Space, Descriptions, Row, Col, message } from 'antd'
import { ArrowLeftOutlined, ShareAltOutlined, QrcodeOutlined } from '@ant-design/icons'
import { traceChainAPI } from '@/services/traceability'
import TraceTimeline from '@/components/traceability/TraceTimeline'
import TraceFlowChart from '@/components/traceability/TraceFlowChart'
import TrustScoreDisplay from '@/components/traceability/TrustScoreDisplay'
import type { TraceNode } from '@/types/traceability'

const TraceChainViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [traceData, setTraceData] = useState<any>(null)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await traceChainAPI.get(id, 'default')
      if (result.success && result.data) {
        setTraceData(result.data)
      } else {
        message.error(result.error || '加载失败')
        navigate('/traceability/chains')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateShare = async () => {
    if (!id) return
    try {
      const result = await traceChainAPI.generateShare(id, 'default')
      if (result.success && result.data) {
        message.success('分享链接已生成')
        // 显示二维码或分享链接
      } else {
        message.error(result.error || '生成失败')
      }
    } catch (error: any) {
      message.error(error.message || '网络错误')
    }
  }

  if (!traceData) {
    return <div>加载中...</div>
  }

  const { chain } = traceData

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/chains')}>
            返回
          </Button>
          <span>溯源链详情</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<QrcodeOutlined />} onClick={handleGenerateShare}>
            生成二维码
          </Button>
          <Button icon={<ShareAltOutlined />} onClick={handleGenerateShare}>
            分享
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Row gutter={16}>
        <Col span={24}>
          <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label="菜品名称">{traceData.menuItemName}</Descriptions.Item>
            <Descriptions.Item label="溯源链ID">{id}</Descriptions.Item>
            <Descriptions.Item label="节点数量">{chain.nodes.length}</Descriptions.Item>
            <Descriptions.Item label="总碳足迹">
              {chain.carbonFootprint.total.toFixed(2)} kg CO₂e
            </Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <TrustScoreDisplay
            score={chain.trustScore}
            factors={chain.trustScoreFactors}
          />
        </Col>
        <Col span={16}>
          <Card title="溯源流程图" size="small" style={{ marginBottom: 16 }}>
            <TraceFlowChart nodes={chain.nodes} />
          </Card>
          <Card title="溯源时间轴" size="small">
            <TraceTimeline nodes={chain.nodes} />
          </Card>
        </Col>
      </Row>

      <Card title="碳足迹分解" style={{ marginTop: 16 }} size="small">
        <Descriptions column={2}>
          <Descriptions.Item label="生产阶段">
            {chain.carbonFootprint.breakdown.production.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label="运输阶段">
            {chain.carbonFootprint.breakdown.transport.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label="加工阶段">
            {chain.carbonFootprint.breakdown.processing.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label="存储阶段">
            {chain.carbonFootprint.breakdown.storage.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label="其他">
            {chain.carbonFootprint.breakdown.other.toFixed(2)} kg CO₂e
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Card>
  )
}

export default TraceChainViewPage

