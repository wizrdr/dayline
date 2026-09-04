import {
  ColorPicker,
  DurationField,
  Field,
  IconPicker,
  Input,
  Segmented,
  Textarea,
  TimeField,
  Toggle,
  WeekdayPicker,
  suggestIcon,
} from '@/ui'
import type { TaskDraft } from './useTaskDraft'

const REMIND_OPTIONS = [
  { value: 'none', label: 'нет' },
  { value: '0', label: 'в момент' },
  { value: '5', label: '5' },
  { value: '10', label: '10' },
  { value: '15', label: '15' },
  { value: '30', label: '30' },
]

interface TaskFormProps {
  draft: TaskDraft
  set: (patch: Partial<TaskDraft>) => void
  setRepeat: (on: boolean) => void
}

export function TaskForm({ draft, set, setRepeat }: TaskFormProps) {
  const isSeries = draft.kind === 'series'
  return (
    <div className="flex flex-col gap-4">
      <Field label="Название">
        <Input
          aria-label="Название"
          autoFocus
          value={draft.title}
          placeholder="Что нужно сделать"
          onChange={(e) => set({ title: e.target.value })}
        />
      </Field>

      {isSeries ? (
        <>
          <Field label="Дни недели">
            <WeekdayPicker value={draft.weekdays ?? []} onChange={(weekdays) => set({ weekdays })} />
          </Field>
          <Field label="Начиная с">
            <Input
              aria-label="Начиная с"
              type="date"
              value={draft.start_date ?? ''}
              onChange={(e) => set({ start_date: e.target.value || null })}
            />
          </Field>
        </>
      ) : (
        <Field label="Дата" hint={draft.date === null ? 'В инбокс' : undefined}>
          <Input
            aria-label="Дата"
            type="date"
            value={draft.date ?? ''}
            onChange={(e) => set({ date: e.target.value || null })}
          />
        </Field>
      )}

      <Toggle label="Повторять" checked={isSeries} onChange={setRepeat} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Время">
          <TimeField value={draft.start_min} onChange={(start_min) => set({ start_min })} />
        </Field>
        <Field label="Длительность">
          <DurationField value={draft.duration_min} onChange={(duration_min) => set({ duration_min })} />
        </Field>
      </div>

      <Field label="Напоминание" hint="минут до начала">
        <Segmented
          options={REMIND_OPTIONS}
          value={draft.remind_min_before === null ? 'none' : String(draft.remind_min_before)}
          onChange={(v) => set({ remind_min_before: v === 'none' ? null : Number(v) })}
        />
      </Field>

      <Field label="Цвет">
        <ColorPicker value={draft.color} onChange={(color) => set({ color })} />
      </Field>

      <Field label="Иконка">
        <IconPicker value={draft.icon ?? suggestIcon(draft.title)} color={draft.color} onChange={(icon) => set({ icon })} />
      </Field>

      <Field label="Заметка">
        <Textarea
          aria-label="Заметка"
          rows={3}
          value={draft.note}
          onChange={(e) => set({ note: e.target.value })}
        />
      </Field>
    </div>
  )
}
