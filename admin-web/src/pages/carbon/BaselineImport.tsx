/**
 * 批量导入基准值页
 */
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Button,
  Upload,
  Table,
  Space,
  message,
  Steps,
  Descriptions,
  Progress,
} from 'antd'
import {
  ArrowLeftOutlined,
  UploadOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons'
import type { UploadProps, UploadFile } from 'antd/es/upload'
import { baselineManageAPI } from '@/services/baseline'
import type { BaselineFormData } from '@/types/baseline'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const { Step } = Steps

interface ImportStep {
  step: number
  title: string
}

const BaselineImport: React.FC = () => {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedData, setParsedData] = useState<BaselineFormData[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // 步骤配置
  const steps: ImportStep[] = [
    { step: 0, title: '上传文件' },
    { step: 1, title: '数据预览' },
    { step: 2, title: '导入结果' },
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
      message.success(`成功解析 ${convertedData.length} 条数据`)
    } catch (error: any) {
      message.error(`文件解析失败: ${error.message}`)
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
      if (!item.category.mealType) errors.push('餐食类型必填')
      if (!item.category.region) errors.push('地区必填')
      if (!item.category.energyType) errors.push('用能方式必填')
      if (!item.carbonFootprint.value || item.carbonFootprint.value <= 0) {
        errors.push('基准值必须大于0')
      }
      if (!item.source.organization) errors.push('机构名称必填')
      if (!item.version) errors.push('版本号必填')
      if (!item.effectiveDate) errors.push('有效日期必填')
      if (!item.expiryDate) errors.push('失效日期必填')

      // 验证日期逻辑
      if (item.effectiveDate && item.expiryDate) {
        const effective = dayjs(item.effectiveDate)
        const expiry = dayjs(item.expiryDate)
        if (expiry.isBefore(effective)) {
          errors.push('失效日期必须晚于有效日期')
        }
      }

      // 验证分解数据总和
      const total = item.breakdown.ingredients + item.breakdown.cookingEnergy + 
                    item.breakdown.packaging + item.breakdown.other
      if (Math.abs(total - item.carbonFootprint.value) > 0.1) {
        errors.push(`分解数据总和(${total.toFixed(2)})应与基准值(${item.carbonFootprint.value.toFixed(2)})一致`)
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
      message.warning(`有 ${invalid.length} 条数据验证失败，请修正后重试`)
      // 显示错误详情
      console.error('验证失败的数据:', invalid)
      return
    }

    if (valid.length === 0) {
      message.error('没有有效数据可导入')
      return
    }

    setLoading(true)
    try {
      const result = await baselineManageAPI.batchImport(valid)
      
      setImportResult(result)
      setCurrentStep(2)
      
      if (result.failed === 0) {
        message.success(`成功导入 ${result.success} 条数据`)
      } else {
        message.warning(`导入完成：成功 ${result.success} 条，失败 ${result.failed} 条`)
      }
    } catch (error: any) {
      message.error(`导入失败: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // 预览表格列
  const previewColumns = [
    { title: '地区', dataIndex: ['category', 'region'], key: 'region' },
    { title: '餐食类型', dataIndex: ['category', 'mealType'], key: 'mealType' },
    { title: '用能方式', dataIndex: ['category', 'energyType'], key: 'energyType' },
    { title: '基准值', dataIndex: ['carbonFootprint', 'value'], key: 'value' },
    { title: '版本', dataIndex: 'version', key: 'version' },
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
              返回列表
            </Button>
            <span>批量导入基准值</span>
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
                选择文件
              </Button>
            </Upload>
            <div style={{ marginTop: 16 }}>
              <p>支持格式：Excel (.xlsx, .xls), CSV</p>
              <p>请确保文件包含以下字段：</p>
              <ul>
                <li>餐食类型、地区、用能方式（必填）</li>
                <li>基准值、不确定性（必填）</li>
                <li>分解数据：食材、烹饪能耗、包装、其他（必填）</li>
                <li>数据来源：来源类型、机构名称、报告名称、年份、计算方法（必填）</li>
                <li>版本号、有效日期、失效日期（必填）</li>
              </ul>
              <Button
                type="link"
                icon={<FileExcelOutlined />}
                onClick={() => {
                  // TODO: 下载模板文件
                  message.info('模板下载功能开发中')
                }}
              >
                下载导入模板
              </Button>
            </div>
          </div>
        )}

        {/* 步骤2: 数据预览 */}
        {currentStep === 1 && (
          <div>
            <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
              <Descriptions.Item label="总数据量">{parsedData.length} 条</Descriptions.Item>
              <Descriptions.Item label="文件名称">{fileList[0]?.name}</Descriptions.Item>
            </Descriptions>
            <Table
              columns={previewColumns}
              dataSource={parsedData}
              rowKey={(_, index) => `preview-${index}`}
              pagination={{ pageSize: 10 }}
              style={{ marginBottom: 16 }}
            />
            <Space>
              <Button onClick={() => setCurrentStep(0)}>重新上传</Button>
              <Button type="primary" loading={loading} onClick={handleImport}>
                确认导入
              </Button>
            </Space>
          </div>
        )}

        {/* 步骤3: 导入结果 */}
        {currentStep === 2 && importResult && (
          <div>
            <Card>
              <Descriptions bordered column={2}>
                <Descriptions.Item label="成功">
                  <span style={{ color: '#52c41a' }}>
                    {importResult.success} 条
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="失败">
                  <span style={{ color: '#ff4d4f' }}>
                    {importResult.failed} 条
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="跳过">
                  <span style={{ color: '#faad14' }}>
                    {importResult.skipped} 条
                  </span>
                </Descriptions.Item>
                <Descriptions.Item label="总计">
                  {parsedData.length} 条
                </Descriptions.Item>
              </Descriptions>

              <Progress
                percent={Math.round((importResult.success / parsedData.length) * 100)}
                status={importResult.failed > 0 ? 'exception' : 'success'}
                style={{ marginTop: 16 }}
              />

              {importResult.errors && importResult.errors.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4>错误详情：</h4>
                  <ul>
                    {importResult.errors.map((error: any, index: number) => (
                      <li key={index} style={{ color: '#ff4d4f' }}>
                        {error.baselineId || `第${index + 1}条`}: {error.error}
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
                  继续导入
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={() => navigate('/carbon/baseline')}
                >
                  完成
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

