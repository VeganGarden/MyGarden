/**
 * 碳排放因子表单组件
 */
import { regionConfigAPI, type RegionConfig } from '@/services/regionConfig'
import { FactorBoundary, FactorCategory, FactorSource, FactorStatus } from '@/types/factor'
import type { FormInstance } from 'antd'
import { Col, Form, Input, InputNumber, Row, Select, Tag } from 'antd'
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

  // 监听表单的category和subCategory变化
  const category = Form.useWatch('category', form)
  const subCategory = Form.useWatch('subCategory', form)

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
            >
              <Input placeholder={t('pages.carbon.factorForm.placeholders.name')} />
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
            >
              <Input placeholder={t('pages.carbon.factorForm.placeholders.subCategory')} />
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

