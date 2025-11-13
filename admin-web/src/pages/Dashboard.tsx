import React from 'react'
import { Card, Row, Col, Statistic } from 'antd'
import { BookOutlined, FireOutlined, TrophyOutlined, TeamOutlined } from '@ant-design/icons'

const Dashboard: React.FC = () => {
  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>数据看板</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="菜谱总数"
              value={0}
              prefix={<BookOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="累计碳减排"
              value={0}
              suffix="kg CO₂e"
              prefix={<FireOutlined />}
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="认证餐厅"
              value={0}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="活跃用户"
              value={0}
              prefix={<TeamOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
      </Row>

      <Card style={{ marginTop: 24 }}>
        <h2>功能开发中</h2>
        <p>数据看板功能正在开发中，将包含：</p>
        <ul>
          <li>实时数据统计</li>
          <li>碳减排趋势图表</li>
          <li>订单数据分析</li>
          <li>用户行为分析</li>
        </ul>
      </Card>
    </div>
  )
}

export default Dashboard

