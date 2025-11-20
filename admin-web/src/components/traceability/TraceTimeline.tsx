/**
 * 溯源时间轴组件
 */

import React from 'react'
import { Timeline, Card, Tag, Space } from 'antd'
import { EnvironmentOutlined, ClockCircleOutlined } from '@ant-design/icons'
import type { TraceNode } from '@/types/traceability'
import { NodeType } from '@/types/traceability'
import dayjs from 'dayjs'

interface TraceTimelineProps {
  nodes: TraceNode[]
  onNodeClick?: (node: TraceNode) => void
}

const TraceTimeline: React.FC<TraceTimelineProps> = ({ nodes, onNodeClick }) => {
  const nodeTypeMap: Record<NodeType, { text: string; color: string }> = {
    [NodeType.SUPPLIER]: { text: '供应商', color: 'blue' },
    [NodeType.PROCESSOR]: { text: '加工', color: 'green' },
    [NodeType.TRANSPORT]: { text: '运输', color: 'orange' },
    [NodeType.RESTAURANT]: { text: '餐厅', color: 'purple' },
    [NodeType.OTHER]: { text: '其他', color: 'default' }
  }

  const sortedNodes = [...nodes].sort((a, b) => {
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  })

  return (
    <Timeline>
      {sortedNodes.map((node, index) => {
        const nodeTypeInfo = nodeTypeMap[node.nodeType] || nodeTypeMap[NodeType.OTHER]
        return (
          <Timeline.Item
            key={node.nodeId}
            color={node.isVerified ? 'green' : 'gray'}
          >
            <Card
              size="small"
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              onClick={() => onNodeClick && onNodeClick(node)}
              hoverable={!!onNodeClick}
            >
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>
                  <Tag color={nodeTypeInfo.color}>{nodeTypeInfo.text}</Tag>
                  <strong>{node.nodeName}</strong>
                  {node.isVerified && <Tag color="green">已验证</Tag>}
                </div>
                {node.nodeDescription && (
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    {node.nodeDescription}
                  </div>
                )}
                <Space>
                  <ClockCircleOutlined />
                  <span>{dayjs(node.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
                </Space>
                {node.location?.name && (
                  <Space>
                    <EnvironmentOutlined />
                    <span>{node.location.name}</span>
                  </Space>
                )}
                {node.operation?.description && (
                  <div style={{ color: '#666', fontSize: '12px' }}>
                    操作: {node.operation.description}
                  </div>
                )}
              </Space>
            </Card>
          </Timeline.Item>
        )
      })}
    </Timeline>
  )
}

export default TraceTimeline

