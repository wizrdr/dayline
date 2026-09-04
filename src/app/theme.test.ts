import { applyTheme, initTheme, THEME_STORAGE_KEY, useTheme } from './theme'

describe('theme store', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    useTheme.setState({ mode: 'system' })
  })

  it('setMode applies data-theme and persists', () => {
    useTheme.getState().setMode('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(useTheme.getState().mode).toBe('dark')
  })

  it('system removes data-theme', () => {
    applyTheme('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    useTheme.getState().setMode('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })

  it('initTheme restores the stored mode', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    initTheme()
    expect(useTheme.getState().mode).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('initTheme falls back to system on garbage', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    initTheme()
    expect(useTheme.getState().mode).toBe('system')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})
