import { expect, test } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import type { SyncClient } from './client'

test('real SupabaseClient is assignable to SyncClient', () => {
  const client: SyncClient = createClient('http://localhost:54321', 'anon-key')
  expect(typeof client.from).toBe('function')
  expect(typeof client.channel).toBe('function')
})
