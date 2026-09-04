import { useState, type FormEvent } from 'react'
import { Button, Card, Field, Input } from '@/ui'
import { supabase } from '@/lib/supabase'

type Status = { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    setStatus({ kind: 'sending' })
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setStatus(error ? { kind: 'error', message: error.message } : { kind: 'sent' })
  }

  return (
    <main className="min-h-dvh bg-bg text-text flex items-center justify-center p-4">
      <Card className="w-full max-w-sm flex flex-col gap-5">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold">Dayline</h1>
          <p className="text-sm text-muted">Вход по ссылке на email</p>
        </div>

        {status.kind === 'sent' ? (
          <div className="flex flex-col gap-3">
            <p className="text-success">
              Ссылка отправлена на {email.trim()}, откройте её на этом устройстве.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setStatus({ kind: 'idle' })}>
              Отправить ещё раз
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <Field label="Email">
              <Input
                type="email"
                name="email"
                autoComplete="email"
                required
                autoFocus
                placeholder="you@example.com"
                value={email}
                invalid={status.kind === 'error'}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            {status.kind === 'error' && <p className="text-sm text-danger">Не удалось отправить: {status.message}</p>}
            <Button type="submit" full loading={status.kind === 'sending'}>
              Получить ссылку для входа
            </Button>
          </form>
        )}

        <p className="text-xs text-faint">
          Ссылку нужно открыть на том же устройстве и в том же браузере, где вы её запросили.
        </p>
      </Card>
    </main>
  )
}

export default LoginScreen
