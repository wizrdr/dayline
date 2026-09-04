import { useEffect, useState, type ReactNode } from 'react'
import type { IconName, TaskColor, Weekday } from '@/domain/types'
import {
  Button,
  Card,
  ColorDot,
  ColorPicker,
  DurationField,
  Field,
  ICON_NAMES,
  IconButton,
  IconPicker,
  Input,
  Segmented,
  Sheet,
  TASK_COLORS,
  TaskIcon,
  Textarea,
  TimeField,
  Toggle,
  WeekdayPicker,
  cn,
  taskBgClass,
  taskSoftBgClass,
  taskTextClass,
} from '@/ui'

type ThemeMode = 'system' | 'light' | 'dark'

const THEME_OPTIONS = [
  { value: 'system', label: 'Система' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement
  if (mode === 'system') root.removeAttribute('data-theme')
  else root.dataset.theme = mode
}

function readTheme(): ThemeMode {
  const t = document.documentElement.dataset.theme
  return t === 'light' || t === 'dark' ? t : 'system'
}

const COLOR_TOKENS = [
  ['bg', 'bg-bg'],
  ['surface', 'bg-surface'],
  ['surface-raised', 'bg-surface-raised'],
  ['text', 'bg-text'],
  ['text-muted', 'bg-muted'],
  ['text-faint', 'bg-faint'],
  ['border', 'bg-border'],
  ['border-strong', 'bg-border-strong'],
  ['accent', 'bg-accent'],
  ['accent-fg', 'bg-accent-fg'],
  ['accent-soft', 'bg-accent-soft'],
  ['danger', 'bg-danger'],
  ['danger-soft', 'bg-danger-soft'],
  ['success', 'bg-success'],
  ['now-line', 'bg-now-line'],
  ['grid-line', 'bg-grid-line'],
  ['overlay', 'bg-overlay'],
] as const

const TASK_TITLES: Record<TaskColor, string> = {
  1: 'Спорт',
  2: 'Завтрак',
  3: 'Почта',
  4: 'Прогулка',
  5: 'Созвон',
  6: 'Фокус-работа',
  7: 'Чтение',
  8: 'Ужин',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold text-text">{title}</h2>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs uppercase tracking-wide text-faint">{label}</span>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex items-center gap-3 min-w-0">
      <span className={cn('size-10 shrink-0 rounded-md border border-border', className)} />
      <code className="text-sm text-muted truncate">--{name}</code>
    </div>
  )
}

