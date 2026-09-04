import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSyncStatus } from '@/app/SyncProvider'
import { isThemeMode, useTheme, type ThemeMode } from '@/app/theme'
import { useFeeds } from '@/db/hooks'
import { softDeleteRow } from '@/db/repo'
import { signOut, useSession } from '@/features/auth/session'
import { ChangePassword } from './ChangePassword'
import type { SyncStatus } from '@/sync/sync'
import { Button, Card, ColorDot, IconButton, Segmented } from '@/ui'
import { cn } from '@/ui/cn'
import { AddFeedSheet } from './AddFeedSheet'
import { NotificationsCard } from './NotificationsCard'

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Системная' },
  { value: 'light', label: 'Светлая' },
  { value: 'dark', label: 'Тёмная' },
]

const VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) ?? 'dev'

export function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 pt-4 pb-[calc(env(safe-area-inset-bottom)+24px)]">
        <h1 className="text-2xl font-semibold text-text">Настройки</h1>
        <AccountSection />
        <SyncSection />
        <FeedsSection />
        <NotificationsSection />
        <ThemeSection />
        <footer className="flex items-center justify-between px-1 text-sm text-faint">
          <span>Версия {VERSION}</span>
          <Link to="/design" className="underline-offset-2 hover:underline">
            Дизайн-система
          </Link>
        </footer>
      </div>
    </div>
  )
}

function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-sm font-medium text-muted">{title}</h2>
      <Card className={cn('flex flex-col gap-3', className)}>{children}</Card>
    </section>
  )
}

function AccountSection() {
  const { user } = useSession()
  return (
    <Section title="Аккаунт">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-text">{user?.email ?? '—'}</span>
          <Button variant="ghost" size="sm" onClick={() => void signOut()} className="shrink-0 text-danger">
            Выйти
          </Button>
        </div>
        <ChangePassword />
      </div>
    </Section>
  )
}

function syncText(status: SyncStatus): { text: string; danger: boolean } {
  switch (status.state) {
    case 'syncing':
      return { text: 'Синхронизация…', danger: false }
    case 'offline':
      return { text: 'Офлайн, изменения сохранены локально', danger: false }
    case 'error':
      return { text: `Ошибка: ${status.error ?? 'неизвестно'}`, danger: true }
    case 'idle':
      return {
        text: status.lastSyncAt ? `Синхронизировано ${formatTime(status.lastSyncAt)}` : 'Ожидание…',
        danger: false,
      }
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function SyncSection() {
  const { text, danger } = syncText(useSyncStatus())
  return (
    <Section title="Синхронизация">
      <span className={danger ? 'text-danger' : 'text-text'}>{text}</span>
    </Section>
  )
}

function FeedsSection() {
  const feeds = useFeeds()
  const { user } = useSession()
  const [adding, setAdding] = useState(false)

  const remove = (id: string, name: string) => {
    if (window.confirm(`Удалить календарь «${name}»?`)) void softDeleteRow('ics_feeds', id)
  }

  return (
    <Section title="Календари (ics)" className="gap-0 p-0">
      {feeds.length > 0 && (
        <ul className="divide-y divide-border">
          {feeds.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2 pr-2 pl-4">
              <ColorDot color={f.color} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-text">{f.name}</span>
                <span className="truncate text-sm text-faint">{f.url}</span>
              </span>
              <IconButton label="Удалить" size="sm" onClick={() => remove(f.id, f.name)} className="text-muted">
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                  <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
                </svg>
              </IconButton>
            </li>
          ))}
        </ul>
      )}
      <div className={cn('flex flex-col gap-2 p-4', feeds.length > 0 && 'border-t border-border')}>
        <Button variant="soft" onClick={() => setAdding(true)}>
          Добавить календарь
        </Button>
        <span className="text-sm text-faint">События подтягиваются при открытии и каждые 15 минут</span>
      </div>
      <AddFeedSheet open={adding} onClose={() => setAdding(false)} userId={user?.id ?? null} />
    </Section>
  )
}

function NotificationsSection() {
  return (
    <Section title="Уведомления">
      <NotificationsCard />
    </Section>
  )
}

function ThemeSection() {
  const mode = useTheme((s) => s.mode)
  const setMode = useTheme((s) => s.setMode)
  return (
    <Section title="Тема">
      <Segmented
        options={THEME_OPTIONS}
        value={mode}
        onChange={(v) => isThemeMode(v) && setMode(v)}
      />
    </Section>
  )
}
