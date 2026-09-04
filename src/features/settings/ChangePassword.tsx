import { useState, type FormEvent } from 'react'
import { Button, Field, Input } from '@/ui'
import { supabase } from '@/lib/supabase'

type State = { kind: 'idle' } | { kind: 'busy' } | { kind: 'done' } | { kind: 'error'; message: string }

export function ChangePassword() {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>({ kind: 'idle' })

  if (!open) {
    return (
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        Сменить пароль
      </Button>
    )
  }

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!supabase) return
    setState({ kind: 'busy' })
    const { error } = await supabase.auth.updateUser({ password })
    if (error) setState({ kind: 'error', message: error.message })
    else {
      setState({ kind: 'done' })
      setPassword('')
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <Field label="Новый пароль" hint="Не короче 8 символов">
        <Input
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      {state.kind === 'error' && <p className="text-sm text-danger">{state.message}</p>}
      {state.kind === 'done' && <p className="text-sm text-success">Пароль обновлён.</p>}
      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={state.kind === 'busy'}>
          Сохранить
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Закрыть
        </Button>
      </div>
    </form>
  )
}
