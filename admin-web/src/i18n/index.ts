import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'

import enTranslation from './locales/en.json'
import zhTranslation from './locales/zh.json'

// 语言资源
const resources = {
  zh: {
    translation: zhTranslation,
  },
  en: {
    translation: enTranslation,
  },
}

// i18n 配置
i18n
  .use(LanguageDetector) // 自动检测浏览器语言
  .use(initReactI18next) // 初始化 react-i18next
  .init({
    resources,
    fallbackLng: 'zh', // 默认语言
    lng: localStorage.getItem('i18nextLng') || 'zh', // 当前语言
    debug: false, // 开发环境可设为 true

    interpolation: {
      escapeValue: false, // React 已经转义了
    },

    // 语言检测配置
    detection: {
      order: ['localStorage', 'navigator'], // 优先使用 localStorage，其次浏览器语言
      caches: ['localStorage'], // 缓存到 localStorage
      lookupLocalStorage: 'i18nextLng', // localStorage 的 key
    },
  })

export default i18n

