import { ArrowLeftOutlined } from '@ant-design/icons'
import { Button, Card, Col, Descriptions, Row, Table, Tag, Typography } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

const { Title, Paragraph, Text } = Typography

const CertificationStandard: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  // 五大维度标准数据
  const standards = [
    {
      dimension: '低碳菜品占比',
      requirement: '低碳及以下菜品占比 ≥40%，且核心菜品须提供碳足迹标签',
      verification: '平台碳核算系统 + 菜单抽查',
      weight: '40%',
      key: 'lowCarbonMenu',
    },
    {
      dimension: '食材与供应链',
      requirement: '本地（≤100km）或可追溯低碳食材占比 ≥30%，关键食材需提供来源证明',
      verification: '溯源模块 + 供应商资料',
      weight: '20%',
      key: 'supplyChain',
    },
    {
      dimension: '能源与运营',
      requirement: '建立能源使用台账，年度能源强度下降 ≥10% 或提供绿色能源使用证明',
      verification: '能源账单/设备数据',
      weight: '10%',
      key: 'energy',
    },
    {
      dimension: '食物浪费管理',
      requirement: '建立浪费监测流程，月度浪费减量目标 ≥15%，并提供数据记录',
      verification: '浪费监测报表 + 现场核查',
      weight: '15%',
      key: 'waste',
    },
    {
      dimension: '社会传播与教育',
      requirement: '提供不少于 3 项低碳倡导举措（如顾客教育、员工培训、公益活动），并形成记录',
      verification: '活动记录 + 顾客反馈',
      weight: '15%',
      key: 'education',
    },
  ]

  const columns = [
    {
      title: '维度',
      dataIndex: 'dimension',
      key: 'dimension',
      width: 150,
    },
    {
      title: '达标要求',
      dataIndex: 'requirement',
      key: 'requirement',
    },
    {
      title: '核查方式',
      dataIndex: 'verification',
      key: 'verification',
      width: 200,
    },
    {
      title: '评分权重',
      dataIndex: 'weight',
      key: 'weight',
      width: 100,
      align: 'center' as const,
      render: (weight: string) => <Tag color="blue">{weight}</Tag>,
    },
  ]

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(-1)}
        style={{ marginBottom: '16px' }}
      >
        返回
      </Button>

      <Title level={2}>气候餐厅认证标准</Title>
      <Paragraph>
        气候餐厅认证基于五大维度进行评估，餐厅必须同时满足所有达标要求才能通过认证。
      </Paragraph>

      {/* 达标标准说明 */}
      <Card title="达标标准" style={{ marginBottom: '24px' }}>
        <Descriptions column={1} bordered>
          <Descriptions.Item label="标准1">
            <Text strong>所有达标项必须全部满足</Text>
            <br />
            <Text type="secondary">五大维度中的每一项都必须达到最低要求</Text>
          </Descriptions.Item>
          <Descriptions.Item label="标准2">
            <Text strong>系统自动评估得分 ≥ 80 分</Text>
            <br />
            <Text type="secondary">基于五大维度的加权评分，总分必须达到 80 分（满分 100 分）</Text>
          </Descriptions.Item>
          <Descriptions.Item label="标准3">
            <Text strong>人工抽检无重大风险项</Text>
            <br />
            <Text type="secondary">平台运营进行的人工抽检中，不能发现重大风险项</Text>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* 五大维度标准表格 */}
      <Card title="五大维度评估标准" style={{ marginBottom: '24px' }}>
        <Table
          columns={columns}
          dataSource={standards}
          pagination={false}
          rowKey="key"
          bordered
        />
      </Card>

      {/* 评分机制说明 */}
      <Card title="评分机制" style={{ marginBottom: '24px' }}>
        <Paragraph>
          <Text strong>总分计算公式：</Text>
        </Paragraph>
        <div style={{ background: '#f5f5f5', padding: '16px', borderRadius: '4px', marginBottom: '16px' }}>
          <Text code>
            总分 = 低碳菜品占比得分 × 40% + 本地食材占比得分 × 20% + 有机食材占比得分 × 15% +
            食物浪费减少得分 × 15% + 能源效率得分 × 10%
          </Text>
        </div>

        <Title level={4}>各维度评分规则</Title>
        <Row gutter={[16, 16]}>
          <Col span={12}>
            <Card size="small">
              <Text strong>低碳菜品占比</Text>
              <br />
              <Text type="secondary">
                根据菜单中低碳菜品（碳足迹低于设定阈值）的比例计算得分
              </Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Text strong>本地食材占比</Text>
              <br />
              <Text type="secondary">
                根据本地食材（距离 ≤100km）或可追溯低碳食材的比例计算得分
              </Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Text strong>有机食材占比</Text>
              <br />
              <Text type="secondary">根据有机认证食材的比例计算得分</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Text strong>食物浪费减少</Text>
              <br />
              <Text type="secondary">根据月度浪费减量目标完成情况计算得分</Text>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small">
              <Text strong>能源效率</Text>
              <br />
              <Text type="secondary">
                根据能源强度下降比例或绿色能源使用情况计算得分
              </Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 成长激励说明 */}
      <Card title="成长激励（可选）">
        <Paragraph>
          认证通过后，餐厅可以参与成长激励项目，完成成长激励任务可以获得数字勋章展示、专题报道资源、平台排名与曝光优先等奖励。
        </Paragraph>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Card size="small" title="进阶低碳行动">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>引入零碳能源</li>
                <li>供应链碳数据共享</li>
                <li>碳中和项目</li>
              </ul>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="创新联动项目">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>与政府合作的气候行动案例</li>
                <li>与公益组织合作的项目</li>
                <li>与品牌合作的创新案例</li>
              </ul>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="数据透明度">
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>实现高频数据上报</li>
                <li>通过第三方审计</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 操作按钮 */}
      <div style={{ marginTop: '24px', textAlign: 'center' }}>
        <Button type="primary" size="large" onClick={() => navigate('/certification/apply')}>
          开始申请认证
        </Button>
      </div>
    </div>
  )
}

export default CertificationStandard

