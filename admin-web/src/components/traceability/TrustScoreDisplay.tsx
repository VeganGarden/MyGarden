/**
 * 信任度评分展示组件
 */

import React from 'react'
import { Card, Progress, Row, Col, Descriptions } from 'antd'

interface TrustScoreDisplayProps {
  score: number
  factors: {
    completeness: number
    certification: number
    verification: number
    timeliness: number
  }
}

const TrustScoreDisplay: React.FC<TrustScoreDisplayProps> = ({ score, factors }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return '#52c41a' // 绿色
    if (score >= 60) return '#faad14' // 橙色
    return '#ff4d4f' // 红色
  }

  const getScoreLevel = (score: number) => {
    if (score >= 80) return '高'
    if (score >= 60) return '中'
    return '低'
  }

  return (
    <Card title="信任度评分" size="small">
      <Row gutter={16}>
        <Col span={12}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <Progress
              type="dashboard"
              percent={score}
              strokeColor={getScoreColor(score)}
              format={() => `${score}分`}
            />
            <div style={{ marginTop: 8, fontSize: 16, fontWeight: 'bold' }}>
              信任度等级: {getScoreLevel(score)}
            </div>
          </div>
        </Col>
        <Col span={12}>
          <Descriptions column={1} size="small">
            <Descriptions.Item label="完整性">
              <Progress percent={factors.completeness} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="认证度">
              <Progress percent={factors.certification} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="验证度">
              <Progress percent={factors.verification} size="small" />
            </Descriptions.Item>
            <Descriptions.Item label="时效性">
              <Progress percent={factors.timeliness} size="small" />
            </Descriptions.Item>
          </Descriptions>
        </Col>
      </Row>
    </Card>
  )
}

export default TrustScoreDisplay

