import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { db } from '@/db/schema'
import { useTheme } from '@/app/theme'
import { SettingsPage } from './SettingsPage'
import { normalizeFeedUrl } from './feedUrl'

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ session: null, user: { id: 'u1', email: 'me@example.com' }, loading: false }),
  signOut: vi.fn(),
}))

vi.mock('@/app/SyncProvider', () => ({
  useSyncStatus: () => ({ state: 'idle', lastSyncAt: null }),
}))

function renderPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

describe('normalizeFeedUrl', () => {
  it('converts webcal:// to https://', () => {
    expect(normalizeFeedUrl('webcal://example.com/a.ics')).toBe('https://example.com/a.ics')
  })
  it('accepts http(s) and rejects the rest', () => {
    expect(normalizeFeedUrl(' http://x.y/a.ics ')).toBe('http://x.y/a.ics')
    expect(normalizeFeedUrl('ftp://x.y/a.ics')).toBeNull()
    expect(normalizeFeedUrl('')).toBeNull()
  })
})

describe('SettingsPage', () => {
  beforeEach(async () => {
    await Promise.all(db.tables.map((t) => t.clear()))
    useTheme.setState({ mode: 'system' })
    document.documentElement.removeAttribute('data-theme')
  })

  it('shows email, sync status and version', () => {
    renderPage()
    expect(screen.getByText('me@example.com')).toBeInTheDocument()
    expect(screen.getByText('Ожидание…')).toBeInTheDocument()
    expect(screen.getByText(/Версия/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Дизайн-система' })).toHaveAttribute('href', '/design')
  })

  it('adds an ics feed and converts webcal:// to https://', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить календарь' }))
    const dialog = await screen.findByRole('dialog', { name: 'Новый календарь' })
    const inputs = dialog.querySelectorAll('input')
    fireEvent.change(inputs[0]!, { target: { value: 'Работа' } })
    fireEvent.change(inputs[1]!, { target: { value: 'webcal://calendar.example.com/x.ics' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))

    await waitFor(async () => {
      const rows = await db.ics_feeds.toArray()
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({
        name: 'Работа',
        url: 'https://calendar.example.com/x.ics',
        user_id: 'u1',
        deleted_at: null,
        _dirty: 1,
      })
    })
    expect(await screen.findByText('Работа')).toBeInTheDocument()
  })

  it('rejects a non-http url without writing', async () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Добавить календарь' }))
    const dialog = await screen.findByRole('dialog', { name: 'Новый календарь' })
    fireEvent.change(dialog.querySelectorAll('input')[1]!, { target: { value: 'ftp://nope' } })
    fireEvent.click(screen.getByRole('button', { name: 'Добавить' }))
    expect(dialog.querySelectorAll('input')[1]).toHaveAttribute('aria-invalid', 'true')
    expect(await db.ics_feeds.count()).toBe(0)
  })

  it('soft-deletes a feed after confirm', async () => {
    await db.ics_feeds.put({
      id: 'f1',
      user_id: 'u1',
      updated_at: new Date().toISOString(),
      deleted_at: null,
      name: 'Старый',
      url: 'https://x/y.ics',
      color: 2,
      _dirty: 0,
    })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    renderPage()
    await screen.findByText('Старый')
    fireEvent.click(screen.getByRole('button', { name: 'Удалить' }))
    await waitFor(async () => {
      const row = await db.ics_feeds.get('f1')
      expect(row?.deleted_at).not.toBeNull()
    })
    await waitFor(() => expect(screen.queryByText('Старый')).toBeNull())
  })

  it('theme segmented switches the store and data-theme', () => {
    renderPage()
    fireEvent.click(screen.getByRole('tab', { name: 'Тёмная' }))
    expect(useTheme.getState().mode).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
    expect(localStorage.getItem('dayline:theme')).toBe('dark')
  })
})
