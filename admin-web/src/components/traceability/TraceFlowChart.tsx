/**
 * 溯源链流程图组件
 */

import React from 'react'
import { Card, Space, Tag } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import type { TraceNode } from '@/types/traceability'
import { NodeType } from '@/types/traceability'

interface TraceFlowChartProps {
  nodes: TraceNode[]
  onNodeClick?: (node: TraceNode) => void
}

const TraceFlowChart: React.FC<TraceFlowChartProps> = ({ nodes, onNodeClick }) => {
  const nodeTypeMap: Record<NodeType, { text: string; color: string }> = {
    [NodeType.SUPPLIER]: { text: '供应商', color: 'blue' },
    [NodeType.PROCESSOR]: { text: '加工', color: 'green' },
    [NodeType.TRANSPORT]: { text: '运输', color: 'orange' },
    [NodeType.RESTAURANT]: { text: '餐厅', color: 'purple' },
    [NodeType.OTHER]: { text: '其他', color: 'default' }
  }

  const sortedNodes = [...nodes].sort((a, b) => a.nodeOrder - b.nodeOrder)

  return (
    <Card title="溯源流程图" size="small">
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '16px 0' }}>
        {sortedNodes.map((node, index) => {
          const nodeTypeInfo = nodeTypeMap[node.nodeType] || nodeTypeMap[NodeType.OTHER]
          return (
            <React.Fragment key={node.nodeId}>
              <Card
                size="small"
                style={{
                  minWidth: '120px',
                  cursor: onNodeClick ? 'pointer' : 'default',
                  borderColor: node.isVerified ? '#52c41a' : '#d9d9d9'
                }}
                onClick={() => onNodeClick && onNodeClick(node)}
                hoverable={!!onNodeClick}
              >
                <div style={{ textAlign: 'center' }}>
                  <Tag color={nodeTypeInfo.color} style={{ marginBottom: 8 }}>
                    {nodeTypeInfo.text}
                  </Tag>
                  <div style={{ fontWeight: 'bold', marginBottom: 4 }}>
                    {node.nodeName}
                  </div>
                  {node.isVerified && (
                    <Tag color="green">已验证</Tag>
                  )}
                </div>
              </Card>
              {index < sortedNodes.length - 1 && (
                <RightOutlined style={{ color: '#999', fontSize: '16px' }} />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </Card>
  )
}

export default TraceFlowChart

