import { ingredientAPI, meatIngredientAPI, recipeAPI } from '@/services/cloudbase'
import { DatabaseOutlined, FileTextOutlined, FireOutlined, TrophyOutlined } from '@ant-design/icons'
import { Card, Col, Row, Spin, Statistic, Table, Tag, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import React, { useEffect, useState } from 'react'

interface BaseDataStatistics {
  totalIngredients: number
  publishedIngredients: number
  draftIngredients: number
  archivedIngredients: number
  totalMeatIngredients: number
  publishedMeatIngredients: number
  draftMeatIngredients: number
  archivedMeatIngredients: number
  totalRecipes: number
  publishedRecipes: number
  draftRecipes: number
  archivedRecipes: number
  ingredientsWithCertifications: number
  recipesWithCertifications: number
  popularIngredients: number
  popularRecipes: number
}

interface TopIngredient {
  name: string
  certificationCount: number
  shareCount?: number
  likeCount?: number
}

interface TopRecipe {
  name: string
  certificationCount: number
  shareCount?: number
  likeCount?: number
}

const Statistics: React.FC = () => {
  const [loading, setLoading] = useState(false)
  const [statistics, setStatistics] = useState<BaseDataStatistics>({
    totalIngredients: 0,
    publishedIngredients: 0,
    draftIngredients: 0,
    archivedIngredients: 0,
    totalMeatIngredients: 0,
    publishedMeatIngredients: 0,
    draftMeatIngredients: 0,
    archivedMeatIngredients: 0,
    totalRecipes: 0,
    publishedRecipes: 0,
    draftRecipes: 0,
    archivedRecipes: 0,
    ingredientsWithCertifications: 0,
    recipesWithCertifications: 0,
    popularIngredients: 0,
    popularRecipes: 0,
  })
  const [topIngredients, setTopIngredients] = useState<TopIngredient[]>([])
  const [topRecipes, setTopRecipes] = useState<TopRecipe[]>([])

  useEffect(() => {
    fetchStatistics()
  }, [])

  const fetchStatistics = async () => {
    setLoading(true)
    try {
      // 优化：分批获取数据，避免一次性获取过多数据
      // 先获取总数，然后根据需要获取详细数据
      const [ingredientsResult, meatIngredientsResult, recipesResult] = await Promise.all([
        ingredientAPI.list({ pageSize: 1000 }), // 限制最大获取数量
        meatIngredientAPI.list({ pageSize: 1000 }),
        recipeAPI.list({ pageSize: 1000, isBaseRecipe: true }),
      ])
      
      const ingredients = ingredientsResult?.code === 0 ? (ingredientsResult.data?.data || []) : []
      const meatIngredients = meatIngredientsResult?.code === 0 ? (meatIngredientsResult.data?.data || []) : []
      const recipes = recipesResult?.code === 0 ? (recipesResult.data?.data || []) : []

      // 计算统计数据
      const stats: BaseDataStatistics = {
        totalIngredients: ingredients.length,
        publishedIngredients: ingredients.filter((i: any) => i.status === 'published').length,
        draftIngredients: ingredients.filter((i: any) => i.status === 'draft').length,
        archivedIngredients: ingredients.filter((i: any) => i.status === 'archived').length,
        totalMeatIngredients: meatIngredients.length,
        publishedMeatIngredients: meatIngredients.filter((i: any) => i.status === 'published').length,
        draftMeatIngredients: meatIngredients.filter((i: any) => i.status === 'draft').length,
        archivedMeatIngredients: meatIngredients.filter((i: any) => i.status === 'archived').length,
        totalRecipes: recipes.length,
        publishedRecipes: recipes.filter((r: any) => r.status === 'published').length,
        draftRecipes: recipes.filter((r: any) => r.status === 'draft').length,
        archivedRecipes: recipes.filter((r: any) => r.status === 'archived').length,
        ingredientsWithCertifications: ingredients.filter((i: any) => (i.certificationCount || 0) > 0).length,
        recipesWithCertifications: recipes.filter((r: any) => (r.certificationCount || 0) > 0).length,
        popularIngredients: ingredients.filter((i: any) => i.socialAttributes?.isPopular === true).length,
        popularRecipes: recipes.filter((r: any) => r.socialAttributes?.isPopular === true).length,
      }

      setStatistics(stats)

      // 获取热门食材（按认证数量排序）
      const topIngs = ingredients
        .filter((i: any) => (i.certificationCount || 0) > 0)
        .sort((a: any, b: any) => (b.certificationCount || 0) - (a.certificationCount || 0))
        .slice(0, 10)
        .map((ing: any) => ({
          name: ing.name,
          certificationCount: ing.certificationCount || 0,
          shareCount: ing.socialAttributes?.shareCount || 0,
          likeCount: ing.socialAttributes?.likeCount || 0,
        }))

      setTopIngredients(topIngs)

      // 获取热门食谱（按认证数量排序）
      const topRecs = recipes
        .filter((r: any) => (r.certificationCount || 0) > 0)
        .sort((a: any, b: any) => (b.certificationCount || 0) - (a.certificationCount || 0))
        .slice(0, 10)
        .map((rec: any) => ({
          name: rec.name,
          certificationCount: rec.certificationCount || 0,
          shareCount: rec.socialAttributes?.shareCount || 0,
          likeCount: rec.socialAttributes?.likeCount || 0,
        }))

      setTopRecipes(topRecs)
    } catch (error: any) {
      console.error('获取统计数据失败:', error)
      message.error(error.message || '获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  const ingredientColumns: ColumnsType<TopIngredient> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: '食材名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '认证数量',
      dataIndex: 'certificationCount',
      key: 'certificationCount',
      render: (count: number) => <Tag color="gold">{count}</Tag>,
    },
    {
      title: '分享次数',
      dataIndex: 'shareCount',
      key: 'shareCount',
      render: (count: number) => count || 0,
    },
    {
      title: '点赞次数',
      dataIndex: 'likeCount',
      key: 'likeCount',
      render: (count: number) => count || 0,
    },
  ]

  const recipeColumns: ColumnsType<TopRecipe> = [
    {
      title: '排名',
      key: 'rank',
      width: 80,
      render: (_, __, index) => index + 1,
    },
    {
      title: '食谱名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '认证数量',
      dataIndex: 'certificationCount',
      key: 'certificationCount',
      render: (count: number) => <Tag color="gold">{count}</Tag>,
    },
    {
      title: '分享次数',
      dataIndex: 'shareCount',
      key: 'shareCount',
      render: (count: number) => count || 0,
    },
    {
      title: '点赞次数',
      dataIndex: 'likeCount',
      key: 'likeCount',
      render: (count: number) => count || 0,
    },
  ]

  return (
    <Spin spinning={loading}>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic
              title="素食食材总数"
              value={statistics.totalIngredients}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="荤食食材总数"
              value={statistics.totalMeatIngredients}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="食谱总数"
              value={statistics.totalRecipes}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="已发布素食食材"
              value={statistics.publishedIngredients}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已发布荤食食材"
              value={statistics.publishedMeatIngredients}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已发布食谱"
              value={statistics.publishedRecipes}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="草稿总数"
              value={statistics.draftIngredients + statistics.draftMeatIngredients + statistics.draftRecipes}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="有认证的食材"
              value={statistics.ingredientsWithCertifications}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="有认证的食谱"
              value={statistics.recipesWithCertifications}
              prefix={<TrophyOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="热门食材"
              value={statistics.popularIngredients}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="热门食谱"
              value={statistics.popularRecipes}
              prefix={<FireOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Card title="热门食材 TOP 10（按认证数量）">
            <Table
              columns={ingredientColumns}
              dataSource={topIngredients}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="热门食谱 TOP 10（按认证数量）">
            <Table
              columns={recipeColumns}
              dataSource={topRecipes}
              rowKey="name"
              pagination={false}
              size="small"
            />
          </Card>
        </Col>
      </Row>
    </Spin>
  )
}

export default Statistics

