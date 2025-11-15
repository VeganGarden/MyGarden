import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { message } from 'antd'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { fetchRecipe, updateRecipe } from '@/store/slices/recipeSlice'
import RecipeCreate from './Create'

const RecipeEdit: React.FC = () => {
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
      message.error(error.message || '加载菜谱失败')
      navigate('/recipe')
    }
  }

  if (loading || !initialized) {
    return <div>加载中...</div>
  }

  // 复用Create组件，传入编辑模式
  return <RecipeCreate editMode={true} initialData={currentRecipe} />
}

export default RecipeEdit

