import { ingredientAPI, recipeAPI } from '@/services/cloudbase'
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
  Radio,
  Space,
  Steps,
  Table,
  Upload,
  message,
} from 'antd'
import type { UploadFile, UploadProps } from 'antd/es/upload'
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as XLSX from 'xlsx'

const { Step } = Steps

interface ImportStep {
  step: number
  title: string
}

interface ParsedIngredient {
  name: string
  nameEn?: string
  category: string
  description?: string
  status?: string
}

interface ParsedRecipe {
  name: string
  nameEn?: string
  category: string
  description?: string
  cookingMethod?: string
  cookingTime?: number
  difficulty?: string
  status?: string
}

const Import: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [importType, setImportType] = useState<'ingredient' | 'recipe'>('ingredient')

  useEffect(() => {
    const type = searchParams.get('type')
    if (type === 'ingredient' || type === 'recipe') {
      setImportType(type)
    }
  }, [searchParams])
  const [currentStep, setCurrentStep] = useState(0)
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [parsedData, setParsedData] = useState<ParsedIngredient[] | ParsedRecipe[]>([])
  const [importResult, setImportResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importProgress, setImportProgress] = useState(0)

  // 步骤配置
  const steps: ImportStep[] = [
    { step: 0, title: '选择类型和上传文件' },
    { step: 1, title: '预览数据' },
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

      if (importType === 'ingredient') {
        // 转换食材数据
        const convertedData: ParsedIngredient[] = jsonData.map((row: any) => ({
          name: row['食材名称'] || row.name || '',
          nameEn: row['英文名称'] || row.nameEn,
          category: row['分类'] || row.category || 'vegetables',
          description: row['描述'] || row.description,
          status: row['状态'] || row.status || 'draft',
        }))

        // 验证必填字段
        const invalidData = convertedData.filter((item) => !item.name || !item.category)
        if (invalidData.length > 0) {
          message.error(`有 ${invalidData.length} 条数据缺少必填字段（食材名称、分类）`)
          setLoading(false)
          return false
        }

        setParsedData(convertedData)
      } else {
        // 转换食谱数据
        const convertedData: ParsedRecipe[] = jsonData.map((row: any) => ({
          name: row['食谱名称'] || row.name || '',
          nameEn: row['英文名称'] || row.nameEn,
          category: row['分类'] || row.category || 'dish',
          description: row['描述'] || row.description,
          cookingMethod: row['烹饪方式'] || row.cookingMethod || 'stir_fried',
          cookingTime: row['烹饪时间'] || row.cookingTime,
          difficulty: row['难度'] || row.difficulty || 'easy',
          status: row['状态'] || row.status || 'draft',
        }))

        // 验证必填字段
        const invalidData = convertedData.filter((item) => !item.name || !item.category)
        if (invalidData.length > 0) {
          message.error(`有 ${invalidData.length} 条数据缺少必填字段（食谱名称、分类）`)
          setLoading(false)
          return false
        }

        setParsedData(convertedData)
      }

      setFileList([file])
      setCurrentStep(1)
      message.success(`成功解析 ${jsonData.length} 条数据`)
    } catch (error: any) {
      console.error('解析文件失败:', error)
      message.error('解析文件失败，请检查文件格式')
    } finally {
      setLoading(false)
    }

    return false // 阻止自动上传
  }

  // 执行导入
  const handleImport = async () => {
    if (parsedData.length === 0) {
      message.warning('没有可导入的数据')
      return
    }

    setImporting(true)
    setImportProgress(0)
    setCurrentStep(2)

    try {
      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (let i = 0; i < parsedData.length; i++) {
        const item = parsedData[i]
        try {
          let result
          if (importType === 'ingredient') {
            result = await ingredientAPI.createBase(item as ParsedIngredient)
          } else {
            result = await recipeAPI.createBase({
              ...(item as ParsedRecipe),
              isBaseRecipe: true,
              ingredients: [], // 批量导入时不包含食材列表
            })
          }

          if (result && result.code === 0) {
            successCount++
          } else {
            failedCount++
            errors.push(`${item.name}: ${result?.message || '创建失败'}`)
          }
        } catch (error: any) {
          failedCount++
          errors.push(`${item.name}: ${error.message || '创建失败'}`)
        }

        setImportProgress(Math.round(((i + 1) / parsedData.length) * 100))
      }

      setImportResult({
        total: parsedData.length,
        success: successCount,
        failed: failedCount,
        errors: errors.slice(0, 10), // 只显示前10个错误
      })

      message.success(`导入完成：成功 ${successCount} 条，失败 ${failedCount} 条`)
    } catch (error: any) {
      message.error(error.message || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  // 重置
  const handleReset = () => {
    setCurrentStep(0)
    setFileList([])
    setParsedData([])
    setImportResult(null)
    setImportProgress(0)
  }

  // 食材预览表格列
  const ingredientColumns = [
    { title: '食材名称', dataIndex: 'name', key: 'name' },
    { title: '英文名称', dataIndex: 'nameEn', key: 'nameEn' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ]

  // 食谱预览表格列
  const recipeColumns = [
    { title: '食谱名称', dataIndex: 'name', key: 'name' },
    { title: '英文名称', dataIndex: 'nameEn', key: 'nameEn' },
    { title: '分类', dataIndex: 'category', key: 'category' },
    { title: '烹饪方式', dataIndex: 'cookingMethod', key: 'cookingMethod' },
    { title: '状态', dataIndex: 'status', key: 'status' },
  ]

  return (
    <Card
      title="批量导入"
      extra={
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
          返回
        </Button>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step) => (
          <Step key={step.step} title={step.title} />
        ))}
      </Steps>

      {currentStep === 0 && (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <h3>选择导入类型</h3>
              <Radio.Group
                value={importType}
                onChange={(e) => {
                  setImportType(e.target.value)
                  handleReset()
                }}
              >
                <Radio value="ingredient">食材</Radio>
                <Radio value="recipe">食谱</Radio>
              </Radio.Group>
            </div>

            <div>
              <h3>上传文件</h3>
              <p style={{ color: '#666', marginBottom: 16 }}>
                支持 Excel 文件（.xlsx, .xls）和 CSV 文件（.csv）
              </p>
              <Upload
                accept=".xlsx,.xls,.csv"
                beforeUpload={handleUpload}
                fileList={fileList}
                onRemove={() => {
                  setFileList([])
                  setParsedData([])
                }}
              >
                <Button icon={<UploadOutlined />} loading={loading}>
                  选择文件
                </Button>
              </Upload>

              <div style={{ marginTop: 16, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
                <h4>文件格式说明：</h4>
                {importType === 'ingredient' ? (
                  <ul>
                    <li>必填字段：食材名称、分类</li>
                    <li>可选字段：英文名称、描述、状态</li>
                    <li>分类选项：vegetables（蔬菜类）、beans（豆制品）、grains（谷物类）、nuts（坚果类）、fruits（水果类）、mushrooms（菌菇类）</li>
                    <li>状态选项：draft（草稿）、published（已发布）、archived（已归档）</li>
                  </ul>
                ) : (
                  <ul>
                    <li>必填字段：食谱名称、分类</li>
                    <li>可选字段：英文名称、描述、烹饪方式、烹饪时间、难度、状态</li>
                    <li>分类选项：staple（主食）、dish（菜品）、soup（汤品）、dessert（甜品）、drink（饮品）、snack（小食）</li>
                    <li>烹饪方式：stir_fried（炒）、boiled（煮）、steamed（蒸）、fried（炸）、baked（烤）、stewed（炖）、cold（凉拌）</li>
                    <li>难度选项：easy（简单）、medium（中等）、hard（困难）</li>
                  </ul>
                )}
              </div>
            </div>
          </Space>
        </Card>
      )}

      {currentStep === 1 && (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <div>
              <h3>数据预览（共 {parsedData.length} 条）</h3>
              <Table
                columns={importType === 'ingredient' ? ingredientColumns : recipeColumns}
                dataSource={parsedData}
                rowKey={(record, index) => `${importType}-${index}`}
                pagination={{ pageSize: 10 }}
                scroll={{ x: 800 }}
              />
            </div>

            <Space>
              <Button onClick={handleReset}>重新上传</Button>
              <Button type="primary" onClick={handleImport} loading={importing}>
                开始导入
              </Button>
            </Space>
          </Space>
        </Card>
      )}

      {currentStep === 2 && (
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {importing ? (
              <div>
                <h3>正在导入...</h3>
                <Progress percent={importProgress} status="active" />
              </div>
            ) : (
              <>
                <div>
                  <h3>
                    <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
                    导入完成
                  </h3>
                  <Descriptions bordered column={2} style={{ marginTop: 16 }}>
                    <Descriptions.Item label="总数">{importResult?.total || 0}</Descriptions.Item>
                    <Descriptions.Item label="成功">
                      <span style={{ color: '#52c41a' }}>{importResult?.success || 0}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="失败">
                      <span style={{ color: '#ff4d4f' }}>{importResult?.failed || 0}</span>
                    </Descriptions.Item>
                    <Descriptions.Item label="成功率">
                      {importResult?.total > 0
                        ? `${((importResult.success / importResult.total) * 100).toFixed(1)}%`
                        : '0%'}
                    </Descriptions.Item>
                  </Descriptions>
                </div>

                {importResult?.errors && importResult.errors.length > 0 && (
                  <div>
                    <h4>错误详情（显示前10条）：</h4>
                    <ul>
                      {importResult.errors.map((error: string, index: number) => (
                        <li key={index} style={{ color: '#ff4d4f' }}>
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Space>
                  <Button onClick={handleReset}>继续导入</Button>
                  <Button
                    type="primary"
                    onClick={() => navigate(`/base/${importType === 'ingredient' ? 'ingredients' : 'recipes'}`)}
                  >
                    查看列表
                  </Button>
                </Space>
              </>
            )}
          </Space>
        </Card>
      )}
    </Card>
  )
}

export default Import

