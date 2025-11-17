import { QuestionCircleOutlined } from '@ant-design/icons'
import { Button, Dropdown } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './HelpCenter.module.css'

interface HelpItem {
  key: string
  label: string
  url?: string
  onClick?: () => void
}

/**
 * 帮助中心组件
 */
const HelpCenter: React.FC = () => {
  const { t } = useTranslation()
  
  // 帮助菜单项
  const helpItems: HelpItem[] = [
    {
      key: 'user-guide',
      label: t('help.documentation'),
      onClick: () => {
        // 可以打开使用指南页面或弹窗
        window.open('/help/user-guide', '_blank')
      },
    },
    {
      key: 'faq',
      label: t('help.shortcuts'),
      onClick: () => {
        window.open('/help/faq', '_blank')
      },
    },
    {
      key: 'api-docs',
      label: t('help.feedback'),
      onClick: () => {
        window.open('/help/api-docs', '_blank')
      },
    },
    {
      key: 'contact',
      label: t('help.about'),
      onClick: () => {
        window.open('mailto:support@mygarden.com', '_blank')
      },
    },
  ]

  const menuItems = helpItems.map((item) => ({
    key: item.key,
    label: item.label,
    onClick: item.onClick,
  }))

  return (
    <Dropdown
      menu={{ items: menuItems }}
      trigger={['click']}
      placement="bottomRight"
    >
      <Button
        type="text"
        icon={<QuestionCircleOutlined />}
        className={`${styles.helpButton} help-center-button`}
        title={`${t('help.title')} (Ctrl+/)`}
      />
    </Dropdown>
  )
}

export default HelpCenter

