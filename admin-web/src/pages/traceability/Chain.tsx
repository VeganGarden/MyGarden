import { QrcodeOutlined, SearchOutlined, ShareAltOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Input, Select, Space, Tag, Timeline } from 'antd'
import React, { useState } from 'react'

interface TraceabilityNode {
  id: string
  type: 'supplier' | 'transport' | 'restaurant' | 'dish'
  name: string
  timestamp: string
  location?: string
  certifications?: string[]
  carbonFootprint?: number
}

const TraceabilityChain: React.FC = () => {
  const [selectedChain, setSelectedChain] = useState<string | null>(null)
  const [chainData] = useState<TraceabilityNode[]>([
    {
      id: '1',
      type: 'supplier',
      name: 'XX农场',
      timestamp: '2025-01-10 08:00:00',
      location: '上海市浦东新区',
      certifications: ['有机认证'],
      carbonFootprint: 0.5,
    },
    {
      id: '2',
      type: 'transport',
      name: '运输环节',
      timestamp: '2025-01-10 10:00:00',
      location: '运输中',
      carbonFootprint: 0.1,
    },
    {
      id: '3',
      type: 'restaurant',
      name: '示例餐厅',
      timestamp: '2025-01-10 14:00:00',
      location: '上海市黄浦区',
      carbonFootprint: 0.2,
    },
    {
      id: '4',
      type: 'dish',
      name: '清炒时蔬',
      timestamp: '2025-01-10 18:00:00',
      carbonFootprint: 0.15,
    },
  ])

  const getNodeColor = (type: string) => {
    switch (type) {
      case 'supplier':
        return 'blue'
      case 'transport':
        return 'orange'
      case 'restaurant':
        return 'green'
      case 'dish':
        return 'purple'
      default:
        return 'gray'
    }
  }

  const getNodeLabel = (type: string) => {
    switch (type) {
      case 'supplier':
        return '供应商'
      case 'transport':
        return '运输'
      case 'restaurant':
        return '餐厅'
      case 'dish':
        return '菜品'
      default:
        return '未知'
    }
  }

  const handleSearch = (value: string) => {
    // TODO: 实现溯源链查询
    console.log('查询溯源链:', value)
  }

  const handleShare = () => {
    // TODO: 实现分享功能
    console.log('分享溯源链')
  }

  return (
    <div>
      <Card
        title="溯源链管理"
        extra={
          <Space>
            <Input.Search
              placeholder="输入菜品名称或批次号查询"
              style={{ width: 300 }}
              onSearch={handleSearch}
              enterButton={<SearchOutlined />}
            />
            <Button icon={<QrcodeOutlined />}>扫码查询</Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 24 }}>
          <Select
            placeholder="选择溯源链"
            style={{ width: 300 }}
            onChange={setSelectedChain}
          >
            <Select.Option value="chain1">清炒时蔬 - 批次20250110</Select.Option>
            <Select.Option value="chain2">麻婆豆腐 - 批次20250111</Select.Option>
          </Select>
        </div>

        {selectedChain && (
          <Card
            title="溯源链详情"
            extra={
              <Space>
                <Button icon={<ShareAltOutlined />} onClick={handleShare}>
                  分享
                </Button>
                <Button>生成证书</Button>
              </Space>
            }
          >
            <Timeline>
              {chainData.map((node, index) => (
                <Timeline.Item
                  key={node.id}
                  color={getNodeColor(node.type)}
                >
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <div>
                        <Tag color={getNodeColor(node.type)}>{getNodeLabel(node.type)}</Tag>
                        <span style={{ fontWeight: 'bold', marginLeft: 8 }}>{node.name}</span>
                      </div>
                      <span style={{ color: '#999', fontSize: 12 }}>{node.timestamp}</span>
                    </div>
                    <Descriptions column={1} size="small" bordered>
                      {node.location && (
                        <Descriptions.Item label="位置">{node.location}</Descriptions.Item>
                      )}
                      {node.certifications && node.certifications.length > 0 && (
                        <Descriptions.Item label="认证信息">
                          {node.certifications.map((cert) => (
                            <Tag key={cert} color="green">{cert}</Tag>
                          ))}
                        </Descriptions.Item>
                      )}
                      {node.carbonFootprint !== undefined && (
                        <Descriptions.Item label="碳足迹">
                          {node.carbonFootprint.toFixed(2)} kg CO₂e
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>

            <div style={{ marginTop: 24, padding: 16, background: '#f5f5f5', borderRadius: 4 }}>
              <div style={{ marginBottom: 8 }}>
                <strong>总碳足迹:</strong> 0.95 kg CO₂e
              </div>
              <div style={{ marginBottom: 8 }}>
                <strong>信任度评分:</strong> 85/100
              </div>
              <div>
                <strong>溯源链完整性:</strong> 100%
              </div>
            </div>
          </Card>
        )}

        {!selectedChain && (
          <div style={{ textAlign: 'center', padding: 40, color: '#999' }}>
            请选择或搜索溯源链
          </div>
        )}
      </Card>
    </div>
  )
}

export default TraceabilityChain

