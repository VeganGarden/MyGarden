import RestaurantSwitcher from '@/components/RestaurantSwitcher'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { logout } from '@/store/slices/authSlice'
import {
  ApartmentOutlined,
  BarChartOutlined,
  BookOutlined,
  CalculatorOutlined,
  DashboardOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SafetyCertificateOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Dropdown, Layout, Menu, message } from 'antd'
import React, { useMemo, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

const { Header, Sider, Content } = Layout

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const { user } = useAppSelector((state: any) => state.auth)

  // 角色判断
  const isPlatformAdmin = user?.role === 'platform_operator'
  const isSystemAdmin = user?.role === 'system_admin'

  // 使用useMemo确保菜单项能够响应user状态变化
  const menuItems = useMemo(() => {
    if (isSystemAdmin) {
      // 系统管理员仅系统域菜单
      return [
        {
          key: '/system',
          icon: <SettingOutlined />,
          label: '系统管理',
          children: [
            { key: '/system/users', label: '用户管理' },
            { key: '/system/roles', label: '角色权限配置' },
            { key: '/system/audit', label: '审计日志' },
            { key: '/system/monitor', label: '系统监控' },
            { key: '/system/backup', label: '数据备份' },
          ],
        },
      ]
    }
    return [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '数据看板',
    },
    {
      key: '/certification',
      icon: <SafetyCertificateOutlined />,
      label: '气候餐厅认证',
      children: [
        {
          key: '/certification/apply',
          label: '认证申请',
        },
        {
          key: '/certification/status',
          label: '认证进度',
        },
        {
          key: '/certification/certificate',
          label: '证书管理',
        },
      ],
    },
    {
      key: '/carbon',
      icon: <CalculatorOutlined />,
      label: '碳足迹核算',
      children: [
        {
          key: '/carbon/menu',
          label: '菜单碳足迹',
        },
        {
          key: '/carbon/order',
          label: '订单碳统计',
        },
        {
          key: '/carbon/report',
          label: '碳报告',
        },
        {
          key: '/carbon/baseline',
          label: '基准值管理',
        },
      ],
    },
    {
      key: '/traceability',
      icon: <ApartmentOutlined />,
      label: '供应链溯源',
      children: [
        {
          key: '/traceability/suppliers',
          label: '供应商管理',
        },
        {
          key: '/traceability/lots',
          label: '食材批次',
        },
        {
          key: '/traceability/chains',
          label: '溯源链',
        },
        {
          key: '/traceability/certificates',
          label: '溯源证书',
        },
      ],
    },
    {
      key: '/operation',
      icon: <ShoppingCartOutlined />,
      label: '餐厅运营',
      children: [
        {
          key: '/operation/order',
          label: '订单管理',
        },
        {
          key: '/operation/ledger',
          label: '运营台账',
        },
        {
          key: '/operation/behavior',
          label: '行为统计',
        },
        {
          key: '/operation/coupon',
          label: '优惠券管理',
        },
        {
          key: '/operation/review',
          label: '用户评价',
        },
      ],
    },
    {
      key: '/report',
      icon: <BarChartOutlined />,
      label: '报表与生态',
      children: [
        {
          key: '/report/business',
          label: '经营数据报表',
        },
        {
          key: '/report/carbon',
          label: '碳减排报表',
        },
        {
          key: '/report/esg',
          label: 'ESG报告',
        },
        {
          key: '/report/dashboard',
          label: '数据看板',
        },
      ],
    },
    {
      key: '/recipe',
      icon: <BookOutlined />,
      label: '菜谱管理',
      children: [
        {
          key: '/recipe/list',
          label: '菜谱列表',
        },
        {
          key: '/recipe/create',
          label: '创建菜谱',
        },
        {
          key: '/recipe/categories',
          label: '分类管理',
        },
      ],
    },
    // 平台管理模块（仅平台运营可见）
    ...(isPlatformAdmin
      ? [
          {
            key: '/platform',
            icon: <SettingOutlined />,
            label: '平台管理',
            children: [
              {
                key: '/platform/restaurants',
                label: '餐厅列表管理',
              },
              {
                key: '/platform/cross-tenant',
                label: '跨租户数据查看',
              },
              {
                key: '/platform/statistics',
                label: '平台级统计报表',
              },
              {
                key: '/platform/account-approvals',
                label: '入驻申请审批',
              },
              {
                // 平台级账户管理改由系统管理员在“系统管理 → 用户管理”中处理
                // 此入口对平台运营隐藏
                key: '/platform/admin-users__hidden',
                label: '',
                style: { display: 'none' } as any,
              },
            ],
          },
        ]
      : []),
  ]}, [isPlatformAdmin, isSystemAdmin])

  const handleLogout = () => {
    dispatch(logout())
    message.success('已退出登录')
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
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
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed}>
        <div
          style={{
            height: 32,
            margin: 16,
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 'bold',
          }}
        >
          {collapsed ? 'MG' : '我的花园'}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          openKeys={menuItems
            .filter((item) => item.children)
            .map((item) => item.key as string)}
          items={menuItems}
          onClick={({ key }: { key: string }) => navigate(key)}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            padding: '0 16px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
            {React.createElement(
              collapsed ? MenuUnfoldOutlined : MenuFoldOutlined,
              {
                className: 'trigger',
                onClick: () => setCollapsed(!collapsed),
                style: { fontSize: 18 },
              }
            )}
            <RestaurantSwitcher />
          </div>
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              style={{ cursor: 'pointer' }}
              icon={<UserOutlined />}
            >
              {user?.name?.[0]}
            </Avatar>
          </Dropdown>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: '#fff',
            borderRadius: 8,
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  )
}

export default MainLayout


