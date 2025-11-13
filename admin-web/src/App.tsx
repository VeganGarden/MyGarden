import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import RecipeList from './pages/recipe/List'
import RecipeCreate from './pages/recipe/Create'
import RecipeEdit from './pages/recipe/Edit'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <MainLayout>
              <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/recipe" element={<RecipeList />} />
                <Route path="/recipe/create" element={<RecipeCreate />} />
                <Route path="/recipe/edit/:id" element={<RecipeEdit />} />
              </Routes>
            </MainLayout>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App

