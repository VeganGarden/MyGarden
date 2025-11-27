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
import CarbonMenu from './pages/carbon/Menu'
import CarbonOrder from './pages/carbon/Order'
import CarbonReport from './pages/carbon/Report'

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
import BaseRecipeEdit from './pages/base/RecipeEdit'
import BaseRecipeList from './pages/base/RecipeList'
import BaseStatistics from './pages/base/Statistics'

// 素食人员管理模块
import CustomerDetail from './pages/vegetarian-personnel/CustomerDetail'
import CustomerList from './pages/vegetarian-personnel/CustomerList'
import VegetarianPersonnelDashboard from './pages/vegetarian-personnel/Dashboard'
import StaffAdd from './pages/vegetarian-personnel/StaffAdd'
import StaffEdit from './pages/vegetarian-personnel/StaffEdit'
import StaffList from './pages/vegetarian-personnel/StaffList'
import StaffStats from './pages/vegetarian-personnel/StaffStats'

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
          <Route path="certification/trial-stats" element={<CertificationTrialStats />} />
          <Route path="certification/review" element={<CertificationReview />} />
          <Route path="certification/materials" element={<CertificationMaterials />} />
          <Route path="certification/standard" element={<CertificationStandard />} />
          <Route path="certification/materials/history" element={<CertificationMaterialHistory />} />
          <Route path="certification/export" element={<CertificationExport />} />
          <Route path="certification/inspection" element={<CertificationInspection />} />
          
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
          <Route path="recipe/list" element={<RecipeList />} />
          <Route path="recipe/create" element={<RecipeCreate />} />
          <Route path="recipe/edit/:id" element={<RecipeEdit />} />
          <Route path="recipe/detail/:id" element={<RecipeDetail />} />
          <Route path="recipe/categories" element={<RecipeCategories />} />
          
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
          <Route path="base/statistics" element={<BaseStatistics />} />
          <Route path="base/import" element={<BaseImport />} />
          
          {/* 素食人员管理模块 */}
          <Route path="vegetarian-personnel" element={<VegetarianPersonnelDashboard />} />
          <Route path="vegetarian-personnel/dashboard" element={<VegetarianPersonnelDashboard />} />
          <Route path="vegetarian-personnel/staff" element={<StaffList />} />
          <Route path="vegetarian-personnel/staff/add" element={<StaffAdd />} />
          <Route path="vegetarian-personnel/staff/edit/:id" element={<StaffEdit />} />
          <Route path="vegetarian-personnel/staff/stats" element={<StaffStats />} />
          <Route path="vegetarian-personnel/customers" element={<CustomerList />} />
          <Route path="vegetarian-personnel/customers/:id" element={<CustomerDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App

