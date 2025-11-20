/**
 * 溯源链可视化页
 */

import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Card, Button, Space, Descriptions, Row, Col, message } from 'antd'
import { ArrowLeftOutlined, ShareAltOutlined, QrcodeOutlined } from '@ant-design/icons'
import { traceChainAPI } from '@/services/traceability'
import TraceTimeline from '@/components/traceability/TraceTimeline'
import TraceFlowChart from '@/components/traceability/TraceFlowChart'
import TrustScoreDisplay from '@/components/traceability/TrustScoreDisplay'
import type { TraceNode } from '@/types/traceability'

const TraceChainViewPage: React.FC = () => {
  const { t } = useTranslation()
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
        message.error(result.error || t('pages.traceability.traceChainView.messages.loadFailed'))
        navigate('/traceability/chains')
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGenerateShare = async () => {
    if (!id) return
    try {
      const result = await traceChainAPI.generateShare(id, 'default')
      if (result.success && result.data) {
        message.success(t('pages.traceability.traceChainView.messages.shareLinkGenerated'))
        // 显示二维码或分享链接
      } else {
        message.error(result.error || t('pages.traceability.traceChainView.messages.generateFailed'))
      }
    } catch (error: any) {
      message.error(error.message || t('common.networkError'))
    }
  }

  if (!traceData) {
    return <div>{t('common.loading')}</div>
  }

  const { chain } = traceData

  return (
    <Card
      title={
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/traceability/chains')}>
            {t('common.back')}
          </Button>
          <span>{t('pages.traceability.traceChainView.title')}</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<QrcodeOutlined />} onClick={handleGenerateShare}>
            {t('pages.traceability.traceChainView.buttons.generateQRCode')}
          </Button>
          <Button icon={<ShareAltOutlined />} onClick={handleGenerateShare}>
            {t('pages.traceability.traceChainView.buttons.share')}
          </Button>
        </Space>
      }
      loading={loading}
    >
      <Row gutter={16}>
        <Col span={24}>
          <Descriptions column={2} bordered style={{ marginBottom: 16 }}>
            <Descriptions.Item label={t('pages.traceability.traceChainView.fields.menuItemName')}>{traceData.menuItemName}</Descriptions.Item>
            <Descriptions.Item label={t('pages.traceability.traceChainView.fields.traceId')}>{id}</Descriptions.Item>
            <Descriptions.Item label={t('pages.traceability.traceChainView.fields.nodeCount')}>{chain.nodes.length}</Descriptions.Item>
            <Descriptions.Item label={t('pages.traceability.traceChainView.fields.totalCarbonFootprint')}>
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
          <Card title={t('pages.traceability.traceChainView.cards.flowChart')} size="small" style={{ marginBottom: 16 }}>
            <TraceFlowChart nodes={chain.nodes} />
          </Card>
          <Card title={t('pages.traceability.traceChainView.cards.timeline')} size="small">
            <TraceTimeline nodes={chain.nodes} />
          </Card>
        </Col>
      </Row>

      <Card title={t('pages.traceability.traceChainView.cards.carbonBreakdown')} style={{ marginTop: 16 }} size="small">
        <Descriptions column={2}>
          <Descriptions.Item label={t('pages.traceability.traceChainView.carbonBreakdown.production')}>
            {chain.carbonFootprint.breakdown.production.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.traceChainView.carbonBreakdown.transport')}>
            {chain.carbonFootprint.breakdown.transport.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.traceChainView.carbonBreakdown.processing')}>
            {chain.carbonFootprint.breakdown.processing.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.traceChainView.carbonBreakdown.storage')}>
            {chain.carbonFootprint.breakdown.storage.toFixed(2)} kg CO₂e
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.traceability.traceChainView.carbonBreakdown.other')}>
            {chain.carbonFootprint.breakdown.other.toFixed(2)} kg CO₂e
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </Card>
  )
}

export default TraceChainViewPage

