/// <reference types="vite/client" />

// 扩展 Window 接口以支持错误处理
interface Window {
  addEventListener(
    type: 'error',
    listener: (event: ErrorEvent) => void | boolean,
    options?: boolean | AddEventListenerOptions
  ): void
  addEventListener(
    type: 'unhandledrejection',
    listener: (event: PromiseRejectionEvent) => void,
    options?: boolean | AddEventListenerOptions
  ): void
}

interface ImportMetaEnv {
  readonly VITE_CLOUDBASE_ENVID?: string
  readonly VITE_CLOUDBASE_REGION?: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}


