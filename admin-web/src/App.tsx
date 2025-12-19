import { Spin } from 'antd'
import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthGuard from './components/AuthGuard'
import RouteGuard from './components/RouteGuard'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import RecipeCategories from './pages/recipe/Categories'
import RecipeDetail from './pages/recipe/Detail'
import RecipeEdit from './pages/recipe/Edit'
import RecipeList from './pages/recipe/List'

// 懒加载组件
const Dashboard = lazy(() => import('./pages/Dashboard'))

// 核心模块1: 气候餐厅认证
import CertificationApply from './pages/certification/Apply'
import CertificationCertificate from './pages/certification/Certificate'
import CertificationExport from './pages/certification/Export'
import CertificationInspection from './pages/certification/Inspection'
import CertificationMaterialHistory from './pages/certification/MaterialHistory'
import CertificationMaterials from './pages/certification/Materials'
import CertificationReview from './pages/certification/Review'
import CertificationStandard from './pages/certification/Standard'
import CertificationStatus from './pages/certification/Status'
import CertificationTrialStats from './pages/certification/TrialStats'

// 核心模块2: 碳足迹核算
import BaselineAdd from './pages/carbon/BaselineAdd'
import BaselineDetail from './pages/carbon/BaselineDetail'
import BaselineEdit from './pages/carbon/BaselineEdit'
import BaselineImport from './pages/carbon/BaselineImport'
import BaselineList from './pages/carbon/BaselineList'
import MealSetBaselineAdd from './pages/carbon/MealSetBaselineAdd'
import MealSetBaselineDetail from './pages/carbon/MealSetBaselineDetail'
import MealSetBaselineEdit from './pages/carbon/MealSetBaselineEdit'
import MealSetBaselineList from './pages/carbon/MealSetBaselineList'
import FactorAdd from './pages/carbon/FactorAdd'
import FactorDetail from './pages/carbon/FactorDetail'
import FactorEdit from './pages/carbon/FactorEdit'
import FactorImport from './pages/carbon/FactorImport'
import FactorLibrary from './pages/carbon/FactorLibrary'
import CarbonMenu from './pages/carbon/Menu'
import CarbonOrder from './pages/carbon/Order'
import CarbonReport from './pages/carbon/Report'
import ApprovalRequest from './pages/system/ApprovalRequest'

// 核心模块3: 供应链溯源
import TraceabilityBatch from './pages/traceability/Batch'
import CertificateList from './pages/traceability/CertificateList'
import CertificateView from './pages/traceability/CertificateView'
import TraceabilityChain from './pages/traceability/Chain'
import IngredientLotAdd from './pages/traceability/IngredientLotAdd'
import IngredientLotDetail from './pages/traceability/IngredientLotDetail'
import IngredientLotEdit from './pages/traceability/IngredientLotEdit'
import IngredientLotList from './pages/traceability/IngredientLotList'
import TraceabilitySupplier from './pages/traceability/Supplier'
import SupplierAdd from './pages/traceability/SupplierAdd'
import SupplierDetail from './pages/traceability/SupplierDetail'
import SupplierEdit from './pages/traceability/SupplierEdit'
import TraceChainBuild from './pages/traceability/TraceChainBuild'
import TraceChainList from './pages/traceability/TraceChainList'
import TraceChainView from './pages/traceability/TraceChainView'

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
import OperationLog from './pages/platform/OperationLog'
import PlatformRestaurantList from './pages/platform/RestaurantList'
import PlatformStatistics from './pages/platform/Statistics'
import TenantList from './pages/platform/TenantList'
import RestaurantManage from './pages/restaurant/Manage'

// 个人中心
import OnboardingApply from './pages/onboarding/Apply'
import ProfilePage from './pages/profile'
import SystemAudit from './pages/system/Audit'
import SystemBackup from './pages/system/Backup'
import SystemMonitor from './pages/system/Monitor'
import SystemRoles from './pages/system/Roles'
import SystemUsers from './pages/system/Users'

// 消息管理
import MessageDetail from './pages/messages/Detail'
import MessageList from './pages/messages/List'

// 基础数据管理（仅平台运营者）
import BaseImport from './pages/base/Import'
import BaseIngredientEdit from './pages/base/IngredientEdit'
import BaseIngredientList from './pages/base/IngredientList'
import BaseMeatIngredientEdit from './pages/base/MeatIngredientEdit'
import BaseMeatIngredientList from './pages/base/MeatIngredientList'
import BaseRecipeDetail from './pages/base/RecipeDetail'
import BaseRecipeEdit from './pages/base/RecipeEdit'
import BaseRecipeList from './pages/base/RecipeList'
import BaseStatistics from './pages/base/Statistics'

