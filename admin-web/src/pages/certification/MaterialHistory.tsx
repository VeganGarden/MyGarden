import { certificationAPI } from '@/services/cloudbase'
import { useAppSelector } from '@/store/hooks'
import { ArrowLeftOutlined, EyeOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Empty, List, Select, Space, Tag, message, Spin, Modal } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'

const CertificationMaterialHistory: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { restaurants } = useAppSelector((state: any) => state.tenant)
  const [loading, setLoading] = useState(false)
  const [versions, setVersions] = useState<any[]>([])
  const [selectedVersion, setSelectedVersion] = useState<any | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [compareModalVisible, setCompareModalVisible] = useState(false)
  const [selectedVersions, setSelectedVersions] = useState<[any, any] | null>(null)

  const restaurantId = searchParams.get('restaurantId') || ''
  const materialType = searchParams.get('materialType') || 'basicInfo'

  useEffect(() => {
    if (restaurantId && materialType) {
      loadHistory()
    }
  }, [restaurantId, materialType])

  const loadHistory = async () => {
    try {
      setLoading(true)
      const result = await certificationAPI.getMaterialHistory({
        restaurantId,
        materialType,
      })

      if (result.code === 0 && result.data) {
        setVersions(result.data.versions || [])
      } else {
        message.error(result.message || '获取历史版本失败')
      }
    } catch (error: any) {
      console.error('获取历史版本失败:', error)
      message.error(error.message || '获取历史版本失败')
    } finally {
      setLoading(false)
    }
  }

  const handleViewDetail = (version: any) => {
    setSelectedVersion(version)
    setDetailModalVisible(true)
  }

  const handleCompare = (version1: any, version2: any) => {
    setSelectedVersions([version1, version2])
    setCompareModalVisible(true)
  }

  const getMaterialTypeName = (type: string) => {
    const typeMap: Record<string, string> = {
      basicInfo: '基本信息',
      menuInfo: '菜单信息',
      supplyChainInfo: '供应链信息',
      operationData: '运营数据',
    }
    return typeMap[type] || type
  }

  const restaurant = restaurants.find((r: any) => r.id === restaurantId)

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 50 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Card
        title={
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
              返回
            </Button>
            <span>资料历史版本 - {getMaterialTypeName(materialType)}</span>
          </Space>
        }
      >
        {restaurant && (
          <div style={{ marginBottom: 16 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="餐厅名称">{restaurant.name}</Descriptions.Item>
              <Descriptions.Item label="资料类型">{getMaterialTypeName(materialType)}</Descriptions.Item>
            </Descriptions>
          </div>
        )}

        {versions.length === 0 ? (
          <Empty description="暂无历史版本" />
        ) : (
          <List
            dataSource={versions}
            renderItem={(version, index) => (
              <List.Item
                actions={[
                  <Button
                    key="view"
                    type="link"
                    icon={<EyeOutlined />}
                    onClick={() => handleViewDetail(version)}
                  >
                    查看详情
                  </Button>,
                  index < versions.length - 1 && (
                    <Button
                      key="compare"
                      type="link"
                      onClick={() => handleCompare(version, versions[index + 1])}
                    >
                      与上一版本对比
                    </Button>
                  ),
                ]}
              >
                <List.Item.Meta
                  title={
                    <Space>
                      <span>版本 {version.version}</span>
                      {version.isCurrent && <Tag color="success">当前版本</Tag>}
                      <Tag color={version.reviewStatus === 'approved' ? 'success' : 'default'}>
                        {version.reviewStatus === 'approved' ? '已审核' : '待审核'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>变更人: {version.changedBy}</div>
                      <div>变更时间: {new Date(version.changedAt).toLocaleString()}</div>
                      {version.changeReason && (
                        <div>变更原因: {version.changeReason}</div>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* 版本详情弹窗 */}
      <Modal
        title={`版本 ${selectedVersion?.version} 详情`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[<Button key="close" onClick={() => setDetailModalVisible(false)}>关闭</Button>]}
        width={800}
      >
        {selectedVersion && (
          <div>
            <Descriptions column={1} bordered>
              <Descriptions.Item label="版本号">{selectedVersion.version}</Descriptions.Item>
              <Descriptions.Item label="变更人">{selectedVersion.changedBy}</Descriptions.Item>
              <Descriptions.Item label="变更时间">
                {new Date(selectedVersion.changedAt).toLocaleString()}
              </Descriptions.Item>
              <Descriptions.Item label="变更原因">
                {selectedVersion.changeReason || '-'}
              </Descriptions.Item>
              <Descriptions.Item label="审核状态">
                <Tag color={selectedVersion.reviewStatus === 'approved' ? 'success' : 'default'}>
                  {selectedVersion.reviewStatus === 'approved' ? '已审核' : '待审核'}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            <Card title="资料内容" style={{ marginTop: 16 }}>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 400, overflow: 'auto' }}>
                {JSON.stringify(selectedVersion.materialData, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </Modal>

      {/* 版本对比弹窗 */}
      <Modal
        title="版本对比"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={[<Button key="close" onClick={() => setCompareModalVisible(false)}>关闭</Button>]}
        width={1000}
      >
        {selectedVersions && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Card title={`版本 ${selectedVersions[0].version}`}>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
                {JSON.stringify(selectedVersions[0].materialData, null, 2)}
              </pre>
            </Card>
            <Card title={`版本 ${selectedVersions[1].version}`}>
              <pre style={{ whiteSpace: 'pre-wrap', maxHeight: 500, overflow: 'auto' }}>
                {JSON.stringify(selectedVersions[1].materialData, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default CertificationMaterialHistory

