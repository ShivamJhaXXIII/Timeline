import type { ElectronAPI } from './types/electronApi.js'

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}

export {}
