import { useEffect, useState } from 'react'
import { useSession } from '@/features/auth/session'
import {
  disablePush,
  enablePush,
  getPushState,
  isIosNotInstalled,
  showTestNotification,
  type PushState,
} from '@/lib/push'
import { Button, Toggle } from '@/ui'

const HINTS: Record<PushState, string | null> = {
  unsupported: 'Браузер не поддерживает уведомления',
  denied: 'Уведомления запрещены в настройках браузера',
  subscribed: 'Напоминания приходят, даже если приложение закрыто',
  unsubscribed: null,
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export function NotificationsCard() {
  const { user } = useSession()
  const [state, setState] = useState<PushState | 'loading'>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void getPushState().then((s) => alive && setState(s))
    return () => {
      alive = false
    }
  }, [])

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
      setState(await getPushState())
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const toggle = (on: boolean) => {
    if (!user) return setError('Сначала войдите в аккаунт')
    void run(() => (on ? enablePush(user.id) : disablePush()))
  }

  const iosHint = isIosNotInstalled()
  const hint = state === 'loading' ? null : iosHint ? 'Сначала добавьте приложение на экран «Домой»' : HINTS[state]
  const interactive = state === 'subscribed' || state === 'unsubscribed'

  return (
    <>
      <Toggle
        checked={state === 'subscribed'}
        onChange={toggle}
        label="Напоминания"
        disabled={busy || !interactive}
      />
      {state === 'loading' && <span className="text-sm text-faint">Проверяем…</span>}
      {hint && <span className="text-sm text-faint">{hint}</span>}
      {error && <span className="text-sm text-danger">{error}</span>}
      {interactive && (
        <Button
          variant="ghost"
          size="sm"
          loading={busy}
          onClick={() => void run(showTestNotification)}
          className="self-start text-accent"
        >
          Тестовое уведомление
        </Button>
      )}
    </>
  )
}
