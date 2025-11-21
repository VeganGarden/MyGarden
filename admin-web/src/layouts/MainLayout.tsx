import BrandLogo from '@/components/BrandLogo'
import FullscreenToggle from '@/components/FullscreenToggle'
import HelpCenter from '@/components/HelpCenter'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import NotificationCenter from '@/components/NotificationCenter'
import PageTransition from '@/components/PageTransition'
import RestaurantSwitcher from '@/components/RestaurantSwitcher'
import ThemeToggle from '@/components/ThemeToggle'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  DatabaseOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShopOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Drawer, Dropdown, Layout, Menu, Space, message } from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import styles from './MainLayout.module.css'

const { Header, Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state: any) => state.auth)
  const { t, i18n } = useTranslation()

  // 检测移动端和平板端
  const [isMobile, setIsMobile] = useState(false)
  const [isTablet, setIsTablet] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth
      const wasMobile = isMobile
      const wasTablet = isTablet
      
      setIsMobile(width < 768)
      setIsTablet(width >= 768 && width < 1024)
      
      // 仅在首次加载或从移动端切换到平板端时，自动折叠侧边栏
      if (!isInitialized && width >= 768 && width < 1024) {
        setCollapsed(true)
        setIsInitialized(true)
      } else if (wasMobile && width >= 768 && width < 1024) {
        // 从移动端切换到平板端，自动折叠
        setCollapsed(true)
      }
    }

    checkDevice()
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [isMobile, isTablet, isInitialized])

  // 移动端菜单点击后关闭
  useEffect(() => {
    if (isMobile && mobileMenuOpen) {
      const handleMenuClick = () => {
        setMobileMenuOpen(false)
      }
      // 延迟关闭，让导航先完成
      const timer = setTimeout(handleMenuClick, 300)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, isMobile, mobileMenuOpen])

  // 快捷键支持
  useKeyboardShortcuts([
    {
      key: 'b',
      ctrlKey: true,
      callback: () => setCollapsed(!collapsed),
    },
  ])

  // 角色判断
  const isPlatformAdmin = user?.role === 'platform_operator'
  const isSystemAdmin = user?.role === 'system_admin'
  const isRestaurantAdmin = user?.role === 'restaurant_admin'

  // 使用useMemo确保菜单项能够响应user状态变化和语言变化
  const menuItems = useMemo(() => {
    if (isSystemAdmin) {
      // 系统管理员仅系统域菜单
      return [
        {
          key: '/system',
          icon: <SettingOutlined />,
          label: t('menu.system'),
          children: [
            { key: '/system/users', label: t('menu.systemUsers') },
            { key: '/system/roles', label: t('menu.systemRoles') },
            { key: '/system/audit', label: t('menu.systemAudit') },
            { key: '/system/monitor', label: t('menu.systemMonitor') },
            { key: '/system/backup', label: t('menu.systemBackup') },
          ],
        },
      ]
    }
    return [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('menu.dashboard'),
    },
    {
      key: '/certification',
      icon: <SafetyCertificateOutlined />,
      label: t('menu.climateRestaurant'),
      children: [
        {
          key: '/certification/apply',
          label: t('menu.certificationApplication'),
        },
        {
          key: '/certification/status',
          label: t('menu.certificationProgress'),
        },
        {
          key: '/certification/certificate',
          label: t('menu.certificationCertificate'),
        },
      ],
    },
    {
      key: '/carbon',
      icon: <CalculatorOutlined />,
      label: t('menu.carbonCalculator'),
      children: [
        {
          key: '/carbon/menu',
          label: t('menu.carbonMenu'),
        },
        {
          key: '/carbon/order',
          label: t('menu.carbonOrder'),
        },
        {
          key: '/carbon/report',
          label: t('menu.carbonReport'),
        },
        {
          key: '/carbon/baseline',
          label: t('menu.carbonBaseline'),
        },
      ],
    },
    {
      key: '/traceability',
      icon: <ApartmentOutlined />,
      label: t('menu.traceability'),
      children: [
        {
          key: '/traceability/suppliers',
          label: t('menu.traceabilitySuppliers'),
        },
        {
          key: '/traceability/lots',
          label: t('menu.traceabilityLots'),
        },
        {
          key: '/traceability/chains',
          label: t('menu.traceabilityChains'),
        },
        {
          key: '/traceability/certificates',
          label: t('menu.traceabilityCertificates'),
        },
      ],
    },
    {
      key: '/operation',
      icon: <ShoppingCartOutlined />,
      label: t('menu.operation'),
      children: [
        {
          key: '/operation/order',
          label: t('menu.operationOrder'),
        },
        {
          key: '/operation/ledger',
          label: t('menu.operationLedger'),
        },
        {
          key: '/operation/behavior',
          label: t('menu.operationBehavior'),
        },
        {
          key: '/operation/coupon',
          label: t('menu.operationCoupon'),
        },
        {
          key: '/operation/review',
          label: t('menu.operationReview'),
        },
      ],
    },
    {
      key: '/report',
      icon: <BarChartOutlined />,
      label: t('menu.report'),
      children: [
        {
          key: '/report/business',
          label: t('menu.reportBusiness'),
        },
        {
          key: '/report/carbon',
          label: t('menu.reportCarbon'),
        },
        {
          key: '/report/esg',
          label: t('menu.reportESG'),
        },
        {
          key: '/report/dashboard',
          label: t('menu.reportDashboard'),
        },
      ],
    },
    {
      key: '/recipe',
      icon: <BookOutlined />,
      label: t('menu.recipe'),
      children: [
        {
          key: '/recipe/list',
          label: t('menu.recipeList'),
        },
        {
          key: '/recipe/create',
          label: t('menu.recipeCreate'),
        },
        {
          key: '/recipe/categories',
          label: t('menu.recipeCategories'),
        },
      ],
    },
    // 餐厅管理（仅餐厅管理员可见）
    ...(isRestaurantAdmin
      ? [
          {
            key: '/restaurant',
            icon: <ShopOutlined />,
            label: '餐厅管理',
            children: [
              {
                key: '/restaurant/manage',
                label: '我的餐厅',
              },
            ],
          },
        ]
      : []),
    // 基础数据管理（仅平台运营可见）
    ...(isPlatformAdmin
      ? [
          {
            key: '/base',
            icon: <DatabaseOutlined />,
            label: '基础数据管理',
            children: [
              {
                key: '/base/ingredients',
                label: '基础素食食材',
              },
              {
                key: '/base/meat-ingredients',
                label: '基础荤食食材',
              },
              {
                key: '/base/recipes',
                label: '基础食谱',
              },
              {
                key: '/base/statistics',
                label: '数据统计',
              },
            ],
          },
        ]
      : []),
    // 平台管理模块（仅平台运营可见）
    ...(isPlatformAdmin
      ? [
          {
            key: '/platform',
            icon: <SettingOutlined />,
            label: t('menu.platform'),
            children: [
              {
                key: '/platform/tenants',
                label: t('menu.platformTenants'),
              },
              {
                key: '/platform/restaurants',
                label: t('menu.platformRestaurants'),
              },
              {
                key: '/platform/cross-tenant',
                label: t('menu.platformCrossTenant'),
              },
              {
                key: '/platform/statistics',
                label: t('menu.platformStatistics'),
              },
              {
                key: '/platform/account-approvals',
                label: t('menu.platformAccountApprovals'),
              },
              {
                key: '/platform/operation-log',
                label: t('menu.platformOperationLog'),
              },
              {
                // 平台级账户管理改由系统管理员在"系统管理 → 用户管理"中处理
                // 此入口对平台运营隐藏
                key: '/platform/admin-users__hidden',
                label: '',
                style: { display: 'none' } as any,
              },
            ],
          },
        ]
      : []),
  ]}, [isPlatformAdmin, isSystemAdmin, isRestaurantAdmin, t])

  const handleLogout = () => {
    dispatch(logout())
    message.success(t('common.success'))
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: t('header.profile'),
      onClick: () => {
        navigate('/profile')
      },
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('header.logout'),
      onClick: handleLogout,
    },
  ]

  // 移动端侧边栏处理
  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    if (isMobile) {
      setMobileMenuOpen(false)
    }
  }

  // 移动端菜单内容
  const mobileMenuContent = (
    <>
      <BrandLogo collapsed={false} />
      <Menu
        theme="light"
        mode="inline"
        selectedKeys={[location.pathname]}
        openKeys={menuItems
          .filter((item) => item.children)
          .map((item) => item.key as string)}
        items={menuItems}
        onClick={handleMenuClick}
        getPopupContainer={(node) => node.parentElement || document.body}
      />
    </>
  )

  return (
    <Layout className={styles.mainLayout}>
      {/* 桌面端固定侧边栏 */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          className={styles.sider}
          width={i18n.language === 'en' ? 240 : 200} // 英文时增加宽度
          collapsedWidth={80}
        >
          <BrandLogo collapsed={collapsed} />
          <div className={styles.menuContainer}>
            <Menu
              theme="light"
              mode="inline"
              selectedKeys={[location.pathname]}
              openKeys={menuItems
                .filter((item) => item.children)
                .map((item) => item.key as string)}
              items={menuItems}
              onClick={handleMenuClick}
              getPopupContainer={(node) => node.parentElement || document.body}
            />
          </div>
        </Sider>
      )}

      {/* 移动端抽屉式侧边栏 */}
      {isMobile && (
        <Drawer
          title={null}
          placement="left"
          closable={false}
          onClose={() => setMobileMenuOpen(false)}
          open={mobileMenuOpen}
          bodyStyle={{ padding: 0 }}
          width={280}
          className={styles.mobileDrawer}
        >
          {mobileMenuContent}
        </Drawer>
      )}

      {/* 主内容区域 */}
      <Layout
        className={`${styles.mainContent} ${
          collapsed ? styles.mainContentCollapsed : ''
        }`}
        style={{
          marginLeft: collapsed
            ? undefined
            : i18n.language === 'en'
            ? '240px'
            : undefined,
          width: collapsed
            ? undefined
            : i18n.language === 'en'
            ? 'calc(100% - 240px)'
            : undefined,
        }}
      >
        {/* 固定顶部导航栏 */}
        <Header
          className={`${styles.header} ${
            collapsed ? styles.headerCollapsed : styles.headerExpanded
          }`}
          style={{
            left: collapsed
              ? undefined
              : i18n.language === 'en'
              ? '240px'
              : undefined,
            width: collapsed
              ? undefined
              : i18n.language === 'en'
              ? 'calc(100% - 240px)'
              : undefined,
          }}
        >
          {/* 左侧区域 */}
          <div className={styles.headerLeft}>
            {isMobile ? (
              React.createElement(MenuUnfoldOutlined, {
                className: styles.trigger,
                onClick: handleMobileMenuToggle,
              })
            ) : (
              React.createElement(
                collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
                {
                  className: styles.trigger,
                  onClick: () => setCollapsed(!collapsed),
                }
              )
            )}
            {!isMobile && <RestaurantSwitcher />}
          </div>

          {/* 右侧区域 */}
          <div className={styles.headerRight}>
            <Space size={isMobile ? 'small' : 'middle'}>
              {/* 移动端隐藏部分功能 */}
              {!isMobile && (
                <>
                  {/* 语言切换 */}
                  <LanguageSwitcher />

                  {/* 主题切换 */}
                  <ThemeToggle />
                </>
              )}

              {/* 通知中心 */}
              <NotificationCenter />

              {/* 帮助中心 */}
              {!isMobile && <HelpCenter />}

              {/* 全屏切换 - 移动端隐藏 */}
              {!isMobile && <FullscreenToggle />}

              {/* 用户头像 */}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Avatar
                  style={{ cursor: 'pointer' }}
                  icon={<UserOutlined />}
                  size={isMobile ? 'default' : 'large'}
                >
                  {user?.name?.[0]}
                </Avatar>
              </Dropdown>
            </Space>
          </div>
        </Header>

        {/* 可滚动内容区域 */}
        <Content className={styles.content}>
          <div className={styles.contentContainer}>
            <PageTransition>
              <Outlet />
            </PageTransition>
          </div>
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout


