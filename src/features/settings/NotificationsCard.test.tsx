import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NotificationsCard } from './NotificationsCard'
import * as push from '@/lib/push'

vi.mock('@/features/auth/session', () => ({
  useSession: () => ({ session: null, user: { id: 'u1', email: 'me@example.com' }, loading: false }),
}))

vi.mock('@/lib/push', () => ({
  getPushState: vi.fn(),
  enablePush: vi.fn(),
  disablePush: vi.fn(),
  showTestNotification: vi.fn(),
  isIosNotInstalled: vi.fn().mockReturnValue(false),
}))

const mocked = vi.mocked(push)

beforeEach(() => {
  vi.clearAllMocks()
  mocked.isIosNotInstalled.mockReturnValue(false)
})

describe('NotificationsCard', () => {
  it('shows the unsupported hint and disables the switch', async () => {
    mocked.getPushState.mockResolvedValue('unsupported')
    render(<NotificationsCard />)
    expect(await screen.findByText('Браузер не поддерживает уведомления')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeDisabled()
    expect(screen.queryByRole('button', { name: 'Тестовое уведомление' })).toBeNull()
  })

  it('shows the iOS install hint', async () => {
    mocked.getPushState.mockResolvedValue('unsupported')
    mocked.isIosNotInstalled.mockReturnValue(true)
    render(<NotificationsCard />)
    expect(await screen.findByText('Сначала добавьте приложение на экран «Домой»')).toBeInTheDocument()
  })

  it('enables push on toggle and reflects the new state', async () => {
    mocked.getPushState.mockResolvedValueOnce('unsubscribed').mockResolvedValueOnce('subscribed')
    mocked.enablePush.mockResolvedValue()
    render(<NotificationsCard />)
    const toggle = await screen.findByRole('switch')
    await waitFor(() => expect(toggle).toBeEnabled())
    fireEvent.click(toggle)
    await waitFor(() => expect(toggle).toHaveAttribute('aria-checked', 'true'))
    expect(mocked.enablePush).toHaveBeenCalledWith('u1')
  })

  it('shows a thrown error in text-danger', async () => {
    mocked.getPushState.mockResolvedValue('unsubscribed')
    mocked.enablePush.mockRejectedValue(new Error('Не настроен VAPID-ключ'))
    render(<NotificationsCard />)
    const toggle = await screen.findByRole('switch')
    await waitFor(() => expect(toggle).toBeEnabled())
    fireEvent.click(toggle)
    const err = await screen.findByText('Не настроен VAPID-ключ')
    expect(err).toHaveClass('text-danger')
    expect(toggle).toHaveAttribute('aria-checked', 'false')
  })

  it('fires the local test notification', async () => {
    mocked.getPushState.mockResolvedValue('subscribed')
    mocked.showTestNotification.mockResolvedValue()
    render(<NotificationsCard />)
    fireEvent.click(await screen.findByRole('button', { name: 'Тестовое уведомление' }))
    await waitFor(() => expect(mocked.showTestNotification).toHaveBeenCalled())
  })
})
