import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRecipe } from '@/store/slices/recipeSlice'
import { message } from 'antd'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import RecipeCreate from './Create'

const RecipeEdit: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { currentRecipe, loading } = useAppSelector((state) => state.recipe)
  const [initialized, setInitialized] = useState(false)

  useEffect(() => {
    if (id) {
      loadRecipe()
    }
  }, [id])

  const loadRecipe = async () => {
    try {
      await dispatch(fetchRecipe(id!)).unwrap()
      setInitialized(true)
    } catch (error: any) {
      message.error(error.message || t('pages.recipe.create.messages.loadFailed'))
      navigate('/recipe')
    }
  }

  if (loading || !initialized) {
    return <div>{t('pages.recipe.edit.loading')}</div>
  }

  // 复用Create组件，传入编辑模式
  return <RecipeCreate editMode={true} initialData={currentRecipe} />
}

export default RecipeEdit

