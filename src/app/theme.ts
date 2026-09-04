import { create } from 'zustand'

export type ThemeMode = 'system' | 'light' | 'dark'

export const THEME_STORAGE_KEY = 'dayline:theme'

const MODES: readonly ThemeMode[] = ['system', 'light', 'dark']

export function isThemeMode(v: unknown): v is ThemeMode {
  return typeof v === 'string' && (MODES as readonly string[]).includes(v)
}

function readStoredMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeMode(raw) ? raw : 'system'
  } catch {
    return 'system'
  }
}

function writeStoredMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode)
  } catch {
    // storage may be unavailable (private mode, quota); theme still applies for the session
  }
}

export function applyTheme(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', mode)
}

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useTheme = create<ThemeState>((set) => ({
  mode: 'system',
  setMode: (mode) => {
    applyTheme(mode)
    writeStoredMode(mode)
    set({ mode })
  },
}))

export function initTheme(): void {
  const mode = readStoredMode()
  applyTheme(mode)
  useTheme.setState({ mode })
}
