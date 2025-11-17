import { DownloadOutlined, EyeOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, DatePicker, Select, Space, Tabs, message } from 'antd'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'

const { TabPane } = Tabs
const { RangePicker } = DatePicker

const ReportESG: React.FC = () => {
  const { t } = useTranslation()
  const [reportPeriod, setReportPeriod] = useState<'monthly' | 'yearly'>('yearly')

  const handleGenerate = () => {
    message.success(t('pages.report.esg.messages.generateInProgress'))
  }

  const handleDownload = (format: 'pdf' | 'excel' | 'word') => {
    message.success(t('pages.report.esg.messages.downloadInProgress', { format: format.toUpperCase() }))
  }

  const handleShare = () => {
    message.success(t('pages.report.esg.messages.shareInProgress'))
  }

  return (
    <div>
      <Card
        title={t('pages.report.esg.title')}
        extra={
          <Space>
            <Select
              value={reportPeriod}
              onChange={setReportPeriod}
              style={{ width: 150 }}
            >
              <Select.Option value="monthly">{t('pages.report.esg.types.monthly')}</Select.Option>
              <Select.Option value="yearly">{t('pages.report.esg.types.yearly')}</Select.Option>
            </Select>
            <RangePicker />
            <Button type="primary" onClick={handleGenerate}>
              {t('pages.report.esg.buttons.generate')}
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="environmental">
          <TabPane tab={t('pages.report.esg.tabs.environmental')} key="environmental">
            <Card>
              <h3>{t('pages.report.esg.environmental.title')}</h3>
              <ul>
                <li>{t('pages.report.esg.environmental.totalCarbonReduction')}: 30,000 kg CO₂e</li>
                <li>{t('pages.report.esg.environmental.energyConsumption')}: {t('pages.report.esg.environmental.optimizedReduction')}15%</li>
                <li>{t('pages.report.esg.environmental.wasteManagement')}: {t('pages.report.esg.environmental.zeroWaste')}</li>
                <li>{t('pages.report.esg.environmental.waterUsage')}: {t('pages.report.esg.environmental.reduced')}20%</li>
                <li>{t('pages.report.esg.environmental.packaging')}: 100%{t('pages.report.esg.environmental.recyclable')}</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab={t('pages.report.esg.tabs.social')} key="social">
            <Card>
              <h3>{t('pages.report.esg.social.title')}</h3>
              <ul>
                <li>{t('pages.report.esg.social.employment')}: 50{t('pages.report.esg.social.people')}</li>
                <li>{t('pages.report.esg.social.communityContribution')}: {t('pages.report.esg.social.participated')}10{t('pages.report.esg.social.publicActivities')}</li>
                <li>{t('pages.report.esg.social.userSatisfaction')}: 4.5/5.0</li>
                <li>{t('pages.report.esg.social.staffTraining')}: {t('pages.report.esg.social.monthly')}2{t('pages.report.esg.social.lowCarbonTraining')}</li>
                <li>{t('pages.report.esg.social.customerEducation')}: {t('pages.report.esg.social.lowCarbonAdvocacy')}</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab={t('pages.report.esg.tabs.governance')} key="governance">
            <Card>
              <h3>{t('pages.report.esg.governance.title')}</h3>
              <ul>
                <li>{t('pages.report.esg.governance.compliance')}: 100%{t('pages.report.esg.governance.certificationStandard')}</li>
                <li>{t('pages.report.esg.governance.transparency')}: {t('pages.report.esg.governance.dataTransparent')}</li>
                <li>{t('pages.report.esg.governance.responsibilityManagement')}: {t('pages.report.esg.governance.managementSystem')}</li>
                <li>{t('pages.report.esg.governance.auditRecords')}: {t('pages.report.esg.governance.completeAuditLog')}</li>
                <li>{t('pages.report.esg.governance.riskControl')}: {t('pages.report.esg.governance.riskWarning')}</li>
              </ul>
            </Card>
          </TabPane>

          <TabPane tab={t('pages.report.esg.tabs.actions')} key="actions">
            <Card
              title={t('pages.report.esg.actions.title')}
              extra={
                <Space>
                  <Button icon={<EyeOutlined />}>{t('pages.report.esg.actions.buttons.preview')}</Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('pdf')}>
                    {t('pages.report.esg.actions.buttons.downloadPdf')}
                  </Button>
                  <Button icon={<DownloadOutlined />} onClick={() => handleDownload('excel')}>
                    {t('pages.report.esg.actions.buttons.downloadExcel')}
                  </Button>
                  <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                    {t('pages.report.esg.actions.buttons.share')}
                  </Button>
                </Space>
              }
            >
              <p>{t('pages.report.esg.actions.description')}</p>
              <ul>
                <li>{t('pages.report.esg.actions.uses.sustainability')}</li>
                <li>{t('pages.report.esg.actions.uses.government')}</li>
                <li>{t('pages.report.esg.actions.uses.partners')}</li>
                <li>{t('pages.report.esg.actions.uses.investors')}</li>
              </ul>
            </Card>
          </TabPane>
        </Tabs>
      </Card>
    </div>
  )
}

export default ReportESG

