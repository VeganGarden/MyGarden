import { recipeAPI } from '@/services/cloudbase'
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd'
import dayjs from 'dayjs'
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

interface BaseRecipe {
  _id: string
  name: string
  nameEn?: string
  category: string
  description?: string
  status: 'draft' | 'published' | 'archived'
  isBaseRecipe: boolean
  certificationCount?: number
  ingredients?: Array<{
    ingredientId: string
    name: string
    quantity: number
    unit: string
    notes?: string
  }>
  carbonFootprint?: {
    value?: number
    ingredients?: number
    cookingEnergy?: number
    packaging?: number
  }
  cookingMethod?: string
  cookingTime?: number
  difficulty?: string
  createdAt: string
  updatedAt: string
  practiceData?: any
  suitability?: any
  culturalStory?: any
  practitionerCertifications?: any[]
  practiceWisdom?: any
  developmentHistory?: any
  socialAttributes?: any
  media?: any
}

const RecipeDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [recipe, setRecipe] = useState<BaseRecipe | null>(null)

  useEffect(() => {
    if (id) {
      fetchRecipe()
    }
  }, [id])

  const fetchRecipe = async () => {
    if (!id) return

    setLoading(true)
    try {
      const result = await recipeAPI.get(id)
      if (result && result.code === 0 && result.data) {
        const data = result.data
        // 检查是否为基础食谱
        if (!data.isBaseRecipe) {
          message.warning('只能查看基础食谱')
          navigate('/base/recipes')
          return
        }
        setRecipe(data)
      } else {
        message.error('获取食谱信息失败')
        navigate('/base/recipes')
      }
    } catch (error: any) {
      message.error(error.message || '获取食谱信息失败')
      navigate('/base/recipes')
    } finally {
      setLoading(false)
    }
  }

  const getStatusTag = (status: string) => {
    const config: Record<string, { color: string; text: string }> = {
      draft: { color: 'default', text: '草稿' },
      published: { color: 'success', text: '已发布' },
      archived: { color: 'error', text: '已归档' },
    }
    const cfg = config[status] || config.draft
    return <Tag color={cfg.color}>{cfg.text}</Tag>
  }

  const getCategoryText = (category: string) => {
    const categoryMap: Record<string, string> = {
      staple: '主食',
      dish: '菜品',
      soup: '汤品',
      dessert: '甜品',
      drink: '饮品',
      snack: '小食',
    }
    return categoryMap[category] || category
  }

  const getCookingMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      stir_fried: '炒',
      boiled: '煮',
      steamed: '蒸',
      fried: '炸',
      baked: '烤',
      stewed: '炖',
      cold: '凉拌',
    }
    return methodMap[method] || method
  }

  const getDifficultyText = (difficulty: string) => {
    const difficultyMap: Record<string, string> = {
      easy: '简单',
      medium: '中等',
      hard: '困难',
    }
    return difficultyMap[difficulty] || difficulty
  }

  if (loading || !recipe) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    )
  }

  const ingredientColumns = [
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '用量',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => `${quantity} ${record.unit || 'g'}`,
    },
    {
      title: '备注',
      dataIndex: 'notes',
      key: 'notes',
      render: (notes: string) => notes || '-',
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/base/recipes')}
              type="text"
            >
              返回
            </Button>
            <span>{recipe.name}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/base/recipes/${recipe._id}/edit`)}
            >
              编辑
            </Button>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label="食谱名称">{recipe.name}</Descriptions.Item>
          <Descriptions.Item label="英文名称">{recipe.nameEn || '-'}</Descriptions.Item>
          <Descriptions.Item label="分类">{getCategoryText(recipe.category)}</Descriptions.Item>
          <Descriptions.Item label="状态">{getStatusTag(recipe.status)}</Descriptions.Item>
          <Descriptions.Item label="烹饪方式">
            {recipe.cookingMethod ? getCookingMethodText(recipe.cookingMethod) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="烹饪时间（分钟）">
            {recipe.cookingTime || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="难度">
            {recipe.difficulty ? getDifficultyText(recipe.difficulty) : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="认证数量">{recipe.certificationCount || 0}</Descriptions.Item>
          {recipe.description && (
            <Descriptions.Item label="描述" span={2}>
              {recipe.description}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="创建时间">
            {recipe.createdAt ? dayjs(recipe.createdAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {recipe.updatedAt ? dayjs(recipe.updatedAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
          </Descriptions.Item>
        </Descriptions>

        {recipe.carbonFootprint && (
          <>
            <Divider orientation="left">碳足迹信息</Divider>
            <Row gutter={16}>
              <Col span={6}>
                <Statistic
                  title="参考碳足迹值"
                  value={recipe.carbonFootprint.value || 0}
                  precision={2}
                  suffix="kg CO₂e/份"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="食材碳足迹"
                  value={recipe.carbonFootprint.ingredients || 0}
                  precision={2}
                  suffix="kg CO₂e"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="烹饪能耗碳足迹"
                  value={recipe.carbonFootprint.cookingEnergy || 0}
                  precision={2}
                  suffix="kg CO₂e"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="包装碳足迹"
                  value={recipe.carbonFootprint.packaging || 0}
                  precision={2}
                  suffix="kg CO₂e"
                />
              </Col>
            </Row>
          </>
        )}

        {recipe.ingredients && recipe.ingredients.length > 0 && (
          <>
            <Divider orientation="left">食材列表</Divider>
            <Table
              columns={ingredientColumns}
              dataSource={recipe.ingredients}
              rowKey={(record, index) => `${record.ingredientId}-${index}`}
              pagination={false}
              size="small"
            />
          </>
        )}

        {recipe.practiceData && (
          <>
            <Divider orientation="left">实践数据</Divider>
            <Row gutter={16}>
              {recipe.practiceData.tasteScore !== undefined && (
                <Col span={6}>
                  <Statistic title="口味评分" value={recipe.practiceData.tasteScore} suffix="/10" />
                </Col>
              )}
              {recipe.practiceData.nutritionScore !== undefined && (
                <Col span={6}>
                  <Statistic
                    title="营养评分"
                    value={recipe.practiceData.nutritionScore}
                    suffix="/10"
                  />
                </Col>
              )}
              {recipe.practiceData.difficultyScore !== undefined && (
                <Col span={6}>
                  <Statistic
                    title="难度评分"
                    value={recipe.practiceData.difficultyScore}
                    suffix="/10"
                  />
                </Col>
              )}
              {recipe.practiceData.costScore !== undefined && (
                <Col span={6}>
                  <Statistic title="成本评分" value={recipe.practiceData.costScore} suffix="/10" />
                </Col>
              )}
              {recipe.practiceData.successRate !== undefined && (
                <Col span={6}>
                  <Statistic
                    title="新手成功率"
                    value={recipe.practiceData.successRate}
                    suffix="%"
                  />
                </Col>
              )}
              {recipe.practiceData.avgCookingTime !== undefined && (
                <Col span={6}>
                  <Statistic
                    title="平均烹饪时间"
                    value={recipe.practiceData.avgCookingTime}
                    suffix="分钟"
                  />
                </Col>
              )}
            </Row>
          </>
        )}

        {recipe.suitability && (
          <>
            <Divider orientation="left">适用场景</Divider>
            <Descriptions column={1} bordered>
              {recipe.suitability.seasons && recipe.suitability.seasons.length > 0 && (
                <Descriptions.Item label="适合季节">
                  <Space>
                    {recipe.suitability.seasons.map((season: string) => (
                      <Tag key={season}>
                        {season === 'spring'
                          ? '春'
                          : season === 'summer'
                          ? '夏'
                          : season === 'autumn'
                          ? '秋'
                          : season === 'winter'
                          ? '冬'
                          : season}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {recipe.suitability.bodyTypes && recipe.suitability.bodyTypes.length > 0 && (
                <Descriptions.Item label="适合体质">
                  <Space>
                    {recipe.suitability.bodyTypes.map((type: string) => (
                      <Tag key={type}>{type}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
              {recipe.suitability.groups && recipe.suitability.groups.length > 0 && (
                <Descriptions.Item label="适合人群">
                  <Space>
                    {recipe.suitability.groups.map((group: string) => (
                      <Tag key={group}>{group}</Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {recipe.culturalStory && (
          <>
            <Divider orientation="left">文化故事</Divider>
            <Descriptions column={1} bordered>
              {recipe.culturalStory.background && (
                <Descriptions.Item label="文化背景">
                  {recipe.culturalStory.background}
                </Descriptions.Item>
              )}
              {recipe.culturalStory.bestPractitioner && (
                <Descriptions.Item label="最擅长的人">
                  {recipe.culturalStory.bestPractitioner}
                </Descriptions.Item>
              )}
              {recipe.culturalStory.sharingExperience && (
                <Descriptions.Item label="印象最深的分享经历">
                  {recipe.culturalStory.sharingExperience}
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}

        {recipe.practitionerCertifications &&
          recipe.practitionerCertifications.length > 0 && (
            <>
              <Divider orientation="left">践行者认证</Divider>
              {recipe.practitionerCertifications.map((cert: any, index: number) => (
                <Card key={index} size="small" style={{ marginBottom: 16 }}>
                  <Descriptions column={2} bordered>
                    <Descriptions.Item label="践行者姓名">
                      {cert.practitionerName || '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="认证等级">
                      {cert.level === 'bronze'
                        ? '铜牌'
                        : cert.level === 'silver'
                        ? '银牌'
                        : cert.level === 'gold'
                        ? '金牌'
                        : cert.level === 'diamond'
                        ? '钻石'
                        : cert.level}
                    </Descriptions.Item>
                    <Descriptions.Item label="素食年限">{cert.veganYears || '-'}年</Descriptions.Item>
                    <Descriptions.Item label="制作成功率">
                      {cert.successRate !== undefined ? `${cert.successRate}%` : '-'}
                    </Descriptions.Item>
                    <Descriptions.Item label="制作次数">{cert.timesMade || 0}</Descriptions.Item>
                    {cert.certifiedAt && (
                      <Descriptions.Item label="认证时间">
                        {dayjs(cert.certifiedAt).format('YYYY-MM-DD')}
                      </Descriptions.Item>
                    )}
                    {cert.testimony && (
                      <Descriptions.Item label="认证证言" span={2}>
                        {cert.testimony}
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>
              ))}
            </>
          )}

        {recipe.practiceWisdom && (
          <>
            <Divider orientation="left">实践智慧</Divider>
            <Descriptions column={1} bordered>
              {recipe.practiceWisdom.bestPractices &&
                recipe.practiceWisdom.bestPractices.length > 0 && (
                  <Descriptions.Item label="最佳实践">
                    <Space wrap>
                      {recipe.practiceWisdom.bestPractices.map((practice: string, index: number) => (
                        <Tag key={index} color="green">
                          {practice}
                        </Tag>
                      ))}
                    </Space>
                  </Descriptions.Item>
                )}
              {recipe.practiceWisdom.commonMistakes &&
                recipe.practiceWisdom.commonMistakes.length > 0 && (
                  <Descriptions.Item label="常见误区">
                    <Space wrap>
                      {recipe.practiceWisdom.commonMistakes.map(
                        (mistake: string, index: number) => (
                          <Tag key={index} color="orange">
                            {mistake}
                          </Tag>
                        )
                      )}
                    </Space>
                  </Descriptions.Item>
                )}
              {recipe.practiceWisdom.tips && recipe.practiceWisdom.tips.length > 0 && (
                <Descriptions.Item label="小贴士">
                  <Space wrap>
                    {recipe.practiceWisdom.tips.map((tip: string, index: number) => (
                      <Tag key={index} color="blue">
                        {tip}
                      </Tag>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
            {recipe.practiceWisdom.stories && recipe.practiceWisdom.stories.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {recipe.practiceWisdom.stories.map((story: any, index: number) => (
                  <Card key={index} size="small" style={{ marginBottom: 8 }}>
                    <div>
                      <strong>{story.title}</strong>
                      {story.author && <span style={{ marginLeft: 8, color: '#999' }}>作者: {story.author}</span>}
                      {story.date && (
                        <span style={{ marginLeft: 8, color: '#999' }}>
                          {dayjs(story.date).format('YYYY-MM-DD')}
                        </span>
                      )}
                    </div>
                    <div style={{ marginTop: 8 }}>{story.content}</div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {recipe.developmentHistory && (
          <>
            <Divider orientation="left">研发历史</Divider>
            <Descriptions column={1} bordered>
              {recipe.developmentHistory.inventor && (
                <Descriptions.Item label="研发者">
                  {recipe.developmentHistory.inventor}
                </Descriptions.Item>
              )}
              {recipe.developmentHistory.inventedAt && (
                <Descriptions.Item label="研发时间">
                  {dayjs(recipe.developmentHistory.inventedAt).format('YYYY-MM-DD')}
                </Descriptions.Item>
              )}
              {recipe.developmentHistory.inspiration && (
                <Descriptions.Item label="灵感来源">
                  {recipe.developmentHistory.inspiration}
                </Descriptions.Item>
              )}
            </Descriptions>
            {recipe.developmentHistory.evolutionLog &&
              recipe.developmentHistory.evolutionLog.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  {recipe.developmentHistory.evolutionLog.map((log: any, index: number) => (
                    <Card key={index} size="small" style={{ marginBottom: 8 }}>
                      <div>
                        <strong>版本 {log.version}</strong>
                        {log.date && (
                          <span style={{ marginLeft: 8, color: '#999' }}>
                            {dayjs(log.date).format('YYYY-MM-DD')}
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 8 }}>{log.changes}</div>
                    </Card>
                  ))}
                </div>
              )}
          </>
        )}

        {recipe.socialAttributes && (
          <>
            <Divider orientation="left">社交属性</Divider>
            <Row gutter={16}>
              {recipe.socialAttributes.shareCount !== undefined && (
                <Col span={6}>
                  <Statistic title="分享次数" value={recipe.socialAttributes.shareCount} />
                </Col>
              )}
              {recipe.socialAttributes.likeCount !== undefined && (
                <Col span={6}>
                  <Statistic title="点赞次数" value={recipe.socialAttributes.likeCount} />
                </Col>
              )}
              {recipe.socialAttributes.commentCount !== undefined && (
                <Col span={6}>
                  <Statistic title="评论次数" value={recipe.socialAttributes.commentCount} />
                </Col>
              )}
              {recipe.socialAttributes.isPopular !== undefined && (
                <Col span={6}>
                  <Statistic
                    title="是否热门"
                    value={recipe.socialAttributes.isPopular ? '是' : '否'}
                  />
                </Col>
              )}
            </Row>
            {recipe.socialAttributes.tags && recipe.socialAttributes.tags.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <Space wrap>
                  {recipe.socialAttributes.tags.map((tag: string, index: number) => (
                    <Tag key={index}>{tag}</Tag>
                  ))}
                </Space>
              </div>
            )}
          </>
        )}

        {recipe.media && (
          <>
            <Divider orientation="left">媒体资源</Divider>
            <Descriptions column={1} bordered>
              {recipe.media.videoUrl && (
                <Descriptions.Item label="视频教程URL">
                  <a href={recipe.media.videoUrl} target="_blank" rel="noopener noreferrer">
                    {recipe.media.videoUrl}
                  </a>
                </Descriptions.Item>
              )}
              {recipe.media.videoThumbnail && (
                <Descriptions.Item label="视频缩略图URL">
                  <a href={recipe.media.videoThumbnail} target="_blank" rel="noopener noreferrer">
                    {recipe.media.videoThumbnail}
                  </a>
                </Descriptions.Item>
              )}
              {recipe.media.images && recipe.media.images.length > 0 && (
                <Descriptions.Item label="图片">
                  <Space wrap>
                    {recipe.media.images.map((image: string, index: number) => (
                      <a
                        key={index}
                        href={image}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ marginRight: 8 }}
                      >
                        图片 {index + 1}
                      </a>
                    ))}
                  </Space>
                </Descriptions.Item>
              )}
            </Descriptions>
          </>
        )}
      </Card>
    </div>
  )
}

export default RecipeDetail

