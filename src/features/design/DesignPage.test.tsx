import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useTheme } from '@/app/theme'
import DesignPage from './DesignPage'

describe('DesignPage', () => {
  beforeEach(() => {
    localStorage.clear()
    useTheme.setState({ mode: 'system' })
    document.documentElement.removeAttribute('data-theme')
  })

  it('theme switch goes through the shared store and persists', () => {
    render(
      <MemoryRouter>
        <DesignPage />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Тёмная' }))
    expect(useTheme.getState().mode).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('dayline:theme')).toBe('dark')
    expect(screen.getByRole('link', { name: '← Настройки' })).toHaveAttribute('href', '/settings')
  })
})
