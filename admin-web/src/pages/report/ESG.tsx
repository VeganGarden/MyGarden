import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Tabs, message } from 'antd'
import React, { useState } from 'react'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

const ReportESG: React.FC = () => {
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('yearly')

  const handleGenerate = () => {
    message.success('ESG报告生成功能开发中')
  }

  const handleDownload = (format: 'pdf' | 'excel' | 'word') => {
    message.success(`${format.toUpperCase()}格式报告下载功能开发中`)
  }

  const handleShare = () => {
    message.success('报告分享功能开发中')
  }

  return (
    <div>
      <Card
        title="ESG报告管理"
        extra={
          <Space>
            <Select
              value={reportPeriod}
              onChange={setReportPeriod}
              style={{ width: 150 }}
            >
              <Select.Option value="monthly">月度报告</Select.Option>
              <Select.Option value="yearly">年度报告</Select.Option>
            </Select>
            <RangePicker />
            <Button type="primary" onClick={handleGenerate}>
              生成报告
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="environmental">
          <TabPane tab="环境数据 (Environmental)" key="environmental">
            <Card>
              <h3>环境数据</h3>
              <ul>
                <li>累计碳减排: 30,000 kg CO₂e</li>
                <li>能源消耗: 优化后减少15%</li>
                <li>废物处理: 实现零废弃目标</li>
                <li>水资源使用: 减少20%</li>
                <li>包装材料: 100%可回收</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab="社会数据 (Social)" key="social">
            <Card>
              <h3>社会数据</h3>
              <ul>
                <li>就业人数: 50人</li>
                <li>社区贡献: 参与10次公益活动</li>
                <li>用户满意度: 4.5/5.0</li>
                <li>员工培训: 每月2次低碳培训</li>
                <li>顾客教育: 低碳消费倡导活动</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab="治理数据 (Governance)" key="governance">
            <Card>
              <h3>治理数据</h3>
              <ul>
                <li>合规性: 100%符合认证标准</li>
                <li>透明度: 数据公开透明</li>
                <li>责任管理: 建立完善的管理体系</li>
                <li>审计记录: 完整的审计日志</li>
                <li>风险管控: 建立风险预警机制</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab="报告操作" key="actions">
            <Card
              title="报告操作"
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
              <p>ESG报告包含环境、社会、治理三个维度的完整数据，可用于：</p>
              <ul>
                <li>企业可持续发展报告</li>
                <li>政府监管报送</li>
                <li>合作伙伴展示</li>
                <li>投资方披露</li>
              </ul>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default ReportESG

