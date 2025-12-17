/**
 * 批量导入基准值页
 */
import { baselineManageAPI } from '@/services/baseline'
import type { BaselineFormData } from '@/types/baseline'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileExcelOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Descriptions,
  Progress,
  Space,
  Steps,
  Table,
  Upload,
  message,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd/es/upload'
import dayjs from 'dayjs'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

const { Step } = Steps

interface ImportStep {
  step: number
  title: string
}

const BaselineImport: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedData, setParsedData] = useState<BaselineFormData[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 步骤配置
  const steps: ImportStep[] = [
    { step: 0, title: t('pages.carbon.baselineImport.steps.upload') },
    { step: 1, title: t('pages.carbon.baselineImport.steps.preview') },
    { step: 2, title: t('pages.carbon.baselineImport.steps.result') },
  ]

  // 处理文件上传
  const handleUpload: UploadProps['beforeUpload'] = async (file) => {
    setLoading(true)
    try {
      // 读取Excel文件
      const arrayBuffer = await file.arrayBuffer()
      const workbook = XLSX.read(arrayBuffer, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet)

      // 转换数据格式
      const convertedData: BaselineFormData[] = jsonData.map((row: any) => {
        return {
          category: {
            mealType: row['餐食类型'] || row.mealType,
            region: row['地区'] || row.region,
            energyType: row['用能方式'] || row.energyType,
            city: row['城市'] || row.city,
            restaurantType: row['餐厅类型'] || row.restaurantType,
          },
          carbonFootprint: {
            value: parseFloat(row['基准值'] || row.value || 0),
            uncertainty: parseFloat(row['不确定性'] || row.uncertainty || 0),
            confidenceInterval: {
              lower: parseFloat(row['置信区间下限'] || row.lower || 0),
              upper: parseFloat(row['置信区间上限'] || row.upper || 0),
            },
          },
          breakdown: {
            ingredients: parseFloat(row['食材'] || row.ingredients || 0),
            cookingEnergy: parseFloat(row['烹饪能耗'] || row.cookingEnergy || 0),
            packaging: parseFloat(row['包装'] || row.packaging || 0),
            other: parseFloat(row['其他'] || row.other || 0),
          },
          source: {
            type: row['来源类型'] || row.sourceType,
            organization: row['机构名称'] || row.organization,
            report: row['报告名称'] || row.report,
            year: parseInt(row['年份'] || row.year || new Date().getFullYear()),
            methodology: row['计算方法'] || row.methodology,
          },
          version: row['版本号'] || row.version,
          effectiveDate: row['有效日期'] || row.effectiveDate,
          expiryDate: row['失效日期'] || row.expiryDate,
          notes: row['备注'] || row.notes,
        }
      })

      setParsedData(convertedData)
      setFileList([file])
      setCurrentStep(1)
      message.success(t('pages.carbon.baselineImport.messages.parseSuccess', { count: convertedData.length }))
    } catch (error: any) {
      message.error(t('pages.carbon.baselineImport.messages.parseFailed', { error: error.message }))
    } finally {
      setLoading(false)
    }
    return false // 阻止自动上传
  }

  // 验证数据
  const validateData = (data: BaselineFormData[]): { valid: BaselineFormData[]; invalid: any[] } => {
    const valid: BaselineFormData[] = []
    const invalid: any[] = []

    data.forEach((item, index) => {
      const errors: string[] = []

      // 验证必填字段
      if (!item.category.mealType) errors.push(t('pages.carbon.baselineImport.validation.mealTypeRequired'))
      if (!item.category.region) errors.push(t('pages.carbon.baselineImport.validation.regionRequired'))
      if (!item.category.energyType) errors.push(t('pages.carbon.baselineImport.validation.energyTypeRequired'))
      if (!item.carbonFootprint.value || item.carbonFootprint.value <= 0) {
        errors.push(t('pages.carbon.baselineImport.validation.valueRequired'))
      }
      if (!item.source.organization) errors.push(t('pages.carbon.baselineImport.validation.organizationRequired'))
      if (!item.version) errors.push(t('pages.carbon.baselineImport.validation.versionRequired'))
      if (!item.effectiveDate) errors.push(t('pages.carbon.baselineImport.validation.effectiveDateRequired'))
      if (!item.expiryDate) errors.push(t('pages.carbon.baselineImport.validation.expiryDateRequired'))

      // 验证日期逻辑
      if (item.effectiveDate && item.expiryDate) {
        const effective = dayjs(item.effectiveDate)
        const expiry = dayjs(item.expiryDate)
        if (expiry.isBefore(effective)) {
          errors.push(t('pages.carbon.baselineImport.validation.expiryBeforeEffective'))
        }
      }

      // 验证分解数据总和
      const total = item.breakdown.ingredients + item.breakdown.cookingEnergy + 
                    item.breakdown.packaging + item.breakdown.other
      if (Math.abs(total - item.carbonFootprint.value) > 0.1) {
        errors.push(t('pages.carbon.baselineImport.validation.breakdownMismatch', {
          total: total.toFixed(2),
          value: item.carbonFootprint.value.toFixed(2)
        }))
      }

      if (errors.length > 0) {
        invalid.push({
          index: index + 1,
          data: item,
          errors,
        })
      } else {
        valid.push(item)
      }
    })

    return { valid, invalid }
  }

  // 执行导入
  const handleImport = async () => {
    const { valid, invalid } = validateData(parsedData)

    if (invalid.length > 0) {
      message.warning(t('pages.carbon.baselineImport.messages.validationFailed', { count: invalid.length }))
      return
    }

    if (valid.length === 0) {
      message.error(t('pages.carbon.baselineImport.messages.noValidData'))
      return
    }

    setLoading(true)
    try {
      const result = await baselineManageAPI.batchImport(valid)
      
      setImportResult(result)
      setCurrentStep(2)
      
      if (result.failed === 0) {
        message.success(t('pages.carbon.baselineImport.messages.importSuccess', { count: result.success }))
      } else {
        message.warning(t('pages.carbon.baselineImport.messages.importPartial', {
          success: result.success,
          failed: result.failed
        }))
      }
    } catch (error: any) {
      message.error(t('pages.carbon.baselineImport.messages.importFailed', { error: error.message }))
    } finally {
      setLoading(false)
    }
  }

  // 预览表格列
  const previewColumns = [
    { title: t('pages.carbon.baselineImport.preview.columns.region'), dataIndex: ['category', 'region'], key: 'region' },
    { title: t('pages.carbon.baselineImport.preview.columns.mealType'), dataIndex: ['category', 'mealType'], key: 'mealType' },
    { title: t('pages.carbon.baselineImport.preview.columns.energyType'), dataIndex: ['category', 'energyType'], key: 'energyType' },
    { title: t('pages.carbon.baselineImport.preview.columns.value'), dataIndex: ['carbonFootprint', 'value'], key: 'value' },
    { title: t('pages.carbon.baselineImport.preview.columns.version'), dataIndex: 'version', key: 'version' },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/carbon/baseline')}
            >
              {t('pages.carbon.baselineImport.buttons.back')}
            </Button>
            <span>{t('pages.carbon.baselineImport.title')}</span>
          </Space>
        }
      >
        <Steps current={currentStep} style={{ marginBottom: 24 }}>
          {steps.map((step) => (
            <Step key={step.step} title={step.title} />
          ))}
        </Steps>

        {/* 步骤1: 上传文件 */}
        {currentStep === 0 && (
          <div>
            <Upload
              accept=".xlsx,.xls,.csv"
              fileList={fileList}
              beforeUpload={handleUpload}
              onRemove={() => {
                setFileList([])
                setParsedData([])
              }}
            >
              <Button icon={<UploadOutlined />} loading={loading}>
                {t('pages.carbon.baselineImport.buttons.selectFile')}
              </Button>
            </Upload>
            <div style={{ marginTop: 16 }}>
              <p>{t('pages.carbon.baselineImport.upload.formats')}</p>
              <p>{t('pages.carbon.baselineImport.upload.requiredFields')}</p>
              <ul>
                <li>{t('pages.carbon.baselineImport.upload.requiredFieldsList.category')}</li>
                <li>{t('pages.carbon.baselineImport.upload.requiredFieldsList.carbon')}</li>
                <li>{t('pages.carbon.baselineImport.upload.requiredFieldsList.breakdown')}</li>
                <li>{t('pages.carbon.baselineImport.upload.requiredFieldsList.source')}</li>
                <li>{t('pages.carbon.baselineImport.upload.requiredFieldsList.version')}</li>
              </ul>
              <Button
                type="link"
                icon={<FileExcelOutlined />}
                onClick={() => {
                  // TODO: 下载模板文件
                  message.info(t('pages.carbon.baselineImport.upload.templateDownloading'))
                }}
              >
                {t('pages.carbon.baselineImport.buttons.downloadTemplate')}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤2: 数据预览 */}
        {currentStep === 1 && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('pages.carbon.baselineImport.preview.totalData')}>{parsedData.length} {t('common.items')}</Descriptions.Item>
              <Descriptions.Item label={t('pages.carbon.baselineImport.preview.fileName')}>{fileList[0]?.name}</Descriptions.Item>
            </Descriptions>
            <Table
              columns={previewColumns}
              dataSource={parsedData}
              rowKey={(_, index) => `preview-${index}`}
              pagination={{ pageSize: 10 }}
              style={{ marginBottom: 16 }}
            />
            <Space>
              <Button onClick={() => setCurrentStep(0)}>{t('pages.carbon.baselineImport.buttons.reupload')}</Button>
              <Button type="primary" loading={loading} onClick={handleImport}>
                {t('pages.carbon.baselineImport.buttons.confirmImport')}
              </Button>
            </Space>
          </div>
        )}

        {/* 步骤3: 导入结果 */}
        {currentStep === 2 && importResult && (
          <div>
            <Card>
              <Descriptions bordered column={2}>
                <Descriptions.Item label={t('pages.carbon.baselineImport.result.success')}>
                  <span style={{ color: '#52c41a' }}>
                    {importResult.success} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.baselineImport.result.failed')}>
                  <span style={{ color: '#ff4d4f' }}>
                    {importResult.failed} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.baselineImport.result.skipped')}>
                  <span style={{ color: '#faad14' }}>
                    {importResult.skipped} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.baselineImport.result.total')}>
                  {parsedData.length} {t('common.items')}
                </Descriptions.Item>
              </Descriptions>

              <Progress
                percent={Math.round((importResult.success / parsedData.length) * 100)}
                status={importResult.failed > 0 ? 'exception' : 'success'}
                style={{ marginTop: 16 }}
              />

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>{t('pages.carbon.baselineImport.result.errorDetails')}</h4>
                  <ul>
                    {importResult.errors.map((error: any, index: number) => (
                      <li key={index} style={{ color: '#ff4d4f' }}>
                        {error.baselineId || `${t('common.page')}${index + 1}${t('common.items')}`}: {error.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>

            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button onClick={() => {
                  setCurrentStep(0)
                  setFileList([])
                  setParsedData([])
                  setImportResult(null)
                }}>
                  {t('pages.carbon.baselineImport.buttons.continueImport')}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => navigate('/carbon/baseline')}
                >
                  {t('pages.carbon.baselineImport.buttons.complete')}
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default BaselineImport

