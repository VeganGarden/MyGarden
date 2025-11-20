/**
 * 基准值表单组件
 */
import React, { useEffect } from 'react'
import { Form, Input, InputNumber, Select, DatePicker, Row, Col } from 'antd'
import type { FormInstance } from 'antd'
import { MealType, Region, EnergyType, SourceType } from '@/types/baseline'
import dayjs from 'dayjs'

const { Option } = Select
const { TextArea } = Input

interface BaselineFormProps {
  form: FormInstance
  initialValues?: any
  onValuesChange?: (changedValues: any, allValues: any) => void
}

const BaselineForm: React.FC<BaselineFormProps> = ({
  form,
  initialValues,
  onValuesChange,
}) => {
  // 注意：置信区间计算和分解数据验证在父组件的onValuesChange中处理

  return (
    <Form
      form={form}
      layout="vertical"
      initialValues={initialValues}
      onValuesChange={onValuesChange}
    >
      {/* 步骤1: 基本信息 */}
      <div style={{ marginBottom: 24 }}>
        <h3>基本信息</h3>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name={['category', 'mealType']}
              label="餐食类型"
              rules={[{ required: true, message: '请选择餐食类型' }]}
            >
              <Select placeholder="请选择餐食类型">
                <Option value={MealType.MEAT_SIMPLE}>肉食简餐</Option>
                <Option value={MealType.MEAT_FULL}>肉食正餐</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['category', 'region']}
              label="地区"
              rules={[{ required: true, message: '请选择地区' }]}
            >
              <Select placeholder="请选择地区">
                <Option value={Region.NORTH_CHINA}>华北区域</Option>
                <Option value={Region.NORTHEAST}>东北区域</Option>
                <Option value={Region.EAST_CHINA}>华东区域</Option>
                <Option value={Region.CENTRAL_CHINA}>华中区域</Option>
                <Option value={Region.NORTHWEST}>西北区域</Option>
                <Option value={Region.SOUTH_CHINA}>南方区域</Option>
                <Option value={Region.NATIONAL_AVERAGE}>全国平均</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['category', 'energyType']}
              label="用能方式"
              rules={[{ required: true, message: '请选择用能方式' }]}
            >
              <Select placeholder="请选择用能方式">
                <Option value={EnergyType.ELECTRIC}>全电厨房</Option>
                <Option value={EnergyType.GAS}>燃气厨房</Option>
                <Option value={EnergyType.MIXED}>混合用能</Option>
              </Select>
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name={['category', 'city']} label="城市（可选）">
              <Input placeholder="请输入城市名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name={['category', 'restaurantType']} label="餐厅类型（可选）">
              <Input placeholder="请输入餐厅类型" />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 步骤2: 基准值数据 */}
      <div style={{ marginBottom: 24 }}>
        <h3>基准值数据</h3>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name={['carbonFootprint', 'value']}
              label="基准值 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入基准值' },
                { type: 'number', min: 0, message: '基准值必须大于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入基准值"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['carbonFootprint', 'uncertainty']}
              label="不确定性 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入不确定性' },
                { type: 'number', min: 0, message: '不确定性必须大于等于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="请输入不确定性"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item name={['carbonFootprint', 'confidenceInterval', 'lower']} label="置信区间下限">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="自动计算"
                precision={1}
                disabled
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item name={['carbonFootprint', 'confidenceInterval', 'upper']} label="置信区间上限">
              <InputNumber
                style={{ width: '100%' }}
                placeholder="自动计算"
                precision={1}
                disabled
              />
            </Form.Item>
          </Col>
        </Row>

        <h4 style={{ marginTop: 16, marginBottom: 8 }}>分解数据</h4>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item
              name={['breakdown', 'ingredients']}
              label="食材 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入食材碳足迹' },
                { type: 'number', min: 0, message: '必须大于等于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="食材"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['breakdown', 'cookingEnergy']}
              label="烹饪能耗 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入烹饪能耗' },
                { type: 'number', min: 0, message: '必须大于等于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="烹饪能耗"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['breakdown', 'packaging']}
              label="包装 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入包装碳足迹' },
                { type: 'number', min: 0, message: '必须大于等于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="包装"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item
              name={['breakdown', 'other']}
              label="其他 (kg CO₂e)"
              rules={[
                { required: true, message: '请输入其他碳足迹' },
                { type: 'number', min: 0, message: '必须大于等于0' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="其他"
                precision={1}
                min={0}
              />
            </Form.Item>
          </Col>
        </Row>
      </div>

      {/* 步骤3: 数据来源与版本 */}
      <div style={{ marginBottom: 24 }}>
        <h3>数据来源与版本</h3>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name={['source', 'type']}
              label="来源类型"
              rules={[{ required: true, message: '请选择来源类型' }]}
            >
              <Select placeholder="请选择来源类型">
                <Option value={SourceType.INDUSTRY_STATISTICS}>行业统计</Option>
                <Option value={SourceType.ACADEMIC_RESEARCH}>学术研究</Option>
                <Option value={SourceType.THIRD_PARTY}>第三方机构</Option>
                <Option value={SourceType.ESTIMATION}>估算</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['source', 'organization']}
              label="机构名称"
              rules={[{ required: true, message: '请输入机构名称' }]}
            >
              <Input placeholder="请输入机构名称" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name={['source', 'year']}
              label="年份"
              rules={[{ required: true, message: '请输入年份' }]}
            >
              <InputNumber
                style={{ width: '100%' }}
                placeholder="年份"
                min={2000}
                max={2100}
              />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name={['source', 'report']}
              label="报告名称"
              rules={[{ required: true, message: '请输入报告名称' }]}
            >
              <Input placeholder="请输入报告名称" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name={['source', 'methodology']}
              label="计算方法"
              rules={[{ required: true, message: '请输入计算方法' }]}
            >
              <Input placeholder="请输入计算方法" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item
              name="version"
              label="版本号"
              rules={[
                { required: true, message: '请输入版本号' },
                { pattern: /^\d{4}\.\d{2}$/, message: '版本号格式：YYYY.MM（如：2024.01）' },
              ]}
            >
              <Input placeholder="2024.01" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="effectiveDate"
              label="有效日期"
              rules={[{ required: true, message: '请选择有效日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item
              name="expiryDate"
              label="失效日期"
              rules={[{ required: true, message: '请选择失效日期' }]}
            >
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="备注（可选）">
          <TextArea rows={3} placeholder="请输入备注信息" />
        </Form.Item>
      </div>
    </Form>
  )
}

export default BaselineForm

