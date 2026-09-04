import type { Session, User } from '@supabase/supabase-js'
import { create } from 'zustand'
import { clearAllLocal } from '@/db/repo'
import { supabase } from '@/lib/supabase'

interface SessionState {
  session: Session | null
  loading: boolean
}

export const useSessionStore = create<SessionState>(() => ({
  session: null,
  loading: supabase !== null,
}))

if (supabase) {
  void supabase.auth.getSession().then(({ data }) => {
    useSessionStore.setState({ session: data.session, loading: false })
  })
  supabase.auth.onAuthStateChange((_event, session) => {
    useSessionStore.setState({ session, loading: false })
  })
}

const devUserId = import.meta.env.DEV && !supabase ? import.meta.env.VITE_DEV_USER : undefined
export const devUser: User | null = devUserId
  ? ({ id: devUserId, email: 'dev@local', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' } as User)
  : null

export function useSession(): { session: Session | null; user: User | null; loading: boolean } {
  const session = useSessionStore((s) => s.session)
  const loading = useSessionStore((s) => s.loading)
  return { session, user: session?.user ?? devUser, loading }
}

export async function signOut(): Promise<void> {
  await supabase?.auth.signOut()
  await clearAllLocal()
  useSessionStore.setState({ session: null, loading: false })
}