function TaskBlock({ color }: { color: TaskColor }) {
  return (
    <div className={cn('relative flex items-center gap-3 rounded-md pl-4 pr-3 py-2.5 overflow-hidden', taskSoftBgClass[color])}>
      <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', taskBgClass[color])} />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-text truncate">{TASK_TITLES[color]}</div>
        <div className="text-sm text-muted">09:00 – 09:45</div>
      </div>
      <ColorDot color={color} size="sm" />
    </div>
  )
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export default function DesignPage() {
  const [theme, setTheme] = useState<ThemeMode>(readTheme)
  const [seg, setSeg] = useState('day')
  const [toggle, setToggle] = useState(true)
  const [color, setColor] = useState<TaskColor>(6)
  const [days, setDays] = useState<Weekday[]>([1, 3, 5])
  const [time, setTime] = useState<number | null>(9 * 60 + 30)
  const [duration, setDuration] = useState(45)
  const [sheet, setSheet] = useState(false)
  const [icon, setIcon] = useState<IconName>('code')

  useEffect(() => applyTheme(theme), [theme])

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-24 pt-[max(1rem,env(safe-area-inset-top))] flex flex-col gap-10">
      <header className="flex flex-col gap-4">
        <h1 className="text-2xl font-semibold text-text">Дизайн-система</h1>
        <Segmented options={THEME_OPTIONS} value={theme} onChange={(v) => setTheme(v as ThemeMode)} />
      </header>

      <Section title="Цвета">
        <div className="grid grid-cols-2 gap-3">
          {COLOR_TOKENS.map(([name, cls]) => (
            <Swatch key={name} name={name} className={cls} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3 mt-2">
          {TASK_COLORS.map((c) => (
            <div key={c} className="flex items-center gap-3">
              <span className={cn('size-10 rounded-md', taskBgClass[c])} />
              <span className={cn('size-10 rounded-md border border-border', taskSoftBgClass[c])} />
              <code className="text-sm text-muted">--task-{c}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Радиусы и тени">
        <Row label="radius">
          {(['rounded-sm', 'rounded-md', 'rounded-lg', 'rounded-full'] as const).map((r) => (
            <div key={r} className="flex flex-col items-center gap-1">
              <span className={cn('size-14 bg-accent-soft border border-accent', r)} />
              <code className="text-xs text-muted">{r}</code>
            </div>
          ))}
        </Row>
        <Row label="shadow">
          <div className="size-24 rounded-lg bg-surface shadow-card flex items-center justify-center text-xs text-muted">card</div>
          <div className="size-24 rounded-lg bg-surface shadow-sheet flex items-center justify-center text-xs text-muted">sheet</div>
        </Row>
      </Section>

      <Section title="Блоки задач">
        <div className="relative flex flex-col gap-2 pl-14">
          <span aria-hidden className="absolute left-12 inset-y-0 w-px bg-grid-line" />
          <span aria-hidden className="absolute left-10 right-0 top-1/2 h-px bg-now-line" />
          {TASK_COLORS.map((c) => (
            <TaskBlock key={c} color={c} />
          ))}
        </div>
      </Section>

      <Section title="Иконки задач">
        <div className="flex flex-wrap gap-2">
          {ICON_NAMES.map((name) => (
            <div key={name} className="flex w-16 flex-col items-center gap-1">
              <span className={cn('flex size-[34px] items-center justify-center rounded-md', taskSoftBgClass[color], taskTextClass[color])}>
                <TaskIcon name={name} />
              </span>
              <code className="text-xs text-faint">{name}</code>
            </div>
          ))}
        </div>
        <Row label="IconPicker">
          <IconPicker value={icon} color={color} onChange={setIcon} />
        </Row>
      </Section>

      <Section title="Button">
        {(['primary', 'soft', 'ghost', 'danger'] as const).map((v) => (
          <Row key={v} label={v}>
            <Button variant={v} size="sm">Маленькая</Button>
            <Button variant={v}>Обычная</Button>
            <Button variant={v} size="lg">Большая</Button>
            <Button variant={v} loading>Загрузка</Button>
            <Button variant={v} disabled>Выключена</Button>
          </Row>
        ))}
        <Row label="full">
          <Button full>Сохранить</Button>
        </Row>
        <Row label="IconButton">
          <IconButton label="Добавить" size="sm"><PlusIcon /></IconButton>
          <IconButton label="Добавить"><PlusIcon /></IconButton>
          <IconButton label="Добавить" disabled><PlusIcon /></IconButton>
        </Row>
      </Section>

      <Section title="Card">
        <Card>Карточка с отступами</Card>
        <Card padded={false}>
          <div className="px-4 py-3 border-b border-border">Строка 1</div>
          <div className="px-4 py-3">Строка 2 без внешних отступов</div>
        </Card>
      </Section>

      <Section title="Формы">
        <Card className="flex flex-col gap-4">
          <Field label="Название" hint="Короткое и понятное">
            <Input placeholder="Например, тренировка" />
          </Field>
          <Field label="С ошибкой">
            <Input invalid defaultValue="Некорректно" />
          </Field>
          <Field label="Выключено">
            <Input disabled placeholder="Недоступно" />
          </Field>
          <Field label="Заметка">
            <Textarea placeholder="Подробности…" />
          </Field>
          <Field label="Время начала">
            <TimeField value={time} onChange={setTime} />
          </Field>
          <Field label="Длительность">
            <DurationField value={duration} onChange={setDuration} />
          </Field>
          <Field label="Повтор">
            <WeekdayPicker value={days} onChange={setDays} />
          </Field>
          <Field label="Цвет">
            <ColorPicker value={color} onChange={setColor} />
          </Field>
          <Toggle label="Напоминание" checked={toggle} onChange={setToggle} />
          <Toggle label="Выключено" checked={false} onChange={() => {}} disabled />
        </Card>
      </Section>

      <Section title="Segmented">
        <Segmented
          options={[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
            { value: 'inbox', label: 'Входящие' },
          ]}
          value={seg}
          onChange={setSeg}
        />
      </Section>

      <Section title="Sheet">
        <Row label="bottom sheet / dialog">
          <Button variant="soft" onClick={() => setSheet(true)}>Открыть</Button>
        </Row>
        <Sheet
          open={sheet}
          onClose={() => setSheet(false)}
          title="Новая задача"
          footer={
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSheet(false)}>Отмена</Button>
              <Button full onClick={() => setSheet(false)}>Сохранить</Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4">
            <Field label="Название">
              <Input placeholder="Что сделать" />
            </Field>
            <Field label="Время">
              <TimeField value={time} onChange={setTime} />
            </Field>
            <Field label="Цвет">
              <ColorPicker value={color} onChange={setColor} />
            </Field>
          </div>
        </Sheet>
      </Section>
    </div>
  )
}
