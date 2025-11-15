import { Column, Line } from '@ant-design/charts'
import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Tabs, message } from 'antd'
import React, { useState } from 'react'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

const CarbonReport: React.FC = () => {
  const [reportType, setReportType] = useState<'monthly' | 'yearly' | 'esg'>('monthly')

  const monthlyData = [
    { month: '1月', carbon: 1200, reduction: 800 },
    { month: '2月', carbon: 1350, reduction: 950 },
    { month: '3月', carbon: 1100, reduction: 750 },
  ]

  const yearlyData = [
    { year: '2023', carbon: 12000, reduction: 8000 },
    { year: '2024', carbon: 15000, reduction: 10000 },
    { year: '2025', carbon: 18000, reduction: 12000 },
  ]

  const handleGenerate = () => {
    message.success('报告生成功能开发中')
    // TODO: 调用报告生成API
  }

  const handleDownload = (format: 'pdf' | 'excel' | 'word') => {
    message.success(`${format.toUpperCase()}格式报告下载功能开发中`)
    // TODO: 实现报告下载
  }

  const handleShare = () => {
    message.success('报告分享功能开发中')
    // TODO: 生成分享链接
  }

  return (
    <div>
      <Card
        title="碳报告管理"
        extra={
          <Space>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: 150 }}
            >
              <Select.Option value="monthly">月度报告</Select.Option>
              <Select.Option value="yearly">年度报告</Select.Option>
              <Select.Option value="esg">ESG报告</Select.Option>
            </Select>
            <RangePicker />
            <Button type="primary" onClick={handleGenerate}>
              生成报告
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="preview">
          <TabPane tab="报告预览" key="preview">
            <Card
              title={`${reportType === 'monthly' ? '月度' : reportType === 'yearly' ? '年度' : 'ESG'}碳报告`}
              extra={
                <Space>
                  <Button icon={<EyeOutlined />}>预览</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')}>
                    下载PDF
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('excel')}>
                    下载Excel
                  </Button>
                  <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                    分享
                  </Button>
                </Space>
              }
            >
              {reportType === 'monthly' && (
                <div>
                  <h3>月度碳减排数据</h3>
                  <Column
                    data={monthlyData}
                    xField="month"
                    yField="reduction"
                    height={300}
                    label={{
                      position: 'middle',
                      style: {
                        fill: '#FFFFFF',
                        opacity: 0.6,
                      },
                    }}
                  />
                </div>
              )}

              {reportType === 'yearly' && (
                <div>
                  <h3>年度碳减排趋势</h3>
                  <Line
                    data={yearlyData}
                    xField="year"
                    yField="reduction"
                    height={300}
                    point={{
                      size: 5,
                      shape: 'diamond',
                    }}
                  />
                </div>
              )}

              {reportType === 'esg' && (
                <div>
                  <h3>ESG报告内容</h3>
                  <div style={{ padding: 24 }}>
                    <h4>环境数据 (Environmental)</h4>
                    <ul>
                      <li>累计碳减排: 30,000 kg CO₂e</li>
                      <li>能源消耗: 优化后减少15%</li>
                      <li>废物处理: 实现零废弃目标</li>
                    </ul>

                    <h4 style={{ marginTop: 24 }}>社会数据 (Social)</h4>
                    <ul>
                      <li>就业人数: 50人</li>
                      <li>社区贡献: 参与10次公益活动</li>
                      <li>用户满意度: 4.5/5.0</li>
                    </ul>

                    <h4 style={{ marginTop: 24 }}>治理数据 (Governance)</h4>
                    <ul>
                      <li>合规性: 100%符合认证标准</li>
                      <li>透明度: 数据公开透明</li>
                      <li>责任管理: 建立完善的管理体系</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </TabPane>

          <TabPane tab="历史报告" key="history">
            <div>
              <p>历史报告列表功能开发中</p>
            </div>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default CarbonReport

