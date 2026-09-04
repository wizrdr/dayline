import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { useSession } from '@/features/auth/session'
import { useCalendarSync } from '@/features/calendar/useCalendarSync'
import { db } from '@/db/schema'
import { setUserId } from '@/db/repo'
import { createSync, type SyncStatus } from '@/sync/sync'

const SyncContext = createContext<SyncStatus>({ state: 'idle', lastSyncAt: null })

export function useSyncStatus(): SyncStatus {
  return useContext(SyncContext)
}

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useSession()
  const [status, setStatus] = useState<SyncStatus>({ state: 'idle', lastSyncAt: null })

  useEffect(() => {
    if (!user || !supabase) return
    void setUserId(user.id)
    const sync = createSync({ client: supabase, db, userId: user.id, onStatus: setStatus })
    sync.start()
    return () => sync.stop()
  }, [user])

  useCalendarSync()

  return <SyncContext.Provider value={status}>{children}</SyncContext.Provider>
}
