import { certificationAPI } from '@/services/cloudbase'
import { supplierAPI } from '@/services/traceability'
import { useAppSelector } from '@/store/hooks'
import {
  CheckOutlined,
  ImportOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from 'antd'
import type { UploadFile } from 'antd/es/upload/interface'
import React, { useEffect, useState, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

const { Step } = Steps
const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse
const { Text } = Typography

interface MenuItem {
  id: string
  name: string
  ingredients: string
  quantity: number
  unit: string
  cookingMethod?: string
}

const CertificationApply: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentRestaurantId, restaurants, currentTenant } = useAppSelector((state: any) => state.tenant)
  const currentTenantId = currentTenant?.id || null
  const [currentStep, setCurrentStep] = useState(0)
  const [form] = Form.useForm()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [fileList, setFileList] = useState<UploadFile[]>([])
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string | null>(currentRestaurantId)
  const [loading, setLoading] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({}) // 存储上传后的文件ID
  const [searchParams] = useSearchParams()
  const [isRenewal, setIsRenewal] = useState(false) // 是否为续期申请
  const [dishModalVisible, setDishModalVisible] = useState(false) // 菜品Modal显示状态
  const [editingDish, setEditingDish] = useState<MenuItem | null>(null) // 正在编辑的菜品
  const [dishForm] = Form.useForm() // 菜品表单
  const [trialData, setTrialData] = useState<any>(null) // 试运营数据

  useEffect(() => {
    // 检查URL参数，判断是否为续期申请
    const type = searchParams.get('type')
    if (type === 'renewal') {
      setIsRenewal(true)
      // 可以预填充一些续期申请的数据
    }
  }, [searchParams])

  // 监听 Redux store 中的 currentRestaurantId 变化，同步更新 selectedRestaurantId
  useEffect(() => {
    if (currentRestaurantId !== selectedRestaurantId) {
      setSelectedRestaurantId(currentRestaurantId)
    }
  }, [currentRestaurantId, selectedRestaurantId])

  // 加载草稿数据
  // restoreStep: 是否恢复保存的步骤，默认为true（页面初始化时恢复），false（切换餐厅时不恢复）
  const loadDraft = useCallback(async (restoreStep = true) => {
    const restaurantId = selectedRestaurantId || currentRestaurantId
    // 从currentTenant获取tenantId
    let tenantId = currentTenantId
    if (!tenantId && currentTenant) {
      tenantId = currentTenant.id
    }

    if (!restaurantId || !tenantId) {
      return
    }

    try {
      setLoading(true)
      const result = await certificationAPI.getDraft({
        restaurantId,
        tenantId,
      })

      if (result.code === 0 && result.data) {
        const draft = result.data
        
        console.log('加载草稿数据:', {
          restaurantId,
          restoreStep,
          draftCurrentStep: draft.currentStep,
          hasBasicInfo: !!draft.basicInfo,
        })
        
        // 恢复步骤：只有在restoreStep为true时才恢复，否则保持当前步骤（第一步）
        if (restoreStep && draft.currentStep !== undefined && draft.currentStep !== null) {
          setCurrentStep(draft.currentStep)
        } else {
          // 如果不恢复步骤，确保显示第一步
          setCurrentStep(0)
        }

        // 恢复基本信息
        if (draft.basicInfo) {
          const basicInfoValues = {
            restaurantName: draft.basicInfo.restaurantName,
            address: draft.basicInfo.address,
            contactPhone: draft.basicInfo.contactPhone,
            contactEmail: draft.basicInfo.contactEmail,
            legalPerson: draft.basicInfo.legalPerson,
          }
          console.log('恢复基本信息:', basicInfoValues)
          form.setFieldsValue(basicInfoValues)
          // 恢复上传的文件
          if (draft.basicInfo.businessLicense) {
            setUploadedFiles(prev => ({
              ...prev,
              businessLicense: draft.basicInfo.businessLicense
            }))
          }
        } else {
          console.log('草稿中没有基本信息')
        }

        // 恢复菜单信息
        if (draft.menuInfo && draft.menuInfo.menuItems) {
          const formattedMenuItems: MenuItem[] = draft.menuInfo.menuItems.map((item: any) => {
            // 处理食材：转换为字符串格式
            let ingredientsStr = ''
            if (item.ingredients) {
              if (Array.isArray(item.ingredients)) {
                // 处理数组格式：可能是字符串数组，也可能是对象数组
                ingredientsStr = item.ingredients
                  .map((ing: any) => {
                    if (typeof ing === 'string') {
                      return ing.trim()
                    }
                    if (ing && typeof ing === 'object' && ing !== null) {
                      // 处理对象格式：尝试多种可能的字段名
                      const name = ing.name || ing.ingredientName || ing.ingredient || ing.ingredientName
                      return name ? String(name).trim() : ''
                    }
                    return String(ing || '').trim()
                  })
                  .filter(Boolean)
                  .join(', ')
              } else if (typeof item.ingredients === 'string') {
                ingredientsStr = item.ingredients.trim()
              } else if (typeof item.ingredients === 'object' && item.ingredients !== null) {
                // 处理单个对象格式
                const name = item.ingredients.name || item.ingredients.ingredientName || item.ingredients.ingredient
                ingredientsStr = name ? String(name).trim() : ''
              } else {
                ingredientsStr = String(item.ingredients || '').trim()
              }
            }
            
            // 调试日志：检查转换结果
            if (item.ingredients && typeof item.ingredients !== 'string') {
              console.log('加载草稿 - 食材格式转换:', {
                original: item.ingredients,
                converted: ingredientsStr,
                itemName: item.name,
              })
            }
            
            return {
              id: item.originalId || `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: item.name,
              ingredients: ingredientsStr,
              quantity: item.quantity,
              unit: item.unit,
              cookingMethod: item.cookingMethod,
            }
          })
          setMenuItems(formattedMenuItems)
        }

        // 恢复供应链信息
        if (draft.supplyChainInfo) {
          form.setFieldsValue({
            supplierInfo: draft.supplyChainInfo.suppliers?.[0]?.name || '',
            localIngredientRatio: draft.supplyChainInfo.localIngredientRatio || 0,
            ingredientSource: draft.supplyChainInfo.traceabilityInfo || '',
          })
        }

        // 恢复运营数据
        if (draft.operationData) {
          form.setFieldsValue({
            energyUsage: draft.operationData.energyUsage || '',
            wasteReduction: draft.operationData.wasteReduction || '',
            socialInitiatives: draft.operationData.socialInitiatives?.join('\n') || '',
          })
        }

        // 恢复文档
        if (draft.documents && draft.documents.length > 0) {
          const files: Record<string, string> = {}
          draft.documents.forEach((doc: any) => {
            if (doc.fileId) {
              files[doc.type] = doc.fileId
            }
          })
          setUploadedFiles(prev => ({ ...prev, ...files }))
        }

        message.success('已加载草稿数据')
      } else if (result.code === 404) {
        // 没有草稿，这是正常的，不显示错误
        console.log('未找到草稿，开始新的申请')
      }
    } catch (error: any) {
      console.error('加载草稿失败:', error)
      // 不显示错误，因为可能是第一次申请
    } finally {
      setLoading(false)
    }
  }, [selectedRestaurantId, currentRestaurantId, currentTenantId, form])

  // 页面初始化时加载草稿（只在首次加载时执行，避免与餐厅切换逻辑冲突）
  useEffect(() => {
    const restaurantId = selectedRestaurantId || currentRestaurantId
    // 从currentTenant获取tenantId
    let tenantId = currentTenantId
    if (!tenantId && currentTenant) {
      tenantId = currentTenant.id
    }

    // 只在有餐厅ID和租户ID时加载草稿
    // 注意：这个useEffect会在组件首次挂载时执行，但餐厅切换的逻辑已经在另一个useEffect中处理
    if (restaurantId && tenantId) {
      // 延迟加载，确保表单已经初始化
      // 页面初始化时，恢复保存的步骤（restoreStep = true）
      const timer = setTimeout(() => {
        loadDraft(true)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, []) // 只在组件首次挂载时执行一次

  const currentRestaurant = selectedRestaurantId
    ? restaurants.find((r: any) => r.id === selectedRestaurantId)
    : null

  // 加载已有供应商信息
  const loadSuppliers = async () => {
    const restaurantId = selectedRestaurantId || currentRestaurantId
    let tenantId = currentTenantId
    if (!tenantId && currentTenant) {
      tenantId = currentTenant.id
    }

    if (!restaurantId || !tenantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      setLoading(true)
      const result = await supplierAPI.list({
        tenantId,
        restaurantId, // 只加载当前餐厅关联的供应商
        page: 1,
        pageSize: 100, // 获取所有供应商
      })

      if (result.success && result.data && result.data.length > 0) {
        // 构建供应商信息字符串
        const supplierInfoParts = result.data.map((supplier: any) => {
          const parts = [supplier.name || '未命名供应商']
          
          // 添加联系方式
          if (supplier.contact) {
            if (supplier.contact.phone) parts.push(`电话: ${supplier.contact.phone}`)
            if (supplier.contact.email) parts.push(`邮箱: ${supplier.contact.email}`)
            if (supplier.contact.address) parts.push(`地址: ${supplier.contact.address}`)
          }
          
          // 添加认证信息
          if (supplier.certifications && supplier.certifications.length > 0) {
            const certNames = supplier.certifications
              .map((c: any) => (typeof c === 'string' ? c : c.name || c.type))
              .filter(Boolean)
            if (certNames.length > 0) {
              parts.push(`认证: ${certNames.join(', ')}`)
            }
          }
          
          // 添加业务信息
          if (supplier.businessInfo) {
            if (supplier.businessInfo.mainProducts) {
              parts.push(`主营: ${supplier.businessInfo.mainProducts}`)
            }
            if (supplier.businessInfo.riskLevel) {
              const riskLevelMap: Record<string, string> = {
                low: '低风险',
                medium: '中风险',
                high: '高风险',
              }
              parts.push(`风险等级: ${riskLevelMap[supplier.businessInfo.riskLevel] || supplier.businessInfo.riskLevel}`)
            }
          }
          
          return parts.filter(Boolean).join('；')
        })

        const supplierInfoText = supplierInfoParts.join('\n\n')
        
        // 填充供应商信息字段
        form.setFieldsValue({
          supplierInfo: supplierInfoText,
        })

        // 构建食材来源信息（从供应商地址等信息提取）
        const traceabilityParts = result.data
          .map((supplier: any) => {
            const parts = []
            if (supplier.name) parts.push(`供应商: ${supplier.name}`)
            if (supplier.contact?.address) parts.push(`地址: ${supplier.contact.address}`)
            if (supplier.businessInfo?.location) parts.push(`产地: ${supplier.businessInfo.location}`)
            return parts.length > 0 ? parts.join('，') : null
          })
          .filter(Boolean)

        if (traceabilityParts.length > 0) {
          const currentIngredientSource = form.getFieldValue('ingredientSource') || ''
          const newIngredientSource = traceabilityParts.join('\n')
          // 如果已有内容，追加；否则替换
          form.setFieldsValue({
            ingredientSource: currentIngredientSource 
              ? `${currentIngredientSource}\n\n${newIngredientSource}`
              : newIngredientSource,
          })
        }

        message.success(`已加载 ${result.data.length} 个供应商信息`)
      } else {
        message.warning('当前餐厅暂无关联的供应商，请先在供应商管理模块添加供应商')
      }
    } catch (error: any) {
      console.error('加载供应商信息失败:', error)
      message.error(error.message || '加载供应商信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 加载试运营数据并自动填充
  const loadTrialData = async () => {
    // 从currentTenant获取tenantId
    let tenantId = currentTenantId
    if (!tenantId && currentTenant) {
      tenantId = currentTenant.id
    }
    
    if (!selectedRestaurantId || !tenantId) return

    try {
      setLoading(true)
      const result = await certificationAPI.getTrialData({
        restaurantId: selectedRestaurantId,
        tenantId: tenantId,
      })

      if (result.code === 0 && result.data) {
        const trialDataResult = result.data
        setTrialData(trialDataResult)

        // 自动填充菜单信息
        if (trialDataResult.menuInfo && trialDataResult.menuInfo.menuItems) {
          const formattedMenuItems: MenuItem[] = trialDataResult.menuInfo.menuItems.map((item: any) => {
            // 处理食材：确保转换为字符串格式
            let ingredientsStr = ''
            if (item.ingredients) {
              if (Array.isArray(item.ingredients)) {
                ingredientsStr = item.ingredients
                  .map((ing: any) => {
                    if (typeof ing === 'string') return ing
                    if (ing && typeof ing === 'object') {
                      return ing.name || ing.ingredientName || ing.ingredient || String(ing)
                    }
                    return String(ing || '')
                  })
                  .filter(Boolean)
                  .join(', ')
              } else if (typeof item.ingredients === 'string') {
                ingredientsStr = item.ingredients
              } else if (typeof item.ingredients === 'object' && item.ingredients !== null) {
                ingredientsStr = item.ingredients.name || item.ingredients.ingredientName || String(item.ingredients)
              } else {
                ingredientsStr = String(item.ingredients || '')
              }
            }
            
            return {
              id: `trial_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: item.name,
              ingredients: ingredientsStr,
              quantity: item.quantity,
              unit: item.unit,
              cookingMethod: item.cookingMethod,
            }
          })
          setMenuItems(formattedMenuItems)
          message.success(`已自动填充 ${formattedMenuItems.length} 个菜品`)
        }

        // 自动填充供应链信息
        if (trialDataResult.supplyChainInfo) {
          const suppliers = trialDataResult.supplyChainInfo.suppliers || []
          const supplyChainValues: any = {}
          
          console.log('试运营数据 - 供应链信息:', {
            hasSupplyChainInfo: !!trialDataResult.supplyChainInfo,
            suppliersCount: suppliers.length,
            suppliers: suppliers,
            localIngredientRatio: trialDataResult.supplyChainInfo.localIngredientRatio
          })
          
          // 填充供应商信息
          if (suppliers.length > 0) {
            // 构建供应商信息字符串，包含名称、联系方式、认证信息等
            const supplierInfoParts = suppliers.map((s: any) => {
              const parts = [s.name || '未命名供应商']
              if (s.contact) parts.push(`联系方式: ${s.contact}`)
              if (s.certifications && s.certifications.length > 0) {
                parts.push(`认证: ${s.certifications.join(', ')}`)
              }
              return parts.filter(Boolean).join('；')
            })
            supplyChainValues.supplierInfo = supplierInfoParts.join('、')
            console.log('填充供应商信息:', supplyChainValues.supplierInfo)
          } else {
            console.warn('试运营数据中没有供应商信息')
          }
          
          // 填充本地食材占比
          if (trialDataResult.supplyChainInfo.localIngredientRatio !== undefined) {
            supplyChainValues.localIngredientRatio = trialDataResult.supplyChainInfo.localIngredientRatio || 0
            console.log('填充本地食材占比:', supplyChainValues.localIngredientRatio)
          }
          
          // 填充食材来源/可追溯性信息
          // 从供应商信息中提取可追溯性信息（产地、距离、地址等）
          if (suppliers.length > 0) {
            const traceabilityInfoParts = suppliers
              .map((s: any) => {
                const parts = []
                if (s.address) parts.push(`地址: ${s.address}`)
                if (s.distance !== undefined && s.distance !== null) parts.push(`距离: ${s.distance}km`)
                if (s.isLocal) parts.push('本地供应商')
                // 如果有其他可追溯性字段，也可以添加
                return parts.length > 0 ? `${s.name || '供应商'}: ${parts.join('，')}` : null
              })
              .filter(Boolean)
            
            if (traceabilityInfoParts.length > 0) {
              supplyChainValues.ingredientSource = traceabilityInfoParts.join('\n')
              console.log('填充食材来源信息:', supplyChainValues.ingredientSource)
            }
          }
          
          // 如果有任何供应链信息，填充表单
          if (Object.keys(supplyChainValues).length > 0) {
            form.setFieldsValue(supplyChainValues)
            console.log('已自动填充供应链信息:', supplyChainValues)
            message.success(`已自动填充 ${suppliers.length} 个供应商信息`)
          } else {
            console.warn('没有可填充的供应链信息')
            message.warning('试运营数据中没有供应商信息，请手动填写')
          }
        } else {
          console.warn('试运营数据中没有 supplyChainInfo 字段')
        }

        // 自动填充运营数据
        if (trialDataResult.operationData) {
          form.setFieldsValue({
            energyUsage: trialDataResult.operationData.energyUsage || '',
            wasteReduction: trialDataResult.operationData.wasteReduction || '',
            socialInitiatives: trialDataResult.operationData.socialInitiatives?.join('\n') || '',
          })
        }

        message.success('试运营数据已自动填充，请检查并补充缺失信息')
      }
    } catch (error: any) {
      console.error('加载试运营数据失败:', error)
      message.warning('加载试运营数据失败，请手动填写')
    } finally {
      setLoading(false)
    }
  }

  // 当餐厅切换时，重置页面数据并加载对应餐厅的草稿
  useEffect(() => {
    const restaurantId = selectedRestaurantId || currentRestaurantId
    // 从currentTenant获取tenantId
    let tenantId = currentTenantId
    if (!tenantId && currentTenant) {
      tenantId = currentTenant.id
    }

    // 清空表单数据
    form.resetFields()
    // 清空菜单项列表
    setMenuItems([])
    // 清空文件列表
    setFileList([])
    setUploadedFiles({})
    // 清空试运营数据
    setTrialData(null)
    // 切换餐厅时，统一重置到第一步（不恢复保存的步骤，让用户从第一步开始）
    setCurrentStep(0)

    // 如果当前选中的餐厅有信息，自动填充表单
    if (currentRestaurant) {
      form.setFieldsValue({
        restaurantName: currentRestaurant.name,
        contactPhone: currentRestaurant.phone,
        address: currentRestaurant.address,
      })

      // 如果是试运营状态，自动加载试运营数据
      if (currentRestaurant.certificationStatus === 'trial') {
        loadTrialData()
      }
    }

    // 加载对应餐厅的草稿数据（恢复表单数据，但不恢复步骤）
    // 使用setTimeout确保表单重置完成后再加载草稿
    if (restaurantId && tenantId) {
      const timer = setTimeout(() => {
        loadDraft(false) // 传入false，表示不恢复步骤
      }, 100)
      return () => clearTimeout(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRestaurantId, currentRestaurantId])

  const steps = [
    {
      title: t('pages.certification.apply.steps.basicInfo'),
      description: t('pages.certification.apply.steps.basicInfoDesc'),
    },
    {
      title: t('pages.certification.apply.steps.menuInfo'),
      description: t('pages.certification.apply.steps.menuInfoDesc'),
    },
    {
      title: t('pages.certification.apply.steps.supplyChain'),
      description: t('pages.certification.apply.steps.supplyChainDesc'),
    },
    {
      title: t('pages.certification.apply.steps.operationData'),
      description: t('pages.certification.apply.steps.operationDataDesc'),
    },
    {
      title: t('pages.certification.apply.steps.documents'),
      description: t('pages.certification.apply.steps.documentsDesc'),
    },
    {
      title: t('pages.certification.apply.steps.preview'),
      description: t('pages.certification.apply.steps.previewDesc'),
    },
  ]

  const handleNext = () => {
    form.validateFields().then(() => {
      if (currentStep < steps.length - 1) {
        setCurrentStep(currentStep + 1)
      }
    })
  }

  const handlePrev = () => {
    const newStep = currentStep - 1
    setCurrentStep(newStep)
    
    // 如果回到第一步，确保表单数据正确显示
    // 表单数据应该已经在loadDraft中恢复，但为了确保显示正确，重新触发一次表单更新
    if (newStep === 0) {
      // 使用setTimeout确保步骤切换完成后再更新表单
      setTimeout(() => {
        // 重新从草稿加载基本信息，确保表单显示正确
        const restaurantId = selectedRestaurantId || currentRestaurantId
        let tenantId = currentTenantId
        if (!tenantId && currentTenant) {
          tenantId = currentTenant.id
        }
        if (restaurantId && tenantId) {
          // 只重新加载基本信息部分，不改变步骤
          certificationAPI.getDraft({
            restaurantId,
            tenantId,
          }).then((result: any) => {
            if (result.code === 0 && result.data && result.data.basicInfo) {
              form.setFieldsValue({
                restaurantName: result.data.basicInfo.restaurantName,
                address: result.data.basicInfo.address,
                contactPhone: result.data.basicInfo.contactPhone,
                contactEmail: result.data.basicInfo.contactEmail,
                legalPerson: result.data.basicInfo.legalPerson,
              })
            }
          }).catch((error: any) => {
            console.error('重新加载基本信息失败:', error)
          })
        }
      }, 100)
    }
  }

  const handleSaveDraft = async () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning(t('pages.certification.apply.messages.selectRestaurantRequired'))
      return
    }

    try {
      setLoading(true)
      const values = form.getFieldsValue()
      const restaurantId = selectedRestaurantId || currentRestaurantId
      // 从currentTenant获取tenantId，如果没有则尝试从餐厅信息获取
      let tenantId = currentTenantId
      
      // 如果tenantId不存在，尝试从currentTenant获取
      if (!tenantId && currentTenant) {
        tenantId = currentTenant.id
      }

      // 调试日志
      console.log('保存草稿 - 参数检查:', {
        selectedRestaurantId,
        currentRestaurantId,
        restaurantId,
        currentTenant,
        currentTenantId,
        tenantId,
      })

      if (!restaurantId) {
        message.error('餐厅ID缺失，请先选择餐厅')
        return
      }

      if (!tenantId) {
        message.error('租户ID缺失，请先选择租户或餐厅')
        return
      }

      const draftData = {
        currentStep: currentStep, // 保存当前步骤
        basicInfo: {
          restaurantName: values.restaurantName,
          address: values.address,
          contactPhone: values.contactPhone,
          contactEmail: values.contactEmail,
          legalPerson: values.legalPerson,
          businessLicense: uploadedFiles.businessLicense
        },
        menuInfo: {
          menuItems: menuItems.map(item => {
            // 处理食材：确保转换为数组格式，用于保存
            let ingredientsArray: string[] = []
            if (item.ingredients) {
              if (typeof item.ingredients === 'string') {
                // 字符串格式：用逗号分隔（但需要处理可能包含逗号的字符串）
                // 先检查是否是有效的逗号分隔字符串（不是 [object Object] 这样的）
                if (item.ingredients.includes('[object Object]')) {
                  // 如果包含 [object Object]，说明数据有问题，记录日志但不处理
                  console.warn('保存草稿 - 检测到异常食材数据:', {
                    itemName: item.name,
                    ingredients: item.ingredients,
                  })
                  ingredientsArray = []
                } else {
                  // 正常的分隔字符串
                  ingredientsArray = item.ingredients.split(',').map(i => i.trim()).filter(Boolean)
                }
              } else if (Array.isArray(item.ingredients)) {
                // 数组格式：直接使用，但需要确保每个元素都是字符串
                ingredientsArray = item.ingredients.map((ing: any) => {
                  if (typeof ing === 'string') {
                    return ing.trim()
                  }
                  if (ing && typeof ing === 'object' && ing !== null) {
                    // 处理对象格式
                    const name = ing.name || ing.ingredientName || ing.ingredient
                    return name ? String(name).trim() : ''
                  }
                  return String(ing || '').trim()
                }).filter(Boolean)
              } else if (typeof item.ingredients === 'object' && item.ingredients !== null) {
                // 单个对象格式
                const name = item.ingredients.name || item.ingredients.ingredientName || item.ingredients.ingredient
                if (name) {
                  ingredientsArray = [String(name).trim()]
                }
              }
            }
            
            return {
              name: item.name,
              ingredients: ingredientsArray, // 保存为数组格式
              quantity: item.quantity || 1,
              unit: item.unit || '份',
              cookingMethod: item.cookingMethod || 'steamed',
              originalId: item.id,
            }
          }),
          totalDishes: menuItems.length,
        },
        supplyChainInfo: {
          suppliers: values.supplierInfo ? [{ name: values.supplierInfo }] : [],
          localIngredientRatio: parseFloat(values.localIngredientRatio) || 0,
          traceabilityInfo: values.ingredientSource || ''
        },
        operationData: {
          energyUsage: values.energyUsage || '',
          wasteReduction: values.wasteReduction || '',
          socialInitiatives: values.socialInitiatives ? values.socialInitiatives.split('\n') : []
        },
        documents: Object.keys(uploadedFiles).map(type => ({
          type,
          fileId: uploadedFiles[type],
          fileName: fileList.find(f => f.uid === uploadedFiles[type])?.name || ''
        }))
      }

      const result = await certificationAPI.saveDraft({
        restaurantId,
        tenantId,
        draftData,
        draftName: `草稿-${new Date().toLocaleString()}`
      })

      if (result.code === 0) {
        message.success(t('pages.certification.apply.messages.draftSaved'))
      } else {
        message.error(result.message || '保存失败')
      }
    } catch (error: any) {
      console.error('保存草稿失败:', error)
      message.error(error.message || '保存失败')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!selectedRestaurantId && restaurants.length > 1) {
      message.warning(t('pages.certification.apply.messages.selectRestaurantRequired'))
      return
    }

    try {
      await form.validateFields()
      setLoading(true)
      const values = form.getFieldsValue()
      const restaurantId = selectedRestaurantId || currentRestaurantId
      // 从currentTenant获取tenantId，如果没有则尝试从餐厅信息获取
      let tenantId = currentTenantId
      
      // 如果tenantId不存在，尝试从餐厅信息获取
      if (!tenantId && restaurantId) {
        const restaurant = restaurants.find((r: any) => r.id === restaurantId)
        // 如果餐厅信息中有tenantId，使用它
        // 否则，尝试从currentTenant获取
        if (!tenantId && currentTenant) {
          tenantId = currentTenant.id
        }
      }

      if (!restaurantId) {
        message.error('餐厅ID缺失，请先选择餐厅')
        return
      }

      if (!tenantId) {
        message.error('租户ID缺失，请先选择租户或餐厅')
        return
      }

      const applicationData = {
        restaurantId,
        tenantId,
        basicInfo: {
          restaurantName: values.restaurantName,
          address: values.address,
          contactPhone: values.contactPhone,
          contactEmail: values.contactEmail,
          legalPerson: values.legalPerson,
          businessLicense: uploadedFiles.businessLicense
        },
        menuInfo: {
          menuItems: menuItems.map(item => {
            // 处理食材：确保转换为数组格式，用于保存
            let ingredientsArray: string[] = []
            if (item.ingredients) {
              if (typeof item.ingredients === 'string') {
                // 字符串格式：用逗号分隔
                ingredientsArray = item.ingredients.split(',').map(i => i.trim()).filter(Boolean)
              } else if (Array.isArray(item.ingredients)) {
                // 数组格式：直接使用
                ingredientsArray = item.ingredients.map((ing: any) => {
                  if (typeof ing === 'string') return ing.trim()
                  if (ing && typeof ing === 'object') {
                    return (ing.name || ing.ingredientName || ing.ingredient || String(ing)).trim()
                  }
                  return String(ing || '').trim()
                }).filter(Boolean)
              }
            }
            
            return {
              name: item.name,
              ingredients: ingredientsArray, // 保存为数组格式，便于后续查询和分析
              quantity: item.quantity || 1,
              unit: item.unit || '份',
              cookingMethod: item.cookingMethod || 'steamed',
              // 保存完整信息，包括ID，便于追溯
              originalId: item.id,
              // 保存时间戳，便于追溯数据来源
              addedAt: new Date().toISOString()
            }
          }),
          // 保存菜单统计信息
          totalDishes: menuItems.length,
          lastUpdated: new Date().toISOString()
        },
        supplyChainInfo: {
          suppliers: values.supplierInfo ? [{ name: values.supplierInfo }] : [],
          localIngredientRatio: parseFloat(values.localIngredientRatio) || 0,
          traceabilityInfo: values.ingredientSource || ''
        },
        operationData: {
          energyUsage: values.energyUsage || '',
          wasteReduction: values.wasteReduction || '',
          socialInitiatives: values.socialInitiatives ? values.socialInitiatives.split('\n') : []
        },
        documents: Object.keys(uploadedFiles).map(type => ({
          type,
          fileId: uploadedFiles[type],
          fileName: fileList.find(f => f.uid === uploadedFiles[type])?.name || ''
        }))
      }

      const result = await certificationAPI.apply(applicationData)

      if (result.code === 0) {
        message.success(t('pages.certification.apply.messages.submitSuccess'))
        // 跳转到认证进度页面
        navigate('/certification/status')
      } else {
        message.error(result.message || '提交失败')
      }
    } catch (error: any) {
      console.error('提交认证申请失败:', error)
      if (error.errorFields) {
        // 表单验证错误
        return
      }
      message.error(error.message || '提交失败')
    } finally {
      setLoading(false)
    }
  }

  const handleMenuImport = (file: File) => {
    // TODO: 实现Excel/CSV批量导入菜单
    message.info(t('pages.certification.apply.messages.menuImportInProgress'))
    return false
  }

  // 导入餐厅菜品（从 restaurant_menu_items 集合）
  const handleImportRecipes = async () => {
    if (!selectedRestaurantId) {
      message.warning('请先选择餐厅')
      return
    }

    try {
      setLoading(true)
      // 从 restaurant_menu_items 集合获取餐厅的所有激活菜品
      const result = await certificationAPI.getRestaurantMenuItems({
        restaurantId: selectedRestaurantId,
      })

      if (result.code === 0 && result.data && result.data.menuItems) {
        // 从API返回的数据
        const apiMenuItems = result.data.menuItems
        if (apiMenuItems.length === 0) {
          message.warning('该餐厅暂无菜品数据')
          return
        }

        // 将菜单项转换为认证申请所需的格式
        const importedMenuItems: MenuItem[] = apiMenuItems.map((item: any) => {
          // 处理食材：确保是字符串格式
          let ingredientsStr = ''
          if (item.ingredients) {
            if (Array.isArray(item.ingredients)) {
              // 处理数组格式的食材
              ingredientsStr = item.ingredients
                .map((ing: any) => {
                  if (typeof ing === 'string') {
                    // 检查字符串是否包含 [object Object]
                    if (ing.includes('[object Object]')) {
                      console.warn('导入菜品 - 检测到异常字符串:', {
                        itemName: item.name,
                        ing,
                      })
                      return ''
                    }
                    return ing.trim()
                  } else if (ing && typeof ing === 'object' && ing !== null) {
                    // 处理对象格式：可能是 { name, quantity, unit } 或 { ingredientName, ... }
                    // 尝试多种可能的字段名
                    const name = ing.name || ing.ingredientName || ing.ingredient || ing.ingredientName
                    if (name) {
                      return String(name).trim()
                    }
                    // 如果所有字段都不存在，记录警告
                    console.warn('导入菜品 - 无法提取食材名称:', {
                      itemName: item.name,
                      ing,
                    })
                    return ''
                  }
                  // 其他情况：先检查是否是对象
                  if (typeof ing === 'object' && ing !== null) {
                    console.warn('导入菜品 - 未处理的食材对象:', {
                      itemName: item.name,
                      ing,
                    })
                    return ''
                  }
                  const str = String(ing || '').trim()
                  // 检查转换后的字符串是否是 [object Object]
                  if (str === '[object Object]' || str.includes('[object Object]')) {
                    console.warn('导入菜品 - 转换失败:', {
                      itemName: item.name,
                      ing,
                      str,
                    })
                    return ''
                  }
                  return str
                })
                .filter(Boolean)
                .join(', ')
            } else if (typeof item.ingredients === 'string') {
              // 已经是字符串，直接使用（但需要检查是否包含 [object Object]）
              if (item.ingredients.includes('[object Object]')) {
                console.warn('导入菜品 - 检测到异常字符串格式:', {
                  itemName: item.name,
                  ingredients: item.ingredients,
                })
                ingredientsStr = ''
              } else {
                ingredientsStr = item.ingredients.trim()
              }
            } else if (typeof item.ingredients === 'object' && item.ingredients !== null) {
              // 如果ingredients是单个对象，转换为字符串
              const name = item.ingredients.name || item.ingredients.ingredientName || item.ingredients.ingredient
              if (name) {
                ingredientsStr = String(name).trim()
              } else {
                console.warn('导入菜品 - 无法提取单个食材对象名称:', {
                  itemName: item.name,
                  ingredients: item.ingredients,
                })
                ingredientsStr = ''
              }
            } else {
              // 其他情况直接转换为字符串
              const str = String(item.ingredients || '').trim()
              if (str === '[object Object]' || str.includes('[object Object]')) {
                console.warn('导入菜品 - 转换失败:', {
                  itemName: item.name,
                  ingredients: item.ingredients,
                  str,
                })
                ingredientsStr = ''
              } else {
                ingredientsStr = str
              }
            }
          }

          // 确保最终结果是字符串
          if (!ingredientsStr || ingredientsStr === 'undefined' || ingredientsStr === 'null' || ingredientsStr.includes('[object Object]')) {
            ingredientsStr = ''
          }

          // 调试日志：检查转换后的数据
          if (item.ingredients && typeof item.ingredients !== 'string') {
            console.log('导入菜品 - 食材格式转换:', {
              original: item.ingredients,
              converted: ingredientsStr,
              itemName: item.name,
            })
          }

          return {
            id: `menu_item_${item.id || item._id || Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: item.name || '未命名菜品',
            ingredients: ingredientsStr, // 确保是字符串
            quantity: item.quantity || 1,
            unit: item.unit || '份',
            cookingMethod: item.cookingMethod || 'steamed',
          }
        })

        // 调试日志：检查转换后的菜单项
        console.log('导入菜单项 - 转换结果示例:', importedMenuItems.slice(0, 2))

        // 添加到菜单列表（如果已有菜单项，询问是否覆盖）
        // 注意：这里检查的是当前页面状态中的menuItems（通过useState定义），不是API返回的数据
        const currentMenuItemsCount = menuItems.length
        if (currentMenuItemsCount > 0) {
          Modal.confirm({
            title: '确认导入',
            content: `将导入 ${importedMenuItems.length} 个菜品。当前已有 ${currentMenuItemsCount} 个菜品，是否覆盖现有菜品？`,
            onOk: () => {
              setMenuItems(importedMenuItems)
              message.success(`成功导入 ${importedMenuItems.length} 个菜品`)
            },
            okText: '覆盖',
            cancelText: '追加',
            onCancel: () => {
              setMenuItems(prev => [...prev, ...importedMenuItems])
              message.success(`成功追加 ${importedMenuItems.length} 个菜品`)
            },
          })
        } else {
          setMenuItems(importedMenuItems)
          message.success(`成功导入 ${importedMenuItems.length} 个菜品`)
        }
      } else {
        message.error(result.message || '获取菜谱失败')
      }
    } catch (error: any) {
      console.error('导入菜谱失败:', error)
      message.error(error.message || '导入菜谱失败')
    } finally {
      setLoading(false)
    }
  }

  // 打开添加菜品Modal
  const handleAddDish = () => {
    setEditingDish(null)
    dishForm.resetFields()
    setDishModalVisible(true)
  }

  // 打开编辑菜品Modal
  const handleEditDish = (dish: MenuItem) => {
    setEditingDish(dish)
    
    // 处理食材：确保转换为字符串格式用于表单显示
    let ingredientsStr = ''
    if (dish.ingredients) {
      if (typeof dish.ingredients === 'string') {
        ingredientsStr = dish.ingredients
      } else if (Array.isArray(dish.ingredients)) {
        ingredientsStr = dish.ingredients
          .map((ing: any) => {
            if (typeof ing === 'string') return ing
            if (ing && typeof ing === 'object') {
              return ing.name || ing.ingredientName || ing.ingredient || String(ing)
            }
            return String(ing || '')
          })
          .filter(Boolean)
          .join(', ')
      } else if (typeof dish.ingredients === 'object' && dish.ingredients !== null) {
        ingredientsStr = dish.ingredients.name || dish.ingredients.ingredientName || String(dish.ingredients)
      } else {
        ingredientsStr = String(dish.ingredients || '')
      }
    }
    
    dishForm.setFieldsValue({
      name: dish.name,
      ingredients: ingredientsStr,
      quantity: dish.quantity,
      unit: dish.unit,
      cookingMethod: dish.cookingMethod || 'steamed',
    })
    setDishModalVisible(true)
  }

  // 删除菜品
  const handleDeleteDish = (dishId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个菜品吗？',
      onOk: () => {
        setMenuItems(prev => prev.filter(item => item.id !== dishId))
        message.success('删除成功')
      },
    })
  }

  // 保存菜品（添加或编辑）
  const handleSaveDish = async () => {
    try {
      const values = await dishForm.validateFields()
      
      // 确保ingredients是字符串格式
      let ingredientsStr = ''
      if (values.ingredients) {
        if (typeof values.ingredients === 'string') {
          ingredientsStr = values.ingredients.trim()
        } else if (Array.isArray(values.ingredients)) {
          ingredientsStr = values.ingredients
            .map((ing: any) => {
              if (typeof ing === 'string') return ing.trim()
              if (ing && typeof ing === 'object') {
                return (ing.name || ing.ingredientName || ing.ingredient || String(ing)).trim()
              }
              return String(ing || '').trim()
            })
            .filter(Boolean)
            .join(', ')
        } else if (typeof values.ingredients === 'object' && values.ingredients !== null) {
          ingredientsStr = (values.ingredients.name || values.ingredients.ingredientName || String(values.ingredients)).trim()
        } else {
          ingredientsStr = String(values.ingredients || '').trim()
        }
      }
      
      if (editingDish) {
        // 编辑模式
        setMenuItems(prev =>
          prev.map(item =>
            item.id === editingDish.id
              ? {
                  ...item,
                  name: values.name,
                  ingredients: ingredientsStr, // 使用转换后的字符串
                  quantity: values.quantity,
                  unit: values.unit,
                  cookingMethod: values.cookingMethod,
                }
              : item
          )
        )
        message.success('编辑成功')
      } else {
        // 添加模式
        const newDish: MenuItem = {
          id: `dish_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: values.name,
          ingredients: ingredientsStr, // 使用转换后的字符串
          quantity: values.quantity,
          unit: values.unit,
          cookingMethod: values.cookingMethod,
        }
        setMenuItems(prev => [...prev, newDish])
        message.success('添加成功')
      }
      
      setDishModalVisible(false)
      dishForm.resetFields()
      setEditingDish(null)
    } catch (error) {
      // 表单验证失败
      console.error('表单验证失败:', error)
    }
  }

  // 处理文件上传
  const handleFileUpload = async (file: File, documentType: string): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const base64 = e.target?.result as string
          const result = await certificationAPI.uploadFile({
            base64,
            fileName: file.name,
            fileType: file.type,
            documentType
          })

          if (result.code === 0) {
            resolve(result.data.fileID)
          } else {
            reject(new Error(result.message || '上传失败'))
          }
        } catch (error: any) {
          reject(error)
        }
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsDataURL(file)
    })
  }

  // 文件上传前的处理
  const beforeUpload = async (file: File, documentType: string) => {
    try {
      setLoading(true)
      const fileID = await handleFileUpload(file, documentType)
      if (fileID) {
        setUploadedFiles(prev => ({ ...prev, [documentType]: fileID }))
        setFileList(prev => [...prev, {
          uid: fileID,
          name: file.name,
          status: 'done',
          url: fileID
        }])
        message.success('文件上传成功')
      }
      return false // 阻止默认上传
    } catch (error: any) {
      message.error(error.message || '上传失败')
      return false
    } finally {
      setLoading(false)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <Form form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="restaurantName"
                  label={t('pages.certification.apply.fields.restaurantName')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.restaurantNameRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.restaurantName')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="legalPerson"
                  label={t('pages.certification.apply.fields.legalPerson')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.legalPersonRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.legalPerson')} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="contactPhone"
                  label={t('pages.certification.apply.fields.contactPhone')}
                  rules={[{ required: true, message: t('pages.certification.apply.messages.contactPhoneRequired') }]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.contactPhone')} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="contactEmail"
                  label={t('pages.certification.apply.fields.contactEmail')}
                  rules={[
                    { required: true, message: t('pages.certification.apply.messages.contactEmailRequired') },
                    { type: 'email', message: t('pages.certification.apply.messages.emailInvalid') },
                  ]}
                >
                  <Input placeholder={t('pages.certification.apply.placeholders.contactEmail')} />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="address"
              label={t('pages.certification.apply.fields.address')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.addressRequired') }]}
            >
              <TextArea rows={3} placeholder={t('pages.certification.apply.placeholders.address')} />
            </Form.Item>
          </Form>
        )
      case 1:
        return (
          <div>
            <Space style={{ marginBottom: 16 }}>
              <Upload
                accept=".xlsx,.xls,.csv"
                beforeUpload={handleMenuImport}
                showUploadList={false}
              >
                <Button icon={<UploadOutlined />}>{t('pages.certification.apply.buttons.batchImportMenu')}</Button>
              </Upload>
              <Button 
                icon={<ImportOutlined />} 
                onClick={handleImportRecipes}
                loading={loading}
              >
                导入餐厅菜谱
              </Button>
              <Button type="primary" onClick={handleAddDish}>
                {t('pages.certification.apply.buttons.addDish')}
              </Button>
            </Space>
            <Table
              dataSource={menuItems}
              columns={[
                { 
                  title: t('pages.certification.apply.menuTable.columns.name'), 
                  dataIndex: 'name', 
                  key: 'name' 
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.ingredients'), 
                  dataIndex: 'ingredients', 
                  key: 'ingredients',
                  render: (text: any, record: MenuItem) => {
                    // 处理食材显示：确保正确格式化
                    // 优先使用record.ingredients，因为text可能是undefined或dataIndex的值
                    let ingredients = record.ingredients
                    
                    // 如果record.ingredients不存在，尝试使用text
                    if (!ingredients && text !== undefined && text !== null) {
                      ingredients = text
                    }
                    
                    // 调试日志：检查数据格式
                    if (ingredients && typeof ingredients !== 'string') {
                      console.log('食材列渲染 - 数据格式检查:', {
                        recordName: record.name,
                        ingredients,
                        ingredientsType: typeof ingredients,
                        isArray: Array.isArray(ingredients),
                        isObject: typeof ingredients === 'object',
                      })
                    }
                    
                    // 如果还是没有，返回默认值
                    if (!ingredients || ingredients === null || ingredients === undefined) {
                      return <span style={{ color: '#999' }}>-</span>
                    }
                    
                    // 如果是字符串，检查是否包含 [object Object]
                    if (typeof ingredients === 'string') {
                      // 如果字符串包含 [object Object]，说明数据有问题，需要重新处理
                      if (ingredients.includes('[object Object]')) {
                        console.warn('食材列渲染 - 检测到异常字符串格式:', {
                          recordName: record.name,
                          ingredients,
                        })
                        // 尝试从record中获取原始数据
                        // 如果record中有其他字段包含食材信息，可以尝试提取
                        return <span style={{ color: '#ff4d4f' }}>数据格式异常，请重新导入</span>
                      }
                      return ingredients.trim() || <span style={{ color: '#999' }}>-</span>
                    }
                    
                    // 如果是数组，转换为字符串
                    if (Array.isArray(ingredients)) {
                      const result = ingredients
                        .map((ing: any) => {
                          if (typeof ing === 'string') {
                            // 检查字符串是否包含 [object Object]
                            if (ing.includes('[object Object]')) {
                              return ''
                            }
                            return ing.trim()
                          }
                          if (ing && typeof ing === 'object' && ing !== null) {
                            // 尝试多种可能的字段名
                            const name = ing.name || ing.ingredientName || ing.ingredient
                            return name ? String(name).trim() : ''
                          }
                          return String(ing || '').trim()
                        })
                        .filter(Boolean)
                        .join(', ')
                      return result || <span style={{ color: '#999' }}>-</span>
                    }
                    
                    // 如果是对象，提取名称
                    if (typeof ingredients === 'object' && ingredients !== null) {
                      const name = ingredients.name || ingredients.ingredientName || ingredients.ingredient
                      return name ? String(name) : <span style={{ color: '#999' }}>-</span>
                    }
                    
                    // 其他情况转换为字符串
                    const str = String(ingredients)
                    // 如果转换后的字符串是 [object Object]，说明数据有问题
                    if (str === '[object Object]' || str.includes('[object Object]')) {
                      console.warn('食材列渲染 - 无法转换的食材数据:', {
                        recordName: record.name,
                        ingredients,
                        str,
                      })
                      return <span style={{ color: '#ff4d4f' }}>数据格式异常</span>
                    }
                    return str !== 'undefined' && str !== 'null' 
                      ? str 
                      : <span style={{ color: '#999' }}>-</span>
                  }
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.quantity'), 
                  dataIndex: 'quantity', 
                  key: 'quantity',
                  render: (quantity: number) => quantity || '-'
                },
                { 
                  title: t('pages.certification.apply.menuTable.columns.unit'), 
                  dataIndex: 'unit', 
                  key: 'unit',
                  render: (text: string) => text || '-'
                },
                {
                  title: t('pages.certification.apply.menuTable.columns.actions'),
                  key: 'action',
                  width: 150,
                  render: (_: any, record: MenuItem) => (
                    <Space>
                      <Button 
                        type="link" 
                        size="small"
                        onClick={() => handleEditDish(record)}
                      >
                        {t('common.edit')}
                      </Button>
                      <Button 
                        type="link" 
                        size="small" 
                        danger
                        onClick={() => handleDeleteDish(record.id)}
                      >
                        {t('common.delete')}
                      </Button>
                    </Space>
                  ),
                },
              ]}
              pagination={false}
              rowKey="id"
              locale={{
                emptyText: '暂无菜品，请点击"添加菜品"按钮添加'
              }}
            />
          </div>
        )
      case 2:
        return (
          <Form form={form} layout="vertical">
            <Space style={{ marginBottom: 16 }}>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadSuppliers}
                loading={loading}
                type="primary"
              >
                加载已有供应商信息
              </Button>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                从供应商管理模块加载当前餐厅关联的供应商信息
              </Text>
            </Space>
            <Form.Item
              name="supplierInfo"
              label={t('pages.certification.apply.fields.supplierInfo')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.supplierInfoRequired') }]}
            >
              <TextArea rows={4} placeholder={t('pages.certification.apply.placeholders.supplierInfo')} />
            </Form.Item>
            <Form.Item
              name="ingredientSource"
              label={t('pages.certification.apply.fields.ingredientSource')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.ingredientSourceRequired') }]}
            >
              <TextArea rows={4} placeholder={t('pages.certification.apply.placeholders.ingredientSource')} />
            </Form.Item>
            <Form.Item
              name="localIngredientRatio"
              label={t('pages.certification.apply.fields.localIngredientRatio')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.localIngredientRatioRequired') }]}
            >
              <Input
                type="number"
                placeholder={t('pages.certification.apply.placeholders.percentage')}
                addonAfter="%"
                min={0}
                max={100}
              />
            </Form.Item>
          </Form>
        )
      case 3:
        return (
          <Form form={form} layout="vertical">
            <Form.Item
              name="energyUsage"
              label={t('pages.certification.apply.fields.energyUsage')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.energyUsageRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.energyUsage')}
              />
            </Form.Item>
            <Form.Item
              name="wasteReduction"
              label={t('pages.certification.apply.fields.wasteReduction')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.wasteReductionRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.wasteReduction')}
              />
            </Form.Item>
            <Form.Item
              name="socialInitiatives"
              label={t('pages.certification.apply.fields.socialInitiatives')}
              rules={[{ required: true, message: t('pages.certification.apply.messages.socialInitiativesRequired') }]}
            >
              <TextArea
                rows={4}
                placeholder={t('pages.certification.apply.placeholders.socialInitiatives')}
              />
            </Form.Item>
          </Form>
        )
      case 4:
        return (
          <div>
            <Form form={form} layout="vertical">
              <Form.Item label={t('pages.certification.apply.documents.businessLicense')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.businessLicense === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'businessLicense')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.businessLicense
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.foodLicense')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.foodLicense === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'foodLicense')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.foodLicense
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.supplierCert')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.supplierCert === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'supplierCert')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.supplierCert
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.documents.otherDocuments')}>
                <Upload
                  fileList={fileList.filter(f => uploadedFiles.other === f.uid)}
                  beforeUpload={(file) => beforeUpload(file, 'other')}
                  accept=".pdf,.jpg,.jpeg,.png"
                  onRemove={() => {
                    setUploadedFiles(prev => {
                      const newFiles = { ...prev }
                      delete newFiles.other
                      return newFiles
                    })
                  }}
                >
                  <Button icon={<UploadOutlined />} loading={loading}>{t('common.upload')}</Button>
                </Upload>
              </Form.Item>
            </Form>
          </div>
        )
      case 5:
        return (
          <Card>
            <h3>{t('pages.certification.apply.preview.confirmMessage')}</h3>
            <Form form={form} layout="vertical">
              <Form.Item label={t('pages.certification.apply.fields.restaurantName')}>
                <Input disabled value={form.getFieldValue('restaurantName')} />
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.preview.contactInfo')}>
                <Input disabled value={form.getFieldValue('contactPhone')} />
              </Form.Item>
              <Form.Item label={t('pages.certification.apply.fields.address')}>
                <TextArea disabled rows={2} value={form.getFieldValue('address')} />
              </Form.Item>
            </Form>
          </Card>
        )
      default:
        return null
    }
  }

  const certificationLevelMap: Record<string, string> = {
    gold: t('pages.certification.apply.certificationLevels.gold'),
    silver: t('pages.certification.apply.certificationLevels.silver'),
    bronze: t('pages.certification.apply.certificationLevels.bronze'),
    platinum: t('pages.certification.apply.certificationLevels.platinum')
  }

  // 认证标准简要说明
  const standardSummary = [
    { dimension: '低碳菜品占比', requirement: '≥40%，核心菜品需提供碳足迹标签', weight: '40%' },
    { dimension: '食材与供应链', requirement: '本地或可追溯低碳食材占比 ≥30%', weight: '20%' },
    { dimension: '能源与运营', requirement: '年度能源强度下降 ≥10% 或绿色能源证明', weight: '10%' },
    { dimension: '食物浪费管理', requirement: '月度浪费减量目标 ≥15%', weight: '15%' },
    { dimension: '社会传播与教育', requirement: '不少于 3 项低碳倡导举措', weight: '15%' },
  ]

  return (
    <div>
      {/* 认证标准提示卡片 */}
      <Collapse
        defaultActiveKey={[]}
        style={{ marginBottom: 16 }}
        ghost
      >
        <Panel
          header={
            <Space>
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
              <Text strong>气候餐厅认证标准</Text>
              <Text type="secondary" style={{ fontSize: '12px', marginLeft: 8 }}>
                点击查看详细标准要求
              </Text>
            </Space>
          }
          key="1"
        >
          <Card size="small" style={{ marginTop: 8 }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <div>
                <Text strong>达标标准：</Text>
                <ul style={{ marginTop: 8, marginBottom: 0, paddingLeft: 20 }}>
                  <li>所有达标项必须全部满足</li>
                  <li>系统自动评估得分 ≥ 80 分（满分 100 分）</li>
                  <li>人工抽检无重大风险项</li>
                </ul>
              </div>
              <div>
                <Text strong>五大维度评估标准：</Text>
                <Row gutter={[8, 8]} style={{ marginTop: 8 }}>
                  {standardSummary.map((item, index) => (
                    <Col span={24} key={index}>
                      <Card size="small" style={{ background: '#f5f5f5' }}>
                        <Space>
                          <Text strong>{item.dimension}</Text>
                          <Tag color="blue">{item.weight}</Tag>
                          <Text type="secondary">{item.requirement}</Text>
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <Link to="/certification/standard">
                  <Button type="link" size="small">
                    查看详细标准说明 →
                  </Button>
                </Link>
              </div>
            </Space>
          </Card>
        </Panel>
      </Collapse>

      {!currentRestaurantId && restaurants.length > 1 && (
        <Alert
          message={t('pages.certification.apply.alerts.selectRestaurant')}
          description={
            <div style={{ marginTop: 8 }}>
              <Select
                placeholder={t('pages.certification.apply.placeholders.selectRestaurant')}
                style={{ width: 300 }}
                value={selectedRestaurantId}
                onChange={setSelectedRestaurantId}
              >
                {restaurants.map((restaurant: any) => (
                  <Select.Option key={restaurant.id} value={restaurant.id}>
                    {restaurant.name}
                    {restaurant.certificationStatus === 'certified' && (
                      <span style={{ color: '#52c41a', marginLeft: 8 }}>（{t('pages.certification.apply.status.certified')}）</span>
                    )}
                  </Select.Option>
                ))}
              </Select>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {currentRestaurant && currentRestaurant.certificationStatus === 'trial' && (
        <Alert
          message="试运营状态"
          description={
            <div>
              <div>您的餐厅正在试运营期间，系统已自动填充试运营期间积累的数据。</div>
              {trialData?.trialPeriod && (
                <div style={{ marginTop: 8 }}>
                  {trialData.trialPeriod.daysRemaining !== null && (
                    <div>
                      {trialData.trialPeriod.daysRemaining > 0 ? (
                        <span style={{ color: '#1890ff' }}>
                          试运营剩余天数：{trialData.trialPeriod.daysRemaining} 天
                        </span>
                      ) : (
                        <span style={{ color: '#ff4d4f' }}>
                          试运营已到期，请尽快提交认证申请
                        </span>
                      )}
                    </div>
                  )}
                  {trialData.trialPeriod.startDate && (
                    <div style={{ marginTop: 4, fontSize: '12px', color: '#999' }}>
                      试运营开始：{new Date(trialData.trialPeriod.startDate).toLocaleDateString()}
                      {trialData.trialPeriod.endDate && (
                        <> | 结束：{new Date(trialData.trialPeriod.endDate).toLocaleDateString()}</>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {currentRestaurant && currentRestaurant.certificationStatus === 'certified' && (
        <Alert
          message={t('pages.certification.apply.alerts.restaurantCertified', { name: currentRestaurant.name })}
          description={t('pages.certification.apply.alerts.currentLevel', { level: certificationLevelMap[currentRestaurant.certificationLevel] || currentRestaurant.certificationLevel })}
          type="success"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Steps current={currentStep} style={{ marginBottom: 32 }}>
          {steps.map((step, index) => (
            <Step key={index} title={step.title} description={step.description} />
          ))}
        </Steps>

        <div style={{ minHeight: 400, marginBottom: 24 }}>
          {renderStepContent()}
        </div>

        <div style={{ textAlign: 'right' }}>
          <Space>
            {currentStep > 0 && (
              <Button onClick={handlePrev}>{t('common.previous')}</Button>
            )}
            <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={loading}>
              {t('pages.certification.apply.buttons.saveDraft')}
            </Button>
            {currentStep < steps.length - 1 ? (
              <Button type="primary" onClick={handleNext}>
                {t('common.next')}
              </Button>
            ) : (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                onClick={handleSubmit}
                loading={loading}
              >
                {t('pages.certification.apply.buttons.submit')}
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* 添加/编辑菜品Modal */}
      <Modal
        title={editingDish ? '编辑菜品' : '添加菜品'}
        open={dishModalVisible}
        onOk={handleSaveDish}
        onCancel={() => {
          setDishModalVisible(false)
          dishForm.resetFields()
          setEditingDish(null)
        }}
        width={600}
        destroyOnClose
      >
        <Form
          form={dishForm}
          layout="vertical"
          initialValues={{
            unit: 'g',
            cookingMethod: 'steamed',
          }}
        >
          <Form.Item
            name="name"
            label="菜品名称"
            rules={[{ required: true, message: '请输入菜品名称' }]}
          >
            <Input placeholder="请输入菜品名称，如：麻婆豆腐" />
          </Form.Item>

          <Form.Item
            name="ingredients"
            label="食材（用逗号分隔）"
            rules={[{ required: true, message: '请输入食材' }]}
            extra="多个食材请用逗号分隔，如：豆腐,豆瓣酱,花椒"
          >
            <Input.TextArea 
              rows={3} 
              placeholder="请输入食材，多个食材用逗号分隔"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="quantity"
                label="数量"
                rules={[
                  { required: true, message: '请输入数量' },
                  { type: 'number', min: 0.01, message: '数量必须大于0' },
                ]}
              >
                <InputNumber
                  style={{ width: '100%' }}
                  placeholder="请输入数量"
                  min={0.01}
                  precision={2}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="unit"
                label="单位"
                rules={[{ required: true, message: '请选择单位' }]}
              >
                <Select placeholder="请选择单位">
                  <Option value="g">克(g)</Option>
                  <Option value="kg">千克(kg)</Option>
                  <Option value="ml">毫升(ml)</Option>
                  <Option value="l">升(l)</Option>
                  <Option value="个">个</Option>
                  <Option value="份">份</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="cookingMethod"
            label="烹饪方式"
            rules={[{ required: true, message: '请选择烹饪方式' }]}
          >
            <Select placeholder="请选择烹饪方式">
              <Option value="raw">生食</Option>
              <Option value="steamed">蒸</Option>
              <Option value="boiled">煮</Option>
              <Option value="stir_fried">炒</Option>
              <Option value="fried">炸</Option>
              <Option value="baked">烤</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default CertificationApply