// 素食人员管理模块（懒加载）
const CustomerDetail = lazy(() => import('./pages/vegetarian-personnel/CustomerDetail'))
const CustomerList = lazy(() => import('./pages/vegetarian-personnel/CustomerList'))
const VegetarianPersonnelDashboard = lazy(() => import('./pages/vegetarian-personnel/Dashboard'))
const StaffAdd = lazy(() => import('./pages/vegetarian-personnel/StaffAdd'))
const StaffEdit = lazy(() => import('./pages/vegetarian-personnel/StaffEdit'))
const StaffList = lazy(() => import('./pages/vegetarian-personnel/StaffList'))
const StaffStats = lazy(() => import('./pages/vegetarian-personnel/StaffStats'))

// 加载中的占位组件
const LoadingFallback: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    minHeight: '400px',
    width: '100%'
  }}>
    <Spin size="large" />
  </div>
)

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
          <Route 
            path="dashboard" 
            element={
              <Suspense fallback={<LoadingFallback />}>
                <Dashboard />
              </Suspense>
            } 
          />
          
          {/* 核心模块1: 气候餐厅认证 */}
          <Route path="certification/apply" element={<CertificationApply />} />
          <Route path="certification/status" element={<CertificationStatus />} />
          <Route path="certification/certificate" element={<CertificationCertificate />} />
          <Route path="certification/trial-stats" element={<CertificationTrialStats />} />
          <Route path="certification/review" element={<CertificationReview />} />
          <Route path="certification/materials" element={<CertificationMaterials />} />
          <Route path="certification/standard" element={<CertificationStandard />} />
          <Route path="certification/materials/history" element={<CertificationMaterialHistory />} />
          <Route path="certification/export" element={<CertificationExport />} />
          <Route path="certification/inspection" element={<CertificationInspection />} />
          
          {/* 核心模块2: 碳足迹核算（餐厅管理员和碳核算专员可见） */}
          <Route 
            path="carbon/menu" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin', 'carbon_specialist']}>
                <CarbonMenu />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/order" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin', 'carbon_specialist']}>
                <CarbonOrder />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/report" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin', 'carbon_specialist']}>
                <CarbonReport />
              </RouteGuard>
            } 
          />
          {/* 基准值管理（仅碳核算专员可见） */}
          <Route 
            path="carbon/baseline" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <BaselineList />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/baseline/:baselineId" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <BaselineDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/baseline/:baselineId/edit" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <BaselineEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/baseline/add" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <BaselineAdd />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/baseline/import" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <BaselineImport />
              </RouteGuard>
            } 
          />
          {/* 一餐饭基准值管理（仅碳核算专员可见） */}
          <Route 
            path="carbon/meal-set-baselines" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <MealSetBaselineList />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/meal-set-baselines/:baselineId" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <MealSetBaselineDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/meal-set-baselines/:baselineId/edit" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <MealSetBaselineEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/meal-set-baselines/add" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <MealSetBaselineAdd />
              </RouteGuard>
            } 
          />
          {/* 因子库管理（仅碳核算专员可见） */}
          <Route 
            path="carbon/factor-library" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <FactorLibrary />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/factor-library/add" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <FactorAdd />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/factor-library/:factorId" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <FactorDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/factor-library/:factorId/edit" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <FactorEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="carbon/factor-library/import" 
            element={
              <RouteGuard allowedRoles={['carbon_specialist']}>
                <FactorImport />
              </RouteGuard>
            } 
          />
          
          {/* 核心模块3: 供应链溯源（仅餐厅管理员可见） */}
          <Route 
            path="traceability/suppliers" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceabilitySupplier />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/suppliers/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <SupplierDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/suppliers/:id/edit" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <SupplierEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/suppliers/add" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <SupplierAdd />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/lots" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <IngredientLotList />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/lots/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <IngredientLotDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/lots/:id/edit" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <IngredientLotEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/lots/add" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <IngredientLotAdd />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/chains" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceChainList />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/chains/build" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceChainBuild />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/chains/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceChainView />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/certificates" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <CertificateList />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/certificates/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <CertificateView />
              </RouteGuard>
            } 
          />
          {/* 兼容旧路由 */}
          <Route 
            path="traceability/batch" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceabilityBatch />
              </RouteGuard>
            } 
          />
          <Route 
            path="traceability/chain" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <TraceabilityChain />
              </RouteGuard>
            } 
          />
          
          {/* 核心模块4: 餐厅运营（仅餐厅管理员可见） */}
          <Route 
            path="operation/order" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <OperationOrder />
              </RouteGuard>
            } 
          />
          <Route 
            path="operation/ledger" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <OperationLedger />
              </RouteGuard>
            } 
          />
          <Route 
            path="operation/behavior" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <OperationBehavior />
              </RouteGuard>
            } 
          />
          <Route 
            path="operation/coupon" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <OperationCoupon />
              </RouteGuard>
            } 
          />
          <Route 
            path="operation/review" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <OperationReview />
              </RouteGuard>
            } 
          />
          
          {/* 核心模块5: 报表与生态拓展 */}
          <Route path="report/business" element={<ReportBusiness />} />
          <Route path="report/carbon" element={<ReportCarbon />} />
          <Route path="report/esg" element={<ReportESG />} />
          <Route path="report/dashboard" element={<ReportDashboard />} />
          
          {/* 菜谱管理（仅餐厅管理员可见） */}
          <Route 
            path="recipe" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <RecipeList />
              </RouteGuard>
            } 
          />
          <Route 
            path="recipe/list" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <RecipeList />
              </RouteGuard>
            } 
          />
          <Route 
            path="recipe/edit/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <RecipeEdit />
              </RouteGuard>
            } 
          />
          <Route 
            path="recipe/detail/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <RecipeDetail />
              </RouteGuard>
            } 
          />
          <Route 
            path="recipe/categories" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <RecipeCategories />
              </RouteGuard>
            } 
          />
          
          {/* 餐厅管理（仅餐厅管理员可见） */}
          <Route path="restaurant/manage" element={<RestaurantManage />} />
          
          {/* 餐厅认证路由（兼容旧路径） */}
          <Route path="admin/restaurants/:restaurantId/certification" element={<CertificationApply />} />
          <Route path="restaurants/:restaurantId/certification" element={<CertificationApply />} />
          
          {/* 平台管理模块（仅平台管理员可见） */}
          <Route path="platform/tenants" element={<TenantList />} />
          <Route path="platform/restaurants" element={<PlatformRestaurantList />} />
          <Route path="platform/cross-tenant" element={<PlatformCrossTenant />} />
          <Route path="platform/statistics" element={<PlatformStatistics />} />
          <Route path="platform/account-approvals" element={<AccountApprovals />} />
          <Route path="platform/operation-log" element={<OperationLog />} />
          <Route path="platform/admin-users" element={<AdminUsers />} />
          
          {/* 系统管理（仅系统管理员可见 - 由菜单与守卫共同控制） */}
          <Route path="system/users" element={<SystemUsers />} />
          <Route path="system/roles" element={<SystemRoles />} />
          <Route path="system/audit" element={<SystemAudit />} />
          <Route 
            path="system/approval-request" 
            element={
              <RouteGuard allowedRoles={['system_admin', 'carbon_specialist']}>
                <ApprovalRequest />
              </RouteGuard>
            } 
          />
          <Route path="system/monitor" element={<SystemMonitor />} />
          <Route path="system/backup" element={<SystemBackup />} />
          
          {/* 个人中心 */}
          <Route path="profile" element={<ProfilePage />} />
          
          {/* 消息管理 */}
          <Route path="messages" element={<MessageList />} />
          <Route path="messages/:messageId" element={<MessageDetail />} />

          {/* 基础数据管理（仅平台运营者） */}
          <Route path="base/ingredients" element={<BaseIngredientList />} />
          <Route path="base/ingredients/add" element={<BaseIngredientEdit />} />
          <Route path="base/ingredients/:id/edit" element={<BaseIngredientEdit />} />
          <Route path="base/meat-ingredients" element={<BaseMeatIngredientList />} />
          <Route path="base/meat-ingredients/new" element={<BaseMeatIngredientEdit />} />
          <Route path="base/meat-ingredients/:id/edit" element={<BaseMeatIngredientEdit />} />
          <Route path="base/recipes" element={<BaseRecipeList />} />
          <Route path="base/recipes/add" element={<BaseRecipeEdit />} />
          <Route path="base/recipes/:id/edit" element={<BaseRecipeEdit />} />
          <Route path="base/recipes/:id" element={<BaseRecipeDetail />} />
          <Route path="base/statistics" element={<BaseStatistics />} />
          <Route path="base/import" element={<BaseImport />} />
          
          {/* 素食人员管理模块（仅餐厅管理员可见） */}
          <Route 
            path="vegetarian-personnel" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <VegetarianPersonnelDashboard />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/dashboard" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <VegetarianPersonnelDashboard />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/staff" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <StaffList />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/staff/add" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <StaffAdd />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/staff/edit/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <StaffEdit />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/staff/stats" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <StaffStats />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/customers" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <CustomerList />
                </Suspense>
              </RouteGuard>
            } 
          />
          <Route 
            path="vegetarian-personnel/customers/:id" 
            element={
              <RouteGuard allowedRoles={['restaurant_admin']}>
                <Suspense fallback={<LoadingFallback />}>
                  <CustomerDetail />
                </Suspense>
              </RouteGuard>
            } 
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

