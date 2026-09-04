import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/ui/cn'

const tabs = [
  { to: '/', label: 'День' },
  { to: '/inbox', label: 'Инбокс' },
  { to: '/settings', label: 'Настройки' },
]

export function Shell() {
  return (
    <div className="flex h-dvh flex-col bg-bg pt-[env(safe-area-inset-top)] text-text">
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <nav className="flex border-t border-border bg-surface pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end
            className={({ isActive }) =>
              cn(
                'flex min-h-12 flex-1 items-center justify-center text-sm font-medium',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
