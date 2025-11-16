import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import MainLayout from './layouts/MainLayout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import RecipeCategories from './pages/recipe/Categories'
import RecipeCreate from './pages/recipe/Create'
import RecipeDetail from './pages/recipe/Detail'
import RecipeEdit from './pages/recipe/Edit'
import RecipeList from './pages/recipe/List'

// 核心模块1: 气候餐厅认证
import CertificationApply from './pages/certification/Apply'
import CertificationCertificate from './pages/certification/Certificate'
import CertificationStatus from './pages/certification/Status'

// 核心模块2: 碳足迹核算
import BaselineAdd from './pages/carbon/BaselineAdd'
import BaselineDetail from './pages/carbon/BaselineDetail'
import BaselineEdit from './pages/carbon/BaselineEdit'
import BaselineImport from './pages/carbon/BaselineImport'
import BaselineList from './pages/carbon/BaselineList'
import CarbonMenu from './pages/carbon/Menu'
import CarbonOrder from './pages/carbon/Order'
import CarbonReport from './pages/carbon/Report'

// 核心模块3: 供应链溯源
import TraceabilityBatch from './pages/traceability/Batch'
import TraceabilityChain from './pages/traceability/Chain'
import TraceabilitySupplier from './pages/traceability/Supplier'

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
import AccountApprovals from './pages/platform/AccountApprovals'
import AdminUsers from './pages/platform/AdminUsers'
import PlatformCrossTenant from './pages/platform/CrossTenant'
import PlatformRestaurantList from './pages/platform/RestaurantList'
import PlatformStatistics from './pages/platform/Statistics'

// 个人中心
import OnboardingApply from './pages/onboarding/Apply'
import ProfilePage from './pages/profile'
import SystemAudit from './pages/system/Audit'
import SystemBackup from './pages/system/Backup'
import SystemMonitor from './pages/system/Monitor'
import SystemRoles from './pages/system/Roles'
import SystemUsers from './pages/system/Users'

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* 公共路由：登录与入驻申请 */}
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<OnboardingApply />} />
        {/* 受保护路由 */}
        <Route
          path="/"
          element={
            <AuthGuard>
              <MainLayout />
            </AuthGuard>
          }
        >
          <Route
            index
            element={<Navigate to="/dashboard" replace />}
          />
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
          <Route path="traceability/supplier" element={<TraceabilitySupplier />} />
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
          <Route path="platform/account-approvals" element={<AccountApprovals />} />
          <Route path="platform/admin-users" element={<AdminUsers />} />
          
          {/* 系统管理（仅系统管理员可见 - 由菜单与守卫共同控制） */}
          <Route path="system/users" element={<SystemUsers />} />
          <Route path="system/roles" element={<SystemRoles />} />
          <Route path="system/audit" element={<SystemAudit />} />
          <Route path="system/monitor" element={<SystemMonitor />} />
          <Route path="system/backup" element={<SystemBackup />} />
          
          {/* 个人中心 */}
          <Route path="profile" element={<ProfilePage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

