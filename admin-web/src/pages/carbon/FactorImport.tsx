/**
 * 批量导入碳排放因子页
 */
import { factorManageAPI } from '@/services/factor'
import type { FactorFormData } from '@/types/factor'
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
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

const { Step } = Steps

interface ImportStep {
  step: number
  title: string
}

const FactorImport: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedData, setParsedData] = useState<FactorFormData[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 步骤配置
  const steps: ImportStep[] = [
    { step: 0, title: t('pages.carbon.factorImport.steps.upload') },
    { step: 1, title: t('pages.carbon.factorImport.steps.preview') },
    { step: 2, title: t('pages.carbon.factorImport.steps.result') },
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
      const convertedData: FactorFormData[] = jsonData.map((row: any) => {
        return {
          name: row['名称'] || row.name,
          alias: (row['别名'] || row.alias || '').split(/[,\s]+/).filter((a: string) => a.trim()),
          category: row['分类'] || row.category,
          subCategory: row['子分类'] || row.subCategory,
          factorValue: parseFloat(row['因子值'] || row.factorValue || 0),
          unit: row['单位'] || row.unit || 'kgCO2e/kg',
          uncertainty: row['不确定性'] || row.uncertainty ? parseFloat(row['不确定性'] || row.uncertainty) : undefined,
          region: row['适用区域'] || row.region,
          source: row['数据来源'] || row.source,
          year: parseInt(row['年份'] || row.year || new Date().getFullYear()),
          version: row['版本号'] || row.version,
          boundary: row['边界'] || row.boundary || 'cradle-to-gate',
          status: row['状态'] || row.status || 'draft',
          notes: row['备注'] || row.notes,
        }
      })

      setParsedData(convertedData)
      setFileList([file])
      setCurrentStep(1)
      message.success(t('pages.carbon.factorImport.messages.parseSuccess', { count: convertedData.length }))
    } catch (error: any) {
      message.error(t('pages.carbon.factorImport.messages.parseFailed', { error: error.message }))
    } finally {
      setLoading(false)
    }
    return false // 阻止自动上传
  }

  // 验证数据
  const validateData = (data: FactorFormData[]): { valid: FactorFormData[]; invalid: any[] } => {
    const valid: FactorFormData[] = []
    const invalid: any[] = []

    data.forEach((item, index) => {
      const errors: string[] = []

      // 验证必填字段
      if (!item.name) errors.push(t('pages.carbon.factorImport.validation.nameRequired'))
      if (!item.category) errors.push(t('pages.carbon.factorImport.validation.categoryRequired'))
      if (!item.subCategory) errors.push(t('pages.carbon.factorImport.validation.subCategoryRequired'))
      if (!item.factorValue || item.factorValue <= 0) {
        errors.push(t('pages.carbon.factorImport.validation.factorValueRequired'))
      }
      if (!item.unit) errors.push(t('pages.carbon.factorImport.validation.unitRequired'))
      if (!item.region) errors.push(t('pages.carbon.factorImport.validation.regionRequired'))
      if (!item.source) errors.push(t('pages.carbon.factorImport.validation.sourceRequired'))
      if (!item.year || item.year < 2000 || item.year > 2100) {
        errors.push(t('pages.carbon.factorImport.validation.yearRequired'))
      }
      if (!item.version) errors.push(t('pages.carbon.factorImport.validation.versionRequired'))

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
      message.warning(t('pages.carbon.factorImport.messages.validationFailed', { count: invalid.length }))
      return
    }

    if (valid.length === 0) {
      message.error(t('pages.carbon.factorImport.messages.noValidData'))
      return
    }

    setLoading(true)
    try {
      const result = await factorManageAPI.batchImport(valid)
      
      setImportResult(result)
      setCurrentStep(2)
      
      if (result.failed === 0) {
        message.success(t('pages.carbon.factorImport.messages.importSuccess', { count: result.success }))
      } else {
        message.warning(t('pages.carbon.factorImport.messages.importPartial', {
          success: result.success,
          failed: result.failed
        }))
      }
    } catch (error: any) {
      message.error(t('pages.carbon.factorImport.messages.importFailed', { error: error.message }))
    } finally {
      setLoading(false)
    }
  }

  // 预览表格列
  const previewColumns = [
    { title: t('pages.carbon.factorImport.preview.columns.name'), dataIndex: 'name', key: 'name' },
    { title: t('pages.carbon.factorImport.preview.columns.category'), dataIndex: 'category', key: 'category' },
    { title: t('pages.carbon.factorImport.preview.columns.subCategory'), dataIndex: 'subCategory', key: 'subCategory' },
    { title: t('pages.carbon.factorImport.preview.columns.factorValue'), dataIndex: 'factorValue', key: 'factorValue', render: (value: number, record: FactorFormData) => `${value} ${record.unit}` },
    { title: t('pages.carbon.factorImport.preview.columns.source'), dataIndex: 'source', key: 'source' },
    { title: t('pages.carbon.factorImport.preview.columns.year'), dataIndex: 'year', key: 'year' },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/carbon/factor-library')}
            >
              {t('pages.carbon.factorImport.buttons.back')}
            </Button>
            <span>{t('pages.carbon.factorImport.title')}</span>
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
                {t('pages.carbon.factorImport.buttons.selectFile')}
              </Button>
            </Upload>
            <div style={{ marginTop: 16 }}>
              <p>{t('pages.carbon.factorImport.upload.formats')}</p>
              <p>{t('pages.carbon.factorImport.upload.requiredFields')}</p>
              <ul>
                <li>{t('pages.carbon.factorImport.upload.requiredFieldsList.name')}</li>
                <li>{t('pages.carbon.factorImport.upload.requiredFieldsList.category')}</li>
                <li>{t('pages.carbon.factorImport.upload.requiredFieldsList.factorValue')}</li>
                <li>{t('pages.carbon.factorImport.upload.requiredFieldsList.source')}</li>
                <li>{t('pages.carbon.factorImport.upload.requiredFieldsList.year')}</li>
              </ul>
              <Button
                type="link"
                icon={<FileExcelOutlined />}
                onClick={() => {
                  // TODO: 下载模板文件
                  message.info(t('pages.carbon.factorImport.upload.templateDownloading'))
                }}
              >
                {t('pages.carbon.factorImport.buttons.downloadTemplate')}
              </Button>
            </div>
          </div>
        )}

        {/* 步骤2: 数据预览 */}
        {currentStep === 1 && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label={t('pages.carbon.factorImport.preview.totalData')}>
                {parsedData.length} {t('common.items')}
              </Descriptions.Item>
              <Descriptions.Item label={t('pages.carbon.factorImport.preview.fileName')}>
                {fileList[0]?.name}
              </Descriptions.Item>
            </Descriptions>
            <Table
              columns={previewColumns}
              dataSource={parsedData}
              rowKey={(_, index) => `preview-${index}`}
              pagination={{ pageSize: 10 }}
              style={{ marginBottom: 16 }}
            />
            <Space>
              <Button onClick={() => setCurrentStep(0)}>{t('pages.carbon.factorImport.buttons.reupload')}</Button>
              <Button type="primary" loading={loading} onClick={handleImport}>
                {t('pages.carbon.factorImport.buttons.confirmImport')}
              </Button>
            </Space>
          </div>
        )}

        {/* 步骤3: 导入结果 */}
        {currentStep === 2 && importResult && (
          <div>
            <Card>
              <Descriptions bordered column={2}>
                <Descriptions.Item label={t('pages.carbon.factorImport.result.success')}>
                  <span style={{ color: '#52c41a' }}>
                    {importResult.success} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.factorImport.result.failed')}>
                  <span style={{ color: '#ff4d4f' }}>
                    {importResult.failed} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.factorImport.result.skipped')}>
                  <span style={{ color: '#faad14' }}>
                    {importResult.skipped} {t('common.items')}
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label={t('pages.carbon.factorImport.result.total')}>
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
                  <h4>{t('pages.carbon.factorImport.result.errorDetails')}</h4>
                  <ul>
                    {importResult.errors.map((error: any, index: number) => (
                      <li key={index} style={{ color: '#ff4d4f' }}>
                        {error.factorId || `${t('common.page')}${index + 1}${t('common.items')}`}: {error.error}
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
                  {t('pages.carbon.factorImport.buttons.continueImport')}
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => navigate('/carbon/factor-library')}
                >
                  {t('pages.carbon.factorImport.buttons.complete')}
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

export default FactorImport

