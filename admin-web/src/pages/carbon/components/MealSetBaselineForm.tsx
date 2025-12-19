/**
 * 一餐饭基准值表单组件
 */
import type { MealSetBaselineFormData } from '@/types/meal-set-baseline'
import { Region, EnergyType, SourceType } from '@/types/baseline'
import { MealTime, MealStructure, HasSoup, RestaurantType, ConsumptionScenario, ResearchStatus } from '@/types/meal-set-baseline'
import { Form, Input, InputNumber, Select, DatePicker, Checkbox, Space, Card, Divider, Alert } from 'antd'
import React, { useEffect } from 'react'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface MealSetBaselineFormProps {
  form: any
  initialValues?: Partial<MealSetBaselineFormData>
  onSubmit?: (values: MealSetBaselineFormData) => void
  onValuesChange?: (changedValues: any, allValues: any) => void
}

const MealSetBaselineForm: React.FC<MealSetBaselineFormProps> = ({
  form,
  initialValues,
  onSubmit,
  onValuesChange
}) => {
  // 自动计算置信区间
  const calculateConfidenceInterval = (value: number, uncertainty: number) => {
    return {
      lower: Math.max(0, value - uncertainty),
      upper: value + uncertainty
    }
  }

  // 自动计算分解数据总和
  const calculateBreakdownSum = (breakdown: any) => {
    if (!breakdown) return 0
    return (
      (breakdown.mainDishes || 0) +
      (breakdown.stapleFood || 0) +
      (breakdown.soup || 0) +
      (breakdown.dessert || 0) +
      (breakdown.beverage || 0) +
      (breakdown.sideDishes || 0) +
      (breakdown.condiments || 0) +
      (breakdown.cookingEnergy || 0) +
      (breakdown.packaging || 0) +
      (breakdown.transport || 0) +
      (breakdown.other || 0)
    )
  }

  // 根据区域自动判断是否有汤
  const handleRegionChange = (region: string) => {
    if (region === Region.SOUTH_CHINA) {
      // 华南地区（广东）默认有汤
      form.setFieldsValue({
        'category.hasSoup': HasSoup.WITH_SOUP
      })
    }
  }

  // 自动生成结构描述
  const generateStructureDescription = (typicalStructure: any) => {
    if (!typicalStructure) return ''
    
    const parts = []
    if (typicalStructure.mainDishesCount) {
      parts.push(`${typicalStructure.mainDishesCount}道主菜`)
    }
    if (typicalStructure.stapleFoodType) {
      parts.push(typicalStructure.stapleFoodType)
    }
    if (typicalStructure.hasSoup) {
      parts.push('汤')
    }
    if (typicalStructure.hasDessert) {
      parts.push('甜点')
    }
    
    return parts.join('+') || ''
  }


  // 处理表单值变化
  const handleFormValuesChange = (changedValues: any, allValues: any) => {
    // 自动计算置信区间
    if (changedValues.carbonFootprint?.value !== undefined || 
        changedValues.carbonFootprint?.uncertainty !== undefined) {
      const value = allValues.carbonFootprint?.value || 0
      const uncertainty = allValues.carbonFootprint?.uncertainty || 0
      
      if (value > 0 && uncertainty >= 0) {
        const interval = calculateConfidenceInterval(value, uncertainty)
        form.setFieldsValue({
          carbonFootprint: {
            ...allValues.carbonFootprint,
            confidenceInterval: interval
          }
        })
      }
    }

    // 自动生成结构描述
    if (changedValues.typicalStructure) {
      const typicalStructure = allValues.typicalStructure
      if (typicalStructure) {
        const description = generateStructureDescription(typicalStructure)
        // 避免无限循环，只在描述变化时更新
        if (description !== typicalStructure.description) {
          form.setFieldsValue({
            typicalStructure: {
              ...typicalStructure,
              description
            }
          })
        }
      }
    }

    // 调用外部onValuesChange回调
    if (onValuesChange) {
      onValuesChange(changedValues, allValues)
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={{
        ...initialValues,
        usage: {
          isForCalculation: false,
          researchStatus: ResearchStatus.RESEARCHING,
          notes: '',
          ...initialValues?.usage
        }
      }}
      onFinish={onSubmit}
      onValuesChange={handleFormValuesChange}
    >
      {/* 基本信息 */}
      <Card title="分类信息" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          label="餐次类型"
          name={['category', 'mealTime']}
          rules={[{ required: true, message: '请选择餐次类型' }]}
        >
          <Select placeholder="请选择餐次类型">
            <Option value={MealTime.BREAKFAST}>早餐</Option>
            <Option value={MealTime.LUNCH}>午餐</Option>
            <Option value={MealTime.DINNER}>晚餐</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="区域"
          name={['category', 'region']}
          rules={[{ required: true, message: '请选择区域' }]}
        >
          <Select 
            placeholder="请选择区域"
            onChange={handleRegionChange}
          >
            <Option value={Region.NORTH_CHINA}>华北</Option>
            <Option value={Region.NORTHEAST}>东北</Option>
            <Option value={Region.EAST_CHINA}>华东</Option>
            <Option value={Region.CENTRAL_CHINA}>华中</Option>
            <Option value={Region.NORTHWEST}>西北</Option>
            <Option value={Region.SOUTH_CHINA}>华南</Option>
            <Option value={Region.NATIONAL_AVERAGE}>全国平均</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="用能方式"
          name={['category', 'energyType']}
          rules={[{ required: true, message: '请选择用能方式' }]}
        >
          <Select placeholder="请选择用能方式">
            <Option value={EnergyType.ELECTRIC}>全电</Option>
            <Option value={EnergyType.GAS}>燃气</Option>
            <Option value={EnergyType.MIXED}>混合</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="一餐饭结构类型"
          name={['category', 'mealStructure']}
          tooltip="可选，建议填写以提高数据可信度"
        >
          <Select placeholder="请选择结构类型（可选）" allowClear>
            <Option value={MealStructure.SIMPLE}>简餐</Option>
            <Option value={MealStructure.STANDARD}>标准餐</Option>
            <Option value={MealStructure.FULL}>正餐</Option>
            <Option value={MealStructure.BANQUET}>宴席</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="是否有汤"
          name={['category', 'hasSoup']}
          tooltip="可选，建议填写以提高数据可信度"
        >
          <Select placeholder="请选择是否有汤（可选）" allowClear>
            <Option value={HasSoup.WITH_SOUP}>有汤</Option>
            <Option value={HasSoup.WITHOUT_SOUP}>无汤</Option>
            <Option value={HasSoup.OPTIONAL}>可选</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="餐厅类型"
          name={['category', 'restaurantType']}
          tooltip="可选"
        >
          <Select placeholder="请选择餐厅类型（可选）" allowClear>
            <Option value={RestaurantType.FAST_FOOD}>快餐店</Option>
            <Option value={RestaurantType.FORMAL}>正餐厅</Option>
            <Option value={RestaurantType.BUFFET}>自助餐</Option>
            <Option value={RestaurantType.HOTPOT}>火锅店</Option>
            <Option value={RestaurantType.OTHER}>其他</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="消费场景"
          name={['category', 'consumptionScenario']}
          tooltip="可选"
        >
          <Select placeholder="请选择消费场景（可选）" allowClear>
            <Option value={ConsumptionScenario.DINE_IN}>堂食</Option>
            <Option value={ConsumptionScenario.TAKEAWAY}>外卖</Option>
            <Option value={ConsumptionScenario.PACKAGED}>打包</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="城市"
          name={['category', 'city']}
          tooltip="可选，用于进一步细分"
        >
          <Input placeholder="请输入城市（可选）" />
        </Form.Item>
      </Card>

      {/* 基准值数据 */}
      <Card title="基准值数据" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          label="基准值 (kg CO₂e)"
          name={['carbonFootprint', 'value']}
          rules={[
            { required: true, message: '请输入基准值' },
            { type: 'number', min: 0, message: '基准值必须大于0' }
          ]}
        >
          <InputNumber
            placeholder="请输入基准值"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="不确定性 (kg CO₂e)"
          name={['carbonFootprint', 'uncertainty']}
          rules={[
            { required: true, message: '请输入不确定性' },
            { type: 'number', min: 0, message: '不确定性必须大于等于0' }
          ]}
        >
          <InputNumber
            placeholder="请输入不确定性"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="置信区间下限 (kg CO₂e)"
          name={['carbonFootprint', 'confidenceInterval', 'lower']}
          tooltip="将根据基准值和不确定性自动计算"
        >
          <InputNumber
            placeholder="将自动计算"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="置信区间上限 (kg CO₂e)"
          name={['carbonFootprint', 'confidenceInterval', 'upper']}
          tooltip="将根据基准值和不确定性自动计算"
        >
          <InputNumber
            placeholder="将自动计算"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>
      </Card>

      {/* 分解数据 */}
      <Card title="分解数据" size="small" style={{ marginBottom: 16 }}>
        <Alert
          message="分解数据总和应与基准值一致"
          type="info"
          style={{ marginBottom: 16 }}
        />
        
        <Form.Item
          label="主菜碳排放 (kg CO₂e)"
          name={['breakdown', 'mainDishes']}
          rules={[{ required: true, message: '请输入主菜碳排放' }]}
        >
          <InputNumber
            placeholder="请输入主菜碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="主食碳排放 (kg CO₂e)"
          name={['breakdown', 'stapleFood']}
          rules={[{ required: true, message: '请输入主食碳排放' }]}
        >
          <InputNumber
            placeholder="请输入主食碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="汤类碳排放 (kg CO₂e)"
          name={['breakdown', 'soup']}
          rules={[{ required: true, message: '请输入汤类碳排放' }]}
        >
          <InputNumber
            placeholder="请输入汤类碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="甜点碳排放 (kg CO₂e)"
          name={['breakdown', 'dessert']}
          rules={[{ required: true, message: '请输入甜点碳排放' }]}
        >
          <InputNumber
            placeholder="请输入甜点碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="饮品碳排放 (kg CO₂e)"
          name={['breakdown', 'beverage']}
          rules={[{ required: true, message: '请输入饮品碳排放' }]}
        >
          <InputNumber
            placeholder="请输入饮品碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="配菜碳排放 (kg CO₂e)"
          name={['breakdown', 'sideDishes']}
          rules={[{ required: true, message: '请输入配菜碳排放' }]}
        >
          <InputNumber
            placeholder="请输入配菜碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="调料碳排放 (kg CO₂e)"
          name={['breakdown', 'condiments']}
          rules={[{ required: true, message: '请输入调料碳排放' }]}
        >
          <InputNumber
            placeholder="请输入调料碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="烹饪能耗碳排放 (kg CO₂e)"
          name={['breakdown', 'cookingEnergy']}
          rules={[{ required: true, message: '请输入烹饪能耗碳排放' }]}
        >
          <InputNumber
            placeholder="请输入烹饪能耗碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="包装碳排放 (kg CO₂e)"
          name={['breakdown', 'packaging']}
          rules={[{ required: true, message: '请输入包装碳排放' }]}
        >
          <InputNumber
            placeholder="请输入包装碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="运输碳排放 (kg CO₂e)"
          name={['breakdown', 'transport']}
          rules={[{ required: true, message: '请输入运输碳排放' }]}
          tooltip="外卖场景时填写"
        >
          <InputNumber
            placeholder="请输入运输碳排放（外卖场景）"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="其他碳排放 (kg CO₂e)"
          name={['breakdown', 'other']}
          rules={[{ required: true, message: '请输入其他碳排放' }]}
        >
          <InputNumber
            placeholder="请输入其他碳排放"
            style={{ width: '100%' }}
            precision={2}
            min={0}
          />
        </Form.Item>
      </Card>

      {/* 典型结构 */}
      <Card title="典型结构" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          label="主菜数量"
          name={['typicalStructure', 'mainDishesCount']}
          rules={[{ required: true, message: '请输入主菜数量' }]}
        >
          <InputNumber
            placeholder="请输入主菜数量"
            style={{ width: '100%' }}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="主食类型"
          name={['typicalStructure', 'stapleFoodType']}
          rules={[{ required: true, message: '请输入主食类型' }]}
        >
          <Input placeholder="例如：米饭、面条、馒头" />
        </Form.Item>

        <Form.Item
          label="是否有汤"
          name={['typicalStructure', 'hasSoup']}
          valuePropName="checked"
        >
          <Checkbox>有汤</Checkbox>
        </Form.Item>

        <Form.Item
          label="是否有甜点"
          name={['typicalStructure', 'hasDessert']}
          valuePropName="checked"
        >
          <Checkbox>有甜点</Checkbox>
        </Form.Item>

        <Form.Item
          label="总菜品数量"
          name={['typicalStructure', 'totalItems']}
          rules={[{ required: true, message: '请输入总菜品数量' }]}
        >
          <InputNumber
            placeholder="请输入总菜品数量"
            style={{ width: '100%' }}
            min={0}
          />
        </Form.Item>

        <Form.Item
          label="结构描述"
          name={['typicalStructure', 'description']}
          rules={[{ required: true, message: '请输入结构描述' }]}
          tooltip="例如：2道主菜+米饭+汤"
        >
          <Input placeholder="例如：2道主菜+米饭+汤" />
        </Form.Item>
      </Card>

      {/* 数据来源 */}
      <Card title="数据来源" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          label="来源类型"
          name={['source', 'type']}
          rules={[{ required: true, message: '请选择来源类型' }]}
        >
          <Select placeholder="请选择来源类型">
            <Option value={SourceType.INDUSTRY_STATISTICS}>行业统计</Option>
            <Option value={SourceType.ACADEMIC_RESEARCH}>学术研究</Option>
            <Option value={SourceType.THIRD_PARTY}>第三方机构</Option>
            <Option value={SourceType.ESTIMATION}>估算</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="机构名称"
          name={['source', 'organization']}
          rules={[{ required: true, message: '请输入机构名称' }]}
        >
          <Input placeholder="请输入机构名称" />
        </Form.Item>

        <Form.Item
          label="报告名称"
          name={['source', 'report']}
          rules={[{ required: true, message: '请输入报告名称' }]}
        >
          <Input placeholder="请输入报告名称" />
        </Form.Item>

        <Form.Item
          label="年份"
          name={['source', 'year']}
          rules={[{ required: true, message: '请输入年份' }]}
        >
          <InputNumber
            placeholder="请输入年份"
            style={{ width: '100%' }}
            min={2000}
            max={2100}
          />
        </Form.Item>

        <Form.Item
          label="计算方法"
          name={['source', 'methodology']}
          rules={[{ required: true, message: '请输入计算方法' }]}
        >
          <TextArea
            placeholder="请输入计算方法"
            rows={3}
          />
        </Form.Item>
      </Card>

      {/* 版本信息 */}
      <Card title="版本信息" size="small" style={{ marginBottom: 16 }}>
        <Form.Item
          label="版本号"
          name="version"
          rules={[{ required: true, message: '请输入版本号' }]}
          tooltip="格式：YYYY.MM，如：2024.01"
        >
          <Input placeholder="例如：2024.01" />
        </Form.Item>

        <Form.Item
          label="有效日期"
          name="effectiveDate"
          rules={[{ required: true, message: '请选择有效日期' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Form.Item>

        <Form.Item
          label="失效日期"
          name="expiryDate"
          rules={[{ required: true, message: '请选择失效日期' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
          />
        </Form.Item>
      </Card>

      {/* 使用设置 */}
      <Card title="使用设置" size="small" style={{ marginBottom: 16 }}>
        <Alert
          message="重要提示"
          description="一餐饭基准值默认不用于计算，仅作为参考数据。只有在数据验证完成且观察期结束后，才可以启用计算功能。"
          type="warning"
          style={{ marginBottom: 16 }}
        />

        <Form.Item
          label="是否用于计算"
          name={['usage', 'isForCalculation']}
          valuePropName="checked"
          tooltip="默认false，仅作为参考数据"
        >
          <Checkbox disabled>用于计算（暂不可用）</Checkbox>
        </Form.Item>

        <Form.Item
          label="研究状态"
          name={['usage', 'researchStatus']}
          rules={[{ required: true, message: '请选择研究状态' }]}
        >
          <Select placeholder="请选择研究状态">
            <Option value={ResearchStatus.RESEARCHING}>研究中</Option>
            <Option value={ResearchStatus.COMPLETED}>已完成</Option>
            <Option value={ResearchStatus.VALIDATED}>已验证</Option>
          </Select>
        </Form.Item>

        <Form.Item
          label="使用说明"
          name={['usage', 'notes']}
        >
          <TextArea
            placeholder="请输入使用说明（可选）"
            rows={3}
          />
        </Form.Item>
      </Card>

      {/* 备注 */}
      <Card title="备注" size="small">
        <Form.Item
          label="备注"
          name="notes"
        >
          <TextArea
            placeholder="请输入备注（可选）"
            rows={3}
          />
        </Form.Item>
      </Card>
    </Form>
  )
}

export default MealSetBaselineForm

