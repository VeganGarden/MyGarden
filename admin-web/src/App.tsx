import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, Outlet } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import AuthGuard from './components/AuthGuard'
import RecipeCreate from './pages/recipe/Create'
import RecipeEdit from './pages/recipe/Edit'
import RecipeList from './pages/recipe/List'
import RecipeDetail from './pages/recipe/Detail'
import RecipeCategories from './pages/recipe/Categories'

// 核心模块1: 气候餐厅认证
import CertificationApply from './pages/certification/Apply'
import CertificationCertificate from './pages/certification/Certificate'
import CertificationStatus from './pages/certification/Status'

// 核心模块2: 碳足迹核算
import CarbonMenu from './pages/carbon/Menu'
import CarbonOrder from './pages/carbon/Order'
import CarbonReport from './pages/carbon/Report'
import BaselineList from './pages/carbon/BaselineList'
import BaselineDetail from './pages/carbon/BaselineDetail'
import BaselineAdd from './pages/carbon/BaselineAdd'
import BaselineEdit from './pages/carbon/BaselineEdit'
import BaselineImport from './pages/carbon/BaselineImport'

// 核心模块3: 供应链溯源
import TraceabilityBatch from './pages/traceability/Batch'
import TraceabilityChain from './pages/traceability/Chain'
import TraceabilitySupplier from './pages/traceability/Supplier'
import SupplierDetail from './pages/traceability/SupplierDetail'
import SupplierAdd from './pages/traceability/SupplierAdd'
import SupplierEdit from './pages/traceability/SupplierEdit'
import IngredientLotList from './pages/traceability/IngredientLotList'
import IngredientLotDetail from './pages/traceability/IngredientLotDetail'
import IngredientLotAdd from './pages/traceability/IngredientLotAdd'
import IngredientLotEdit from './pages/traceability/IngredientLotEdit'
import TraceChainList from './pages/traceability/TraceChainList'
import TraceChainBuild from './pages/traceability/TraceChainBuild'
import TraceChainView from './pages/traceability/TraceChainView'
import CertificateList from './pages/traceability/CertificateList'
import CertificateView from './pages/traceability/CertificateView'

// 核心模块4: 餐厅运营
import OperationBehavior from './pages/operation/Behavior'
import OperationCoupon from './pages/operation/Coupon'
import OperationLedger from './pages/operation/Ledger'
import OperationOrder from './pages/operation/Order'
import OperationReview from './pages/operation/Review'

// 核心模块5: 报表与生态拓展
import ReportBusiness from './pages/report/Business'
import ReportCarbon from './pages/report/Carbon'
import ReportDashboard from './pages/report/Dashboard'
import ReportESG from './pages/report/ESG'

// 平台管理模块（仅平台管理员可见）
import PlatformRestaurantList from './pages/platform/RestaurantList'
import PlatformCrossTenant from './pages/platform/CrossTenant'
import PlatformStatistics from './pages/platform/Statistics'

// 个人中心
import ProfilePage from './pages/profile'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthGuard>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={<MainLayout />}
          >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          {/* 核心模块1: 气候餐厅认证 */}
          <Route path="certification/apply" element={<CertificationApply />} />
          <Route path="certification/status" element={<CertificationStatus />} />
          <Route path="certification/certificate" element={<CertificationCertificate />} />
          
          {/* 核心模块2: 碳足迹核算 */}
          <Route path="carbon/menu" element={<CarbonMenu />} />
          <Route path="carbon/order" element={<CarbonOrder />} />
          <Route path="carbon/report" element={<CarbonReport />} />
          <Route path="carbon/baseline" element={<BaselineList />} />
          <Route path="carbon/baseline/:baselineId" element={<BaselineDetail />} />
          <Route path="carbon/baseline/:baselineId/edit" element={<BaselineEdit />} />
          <Route path="carbon/baseline/add" element={<BaselineAdd />} />
          <Route path="carbon/baseline/import" element={<BaselineImport />} />
          
          {/* 核心模块3: 供应链溯源 */}
          <Route path="traceability/suppliers" element={<TraceabilitySupplier />} />
          <Route path="traceability/suppliers/:id" element={<SupplierDetail />} />
          <Route path="traceability/suppliers/:id/edit" element={<SupplierEdit />} />
          <Route path="traceability/suppliers/add" element={<SupplierAdd />} />
          <Route path="traceability/lots" element={<IngredientLotList />} />
          <Route path="traceability/lots/:id" element={<IngredientLotDetail />} />
          <Route path="traceability/lots/:id/edit" element={<IngredientLotEdit />} />
          <Route path="traceability/lots/add" element={<IngredientLotAdd />} />
          <Route path="traceability/chains" element={<TraceChainList />} />
          <Route path="traceability/chains/build" element={<TraceChainBuild />} />
          <Route path="traceability/chains/:id" element={<TraceChainView />} />
          <Route path="traceability/certificates" element={<CertificateList />} />
          <Route path="traceability/certificates/:id" element={<CertificateView />} />
          {/* 兼容旧路由 */}
          <Route path="traceability/batch" element={<TraceabilityBatch />} />
          <Route path="traceability/chain" element={<TraceabilityChain />} />
          
          {/* 核心模块4: 餐厅运营 */}
          <Route path="operation/order" element={<OperationOrder />} />
          <Route path="operation/ledger" element={<OperationLedger />} />
          <Route path="operation/behavior" element={<OperationBehavior />} />
          <Route path="operation/coupon" element={<OperationCoupon />} />
          <Route path="operation/review" element={<OperationReview />} />
          
          {/* 核心模块5: 报表与生态拓展 */}
          <Route path="report/business" element={<ReportBusiness />} />
          <Route path="report/carbon" element={<ReportCarbon />} />
          <Route path="report/esg" element={<ReportESG />} />
          <Route path="report/dashboard" element={<ReportDashboard />} />
          
          {/* 菜谱管理 */}
          <Route path="recipe" element={<RecipeList />} />
          <Route path="recipe/create" element={<RecipeCreate />} />
          <Route path="recipe/edit/:id" element={<RecipeEdit />} />
          <Route path="recipe/detail/:id" element={<RecipeDetail />} />
          <Route path="recipe/categories" element={<RecipeCategories />} />
          
          {/* 平台管理模块（仅平台管理员可见） */}
          <Route path="platform/restaurants" element={<PlatformRestaurantList />} />
          <Route path="platform/cross-tenant" element={<PlatformCrossTenant />} />
          <Route path="platform/statistics" element={<PlatformStatistics />} />
          
          {/* 个人中心 */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
      </AuthGuard>
    </BrowserRouter>
  )
}

export default App

