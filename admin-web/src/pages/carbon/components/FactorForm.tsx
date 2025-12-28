/**
 * 碳排放因子表单组件
 */
import { ingredientStandardAPI } from '@/services/ingredientStandard'
import { regionConfigAPI, type RegionConfig } from '@/services/regionConfig'
import { FactorBoundary, FactorCategory, FactorSource, FactorStatus } from '@/types/factor'
import type { FormInstance } from 'antd'
import { AutoComplete, Col, Form, Input, InputNumber, Row, Select, Spin, Tag } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const { Option } = Select
const { TextArea } = Input

interface FactorFormProps {
  form: FormInstance
  initialValues?: any
  onValuesChange?: (changedValues: any, allValues: any) => void
}

const FactorForm: React.FC<FactorFormProps> = ({
  form,
  initialValues,
  onValuesChange,
}) => {
  const { t } = useTranslation()
  const [regionOptions, setRegionOptions] = useState<Array<{ value: string; label: string }>>([])
  const [loadingRegions, setLoadingRegions] = useState(false)
  
  // 基础食材库选项（用于食材因子）
  const [standardOptions, setStandardOptions] = useState<Array<{ value: string; label: string; category: string }>>([])
  const [loadingStandards, setLoadingStandards] = useState(false)
  const [categoryMap, setCategoryMap] = useState<Map<string, string>>(new Map()) // categoryCode -> factorSubCategory

  // 监听表单的category和subCategory变化
  const category = Form.useWatch('category', form)
  const subCategory = Form.useWatch('subCategory', form)
  const name = Form.useWatch('name', form)

  // 根据分类加载区域选项
  useEffect(() => {
    const loadRegionOptions = async () => {
      // 如果category或subCategory未选择，不加载
      if (!category) {
        setRegionOptions([])
        return
      }

      setLoadingRegions(true)
      try {
        let options: Array<{ value: string; label: string }> = []

        // 能源分类：电力使用电网区域，燃气使用国家级别
        if (category === FactorCategory.ENERGY) {
          if (subCategory === 'electricity') {
            // 电力：加载电网区域选项（factor_region，level=2，parentCode=CN）
            const result = await regionConfigAPI.list({
              configType: 'factor_region',
              status: 'active',
              parentCode: 'CN',
              pageSize: 100
            })
            const regions = Array.isArray(result.data) ? result.data : []
            options = regions
              .filter((r: RegionConfig) => r.level === 2) // 只取子区域
              .sort((a: RegionConfig, b: RegionConfig) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((r: RegionConfig) => ({
                value: r.code,
                label: r.name
              }))
          } else {
            // 燃气或其他能源：加载国家级别选项（factor_region，level=1）
            const result = await regionConfigAPI.list({
              configType: 'factor_region',
              status: 'active',
              pageSize: 100
            })
            const regions = Array.isArray(result.data) ? result.data : []
            options = regions
              .filter((r: RegionConfig) => r.level === 1) // 只取国家级别
              .sort((a: RegionConfig, b: RegionConfig) => (a.sortOrder || 0) - (b.sortOrder || 0))
              .map((r: RegionConfig) => ({
                value: r.code,
                label: r.name
              }))
          }
        } else {
          // 其他分类（食材、材料、运输）：加载国家级别选项
          const result = await regionConfigAPI.list({
            configType: 'factor_region',
            status: 'active',
            pageSize: 100
          })
          const regions = Array.isArray(result.data) ? result.data : []
          options = regions
            .filter((r: RegionConfig) => r.level === 1) // 只取国家级别
            .sort((a: RegionConfig, b: RegionConfig) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .map((r: RegionConfig) => ({
              value: r.code,
              label: r.name
            }))
        }

        setRegionOptions(options)

        // 如果当前region值不在新选项中，清空region字段
        const currentRegion = form.getFieldValue('region')
        if (currentRegion && !options.find(opt => opt.value === currentRegion)) {
          form.setFieldsValue({ region: undefined })
        }
      } catch (error) {
        console.error('加载区域选项失败:', error)
        setRegionOptions([])
      } finally {
        setLoadingRegions(false)
      }
    }

    loadRegionOptions()
  }, [category, subCategory, form])

  // 加载食材类别映射（用于将category映射到factorSubCategory）
  useEffect(() => {
    const loadCategoryMap = async () => {
      if (category !== FactorCategory.INGREDIENT) {
        setCategoryMap(new Map())
        return
      }
      
      try {
        const result = await ingredientStandardAPI.category.list({
          status: 'active',
          pageSize: 1000
        })
        if (result?.code === 0 && result.data?.list) {
          const map = new Map<string, string>()
          result.data.list.forEach((cat: any) => {
            if (cat.mapping?.factorSubCategory) {
              map.set(cat.categoryCode, cat.mapping.factorSubCategory)
            }
          })
          setCategoryMap(map)
        }
      } catch (error) {
        console.error('加载类别映射失败:', error)
      }
    }
    loadCategoryMap()
  }, [category])

  // 加载基础食材库选项（当选择食材分类时）
  useEffect(() => {
    const loadStandards = async () => {
      if (category !== FactorCategory.INGREDIENT) {
        setStandardOptions([])
        return
      }

      setLoadingStandards(true)
      try {
        const result = await ingredientStandardAPI.standard.list({
          status: 'active',
          pageSize: 1000
        })
        
        if (result?.code === 0 && result.data) {
          const standards = result.data.data || result.data.list || []
          const options = standards.map((std: any) => ({
            value: std.standardName,
            label: std.standardName,
            category: std.category
          }))
          setStandardOptions(options)
        }
      } catch (error) {
        console.error('加载基础食材库失败:', error)
        setStandardOptions([])
      } finally {
        setLoadingStandards(false)
      }
    }
    loadStandards()
  }, [category])

  // 当选择基础食材库中的标准名称时，自动填充subCategory
  const handleStandardSelect = async (value: string) => {
    if (category !== FactorCategory.INGREDIENT) return
    
    try {
      const result = await ingredientStandardAPI.standard.get(value)
      if (result?.code === 0 && result.data) {
        const standard = result.data
        // 从标准名称的category映射到factorSubCategory
        const factorSubCategory = categoryMap.get(standard.category)
        if (factorSubCategory) {
          form.setFieldsValue({
            name: value,
            subCategory: factorSubCategory
          })
          // 触发onValuesChange
          if (onValuesChange) {
            const allValues = form.getFieldsValue()
            onValuesChange({ name: value, subCategory: factorSubCategory }, { ...allValues, name: value, subCategory: factorSubCategory })
          }
        } else {
          // 如果找不到映射，只设置名称
          form.setFieldsValue({ name: value })
          if (onValuesChange) {
            const allValues = form.getFieldsValue()
            onValuesChange({ name: value }, { ...allValues, name: value })
          }
        }
      }
    } catch (error) {
      console.error('获取标准名称详情失败:', error)
      // 即使获取失败，也设置名称
      form.setFieldsValue({ name: value })
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={onValuesChange}
    >
      {/* 基本信息 */}
      <div style={{ marginBottom: 24 }}>
        <h3>{t('pages.carbon.factorForm.sections.basicInfo')}</h3>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label={t('pages.carbon.factorForm.fields.name')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.nameRequired') }]}
              tooltip={category === FactorCategory.INGREDIENT ? '食材因子必须从基础食材库中选择标准名称' : undefined}
            >
              {category === FactorCategory.INGREDIENT ? (
                <Spin spinning={loadingStandards}>
                  <AutoComplete
                    options={standardOptions.map(opt => ({
                      value: opt.value,
                      label: opt.label
                    }))}
                    placeholder="从基础食材库中选择标准名称"
                    onSelect={handleStandardSelect}
                    onChange={(value) => {
                      form.setFieldsValue({ name: value })
                      if (onValuesChange) {
                        const allValues = form.getFieldsValue()
                        onValuesChange({ name: value }, { ...allValues, name: value })
                      }
                    }}
                    value={name}
                    filterOption={(inputValue, option) =>
                      option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                    }
                    allowClear
                  />
                </Spin>
              ) : (
                <Input placeholder={t('pages.carbon.factorForm.placeholders.name')} />
              )}
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="factorId"
              label={t('pages.carbon.factorForm.fields.factorId')}
              tooltip={t('pages.carbon.factorForm.tooltips.factorId')}
            >
              <Input placeholder={t('pages.carbon.factorForm.placeholders.factorId')} disabled />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="category"
              label={t('pages.carbon.factorForm.fields.category')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.categoryRequired') }]}
            >
              <Select placeholder={t('pages.carbon.factorForm.placeholders.category')}>
                <Option value={FactorCategory.INGREDIENT}>{t('pages.carbon.factorLibrary.categories.ingredient')}</Option>
                <Option value={FactorCategory.ENERGY}>{t('pages.carbon.factorLibrary.categories.energy')}</Option>
                <Option value={FactorCategory.MATERIAL}>{t('pages.carbon.factorLibrary.categories.material')}</Option>
                <Option value={FactorCategory.TRANSPORT}>{t('pages.carbon.factorLibrary.categories.transport')}</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="subCategory"
              label={t('pages.carbon.factorForm.fields.subCategory')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.subCategoryRequired') }]}
              tooltip={category === FactorCategory.INGREDIENT ? '选择基础食材库中的标准名称后会自动填充' : undefined}
            >
              <Input 
                placeholder={category === FactorCategory.INGREDIENT ? '选择标准名称后自动填充' : t('pages.carbon.factorForm.placeholders.subCategory')} 
                disabled={category === FactorCategory.INGREDIENT}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="alias"
          label={t('pages.carbon.factorForm.fields.alias')}
          tooltip={t('pages.carbon.factorForm.tooltips.alias')}
        >
          <Select
            mode="tags"
            placeholder={t('pages.carbon.factorForm.placeholders.alias')}
            tokenSeparators={[',', ' ']}
          />
        </Form.Item>
      </div>

      {/* 因子数值 */}
      <div style={{ marginBottom: 24 }}>
        <h3>{t('pages.carbon.factorForm.sections.factorValue')}</h3>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="factorValue"
              label={t('pages.carbon.factorForm.fields.factorValue')}
              rules={[
                { required: true, message: t('pages.carbon.factorForm.validation.factorValueRequired') },
                { type: 'number', min: 0, message: t('pages.carbon.factorForm.validation.factorValueMin') },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t('pages.carbon.factorForm.placeholders.factorValue')}
                precision={2}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="unit"
              label={t('pages.carbon.factorForm.fields.unit')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.unitRequired') }]}
            >
              <Select placeholder={t('pages.carbon.factorForm.placeholders.unit')}>
                <Option value="kgCO2e/kg">kgCO₂e/kg</Option>
                <Option value="kgCO2e/kWh">kgCO₂e/kWh</Option>
                <Option value="kgCO2e/tkm">kgCO₂e/tkm</Option>
                <Option value="kgCO2e/m³">kgCO₂e/m³</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="uncertainty"
              label={t('pages.carbon.factorForm.fields.uncertainty')}
              tooltip={t('pages.carbon.factorForm.tooltips.uncertainty')}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t('pages.carbon.factorForm.placeholders.uncertainty')}
                precision={1}
                min={0}
                max={100}
                addonAfter="%"
              />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 适用范围与来源 */}
      <div style={{ marginBottom: 24 }}>
        <h3>{t('pages.carbon.factorForm.sections.sourceRegion')}</h3>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="region"
              label={t('pages.carbon.factorForm.fields.region')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.regionRequired') }]}
              tooltip={
                category === FactorCategory.ENERGY && subCategory === 'electricity'
                  ? '电力因子需要使用电网区域配置，以精确匹配不同区域的电网排放因子'
                  : category === FactorCategory.ENERGY
                  ? '燃气因子使用国家级别配置'
                  : '其他因子使用国家级别配置'
              }
            >
              <Select 
                placeholder={t('pages.carbon.factorForm.placeholders.region')}
                loading={loadingRegions}
                disabled={loadingRegions || !category}
              >
                {regionOptions.map(option => (
                  <Option key={option.value} value={option.value}>
                    {option.label}
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="source"
              label={t('pages.carbon.factorForm.fields.source')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.sourceRequired') }]}
            >
              <Select placeholder={t('pages.carbon.factorForm.placeholders.source')}>
                <Option value={FactorSource.CLCD}>CLCD</Option>
                <Option value={FactorSource.IPCC}>IPCC</Option>
                <Option value={FactorSource.CPCD}>CPCD</Option>
                <Option value={FactorSource.ECOINVENT}>Ecoinvent</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="year"
              label={t('pages.carbon.factorForm.fields.year')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.yearRequired') }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder={t('pages.carbon.factorForm.placeholders.year')}
                min={2000}
                max={2100}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="version"
              label={t('pages.carbon.factorForm.fields.version')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.versionRequired') }]}
            >
              <Input placeholder={t('pages.carbon.factorForm.placeholders.version')} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="boundary"
              label={t('pages.carbon.factorForm.fields.boundary')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.boundaryRequired') }]}
            >
              <Select placeholder={t('pages.carbon.factorForm.placeholders.boundary')}>
                <Option value={FactorBoundary.CRADLE_TO_GATE}>{t('pages.carbon.factorForm.options.cradleToGate')}</Option>
                <Option value={FactorBoundary.CRADLE_TO_FARM}>{t('pages.carbon.factorForm.options.cradleToFarm')}</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="status"
              label={t('pages.carbon.factorForm.fields.status')}
              rules={[{ required: true, message: t('pages.carbon.factorForm.validation.statusRequired') }]}
            >
              <Select placeholder={t('pages.carbon.factorForm.placeholders.status')}>
                <Option value={FactorStatus.ACTIVE}>
                  <Tag color="success">{t('pages.carbon.factorLibrary.status.active')}</Tag>
                </Option>
                <Option value={FactorStatus.DRAFT}>
                  <Tag color="warning">{t('pages.carbon.factorLibrary.status.draft')}</Tag>
                </Option>
                <Option value={FactorStatus.ARCHIVED}>
                  <Tag color="default">{t('pages.carbon.factorLibrary.status.archived')}</Tag>
                </Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label={t('pages.carbon.factorForm.fields.notes')}>
          <TextArea rows={3} placeholder={t('pages.carbon.factorForm.placeholders.notes')} />
        </Form.Item>
      </div>
    </Form>
  )
}

export default FactorForm

