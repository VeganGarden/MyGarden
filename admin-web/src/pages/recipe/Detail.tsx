import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { deleteRecipe, fetchRecipe } from '@/store/slices/recipeSlice'
import { ChannelType, RecipeStatus } from '@/types'
import {
  ArrowLeftOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
} from '@ant-design/icons'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Popconfirm,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  message,
} from 'antd'
import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'

const RecipeDetail: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentRecipe, loading } = useAppSelector((state) => state.recipe)

  useEffect(() => {
    if (id) {
      loadRecipe()
    }
  }, [id])

  const loadRecipe = async () => {
    try {
      await dispatch(fetchRecipe(id!)).unwrap()
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.detail.messages.loadFailed'))
      navigate('/recipe')
    }
  }

  const handleDelete = async () => {
    try {
      await dispatch(deleteRecipe(id!)).unwrap()
      message.success(t('pages.recipe.detail.messages.deleteSuccess'))
      navigate('/recipe')
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.detail.messages.deleteFailed'))
    }
  }

  const handleCopy = () => {
    if (currentRecipe) {
      navigate('/recipe/list', {
        state: {
          copyFrom: currentRecipe,
        },
      })
    }
  }

  const getCarbonLabelColor = (label?: string) => {
    switch (label) {
      case 'ultra_low':
      case 'low':
        return 'green'
      case 'medium':
        return 'orange'
      case 'high':
        return 'red'
      default:
        return 'default'
    }
  }

  const getCarbonLabelText = (label?: string) => {
    switch (label) {
      case 'ultra_low':
        return t('pages.recipe.list.filters.carbonLabel.ultraLow')
      case 'low':
        return t('pages.recipe.list.filters.carbonLabel.low')
      case 'medium':
        return t('pages.recipe.list.filters.carbonLabel.medium')
      case 'high':
        return t('pages.recipe.list.filters.carbonLabel.high')
      default:
        return t('pages.recipe.list.filters.carbonLabel.notCalculated')
    }
  }

  const getStatusTag = (status: RecipeStatus) => {
    const statusMap = {
      [RecipeStatus.DRAFT]: { color: 'default', text: t('pages.recipe.list.status.draft') },
      [RecipeStatus.PUBLISHED]: { color: 'success', text: t('pages.recipe.list.status.published') },
      [RecipeStatus.ARCHIVED]: { color: 'default', text: t('pages.recipe.list.status.archived') },
    }
    const statusInfo = statusMap[status] || { color: 'default', text: t('pages.recipe.list.status.unknown') }
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>
  }

  const getChannelText = (channel: ChannelType) => {
    const channelMap = {
      [ChannelType.DINE_IN]: t('pages.recipe.create.channels.dineIn'),
      [ChannelType.TAKE_OUT]: t('pages.recipe.create.channels.takeOut'),
      [ChannelType.PROMOTION]: t('pages.recipe.create.channels.promotion'),
    }
    return channelMap[channel] || channel
  }

  const getCategoryText = (category: string) => {
    const categoryMap: Record<string, string> = {
      hot: t('pages.recipe.list.filters.category.hot'),
      cold: t('pages.recipe.list.filters.category.cold'),
      soup: t('pages.recipe.list.filters.category.soup'),
      staple: t('pages.recipe.list.filters.category.staple'),
      dessert: t('pages.recipe.list.filters.category.dessert'),
      drink: t('pages.recipe.list.filters.category.drink'),
    }
    return categoryMap[category] || category
  }

  const getCookingMethodText = (method: string) => {
    const methodMap: Record<string, string> = {
      steamed: t('pages.carbon.menu.modal.cookingMethods.steam'),
      boiled: t('pages.carbon.menu.modal.cookingMethods.boil'),
      stir_fried: t('pages.carbon.menu.modal.cookingMethods.fry'),
      fried: t('pages.carbon.menu.modal.cookingMethods.deepFry'),
      baked: t('pages.carbon.menu.modal.cookingMethods.bake'),
      stewed: t('pages.carbon.menu.modal.cookingMethods.boil'),
      cold_dish: t('pages.carbon.menu.modal.cookingMethods.raw'),
      raw: t('pages.carbon.menu.modal.cookingMethods.raw'),
    }
    return methodMap[method] || method
  }

  if (loading || !currentRecipe) {
    return <div>{t('common.loading')}</div>
  }

  const ingredientColumns = [
    {
      title: t('pages.recipe.detail.ingredientsTable.columns.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: t('pages.recipe.detail.ingredientsTable.columns.quantity'),
      dataIndex: 'quantity',
      key: 'quantity',
      render: (quantity: number, record: any) => `${quantity} ${record.unit || 'g'}`,
    },
    {
      title: t('pages.recipe.detail.ingredientsTable.columns.carbonCoefficient'),
      dataIndex: 'carbonCoefficient',
      key: 'carbonCoefficient',
      render: (coeff: number) =>
        coeff !== undefined ? `${coeff.toFixed(2)} kg CO₂e/kg` : '-',
    },
  ]

  return (
    <div>
      <Card
        title={
          <Space>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/recipe')}
              type="text"
            >
              {t('pages.recipe.detail.buttons.back')}
            </Button>
            <span>{currentRecipe.name}</span>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<EditOutlined />}
              onClick={() => navigate(`/recipe/edit/${id}`)}
            >
              {t('pages.recipe.detail.buttons.edit')}
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy}>
              {t('pages.recipe.detail.buttons.copy')}
            </Button>
            <Popconfirm
              title={t('pages.recipe.detail.messages.confirmDelete')}
              onConfirm={handleDelete}
              okText={t('common.confirm')}
              cancelText={t('common.cancel')}
            >
              <Button danger icon={<DeleteOutlined />}>
                {t('pages.recipe.detail.buttons.delete')}
              </Button>
            </Popconfirm>
          </Space>
        }
      >
        <Descriptions column={2} bordered>
          <Descriptions.Item label={t('pages.recipe.detail.fields.name')}>{currentRecipe.name}</Descriptions.Item>
          <Descriptions.Item label={t('pages.recipe.detail.fields.status')}>{getStatusTag(currentRecipe.status)}</Descriptions.Item>
          <Descriptions.Item label={t('pages.recipe.detail.fields.category')}>
            {getCategoryText(currentRecipe.category)}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.recipe.detail.fields.cookingMethod')}>
            {getCookingMethodText(currentRecipe.cookingMethod)}
          </Descriptions.Item>
          <Descriptions.Item label={t('pages.recipe.detail.fields.version')}>v{currentRecipe.version}</Descriptions.Item>
          <Descriptions.Item label={t('pages.recipe.detail.fields.channels')}>
            {currentRecipe.channels.length > 0 ? (
              <Space>
                {currentRecipe.channels.map((ch) => (
                  <Tag key={ch}>{getChannelText(ch)}</Tag>
                ))}
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          {currentRecipe.description && (
            <Descriptions.Item label={t('pages.recipe.detail.fields.description')} span={2}>
              {currentRecipe.description}
            </Descriptions.Item>
          )}
        </Descriptions>

        <Divider orientation="left">{t('pages.recipe.detail.sections.carbon')}</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title={t('pages.recipe.detail.fields.carbonFootprint')}
              value={currentRecipe.carbonFootprint || 0}
              precision={2}
              suffix="kg CO₂e"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title={t('pages.recipe.detail.fields.carbonLabel')}
              value={currentRecipe.carbonLabel ? getCarbonLabelText(currentRecipe.carbonLabel) : t('pages.recipe.list.filters.carbonLabel.notCalculated')}
              valueRender={(value) => currentRecipe.carbonLabel ? (
                <Tag color={getCarbonLabelColor(currentRecipe.carbonLabel)}>
                  {value}
                </Tag>
              ) : value}
            />
          </Col>
          {currentRecipe.carbonScore !== undefined && (
            <Col span={8}>
              <Statistic title={t('pages.recipe.detail.fields.carbonScore')} value={currentRecipe.carbonScore} suffix={t('common.minute') === '分钟' ? '分' : 'pts'} />
            </Col>
          )}
        </Row>

        <Divider orientation="left">{t('pages.recipe.detail.sections.ingredients')}</Divider>
        <Table
          columns={ingredientColumns}
          dataSource={currentRecipe.ingredients}
          rowKey={(record, index) => `${record.ingredientId}-${index}`}
          pagination={false}
          size="small"
        />
      </Card>
    </div>
  )
}

export default RecipeDetail

