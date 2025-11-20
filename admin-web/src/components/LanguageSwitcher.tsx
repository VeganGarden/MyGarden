import { GlobalOutlined } from '@ant-design/icons'
import { Button, Dropdown, Space } from 'antd'
import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './LanguageSwitcher.module.css'

/**
 * 语言切换组件
 * 支持中英文切换
 */
const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation()

  const currentLanguage = i18n.language || 'zh'

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang)
  }

  const menuItems = [
    {
      key: 'zh',
      label: (
        <Space>
          <span>🇨🇳</span>
          <span>{t('language.chinese')}</span>
          {currentLanguage === 'zh' && <span className={styles.checkmark}>✓</span>}
        </Space>
      ),
      onClick: () => handleLanguageChange('zh'),
    },
    {
      key: 'en',
      label: (
        <Space>
          <span>🇺🇸</span>
          <span>{t('language.english')}</span>
          {currentLanguage === 'en' && <span className={styles.checkmark}>✓</span>}
        </Space>
      ),
      onClick: () => handleLanguageChange('en'),
    },
  ]

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        type="text"
        icon={<GlobalOutlined />}
        className={styles.languageButton}
        title={t('language.switch')}
      >
        {currentLanguage === 'zh' ? '中文' : 'EN'}
      </Button>
    </Dropdown>
  )
}

export default LanguageSwitcher

