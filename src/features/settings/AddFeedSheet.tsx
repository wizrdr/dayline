import { useState, type FormEvent } from 'react'
import { createFeed } from '@/db/repo'
import type { TaskColor } from '@/domain/types'
import { Button, ColorPicker, Field, Input, Sheet } from '@/ui'
import { normalizeFeedUrl } from './feedUrl'

interface Props {
  open: boolean
  onClose: () => void
  userId: string | null
}

export function AddFeedSheet({ open, onClose, userId }: Props) {
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [color, setColor] = useState<TaskColor>(6)
  const [urlInvalid, setUrlInvalid] = useState(false)
  const [saving, setSaving] = useState(false)

  const reset = () => {
    setName('')
    setUrl('')
    setColor(6)
    setUrlInvalid(false)
  }

  const submit = async (e?: FormEvent) => {
    e?.preventDefault()
    const normalized = normalizeFeedUrl(url)
    if (!normalized || !userId) {
      setUrlInvalid(true)
      return
    }
    setSaving(true)
    try {
      await createFeed({ name: name.trim() || 'Календарь', url: normalized, color }, userId)
      reset()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Новый календарь"
      footer={
        <Button full loading={saving} onClick={() => void submit()}>
          Добавить
        </Button>
      }
    >
      <form className="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
        <Field label="Название">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Работа" />
        </Field>
        <Field label="Ссылка ics" hint="Google Calendar → Настройки календаря → Секретный адрес в формате iCal">
          <Input
            type="url"
            inputMode="url"
            value={url}
            invalid={urlInvalid}
            onChange={(e) => {
              setUrl(e.target.value)
              setUrlInvalid(false)
            }}
            placeholder="https://calendar.google.com/…/basic.ics"
          />
        </Field>
        <Field label="Цвет">
          <ColorPicker value={color} onChange={setColor} />
        </Field>
      </form>
    </Sheet>
  )
}
