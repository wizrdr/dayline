import type { PushSubscriptionRow } from '@/domain/types'
import { supabase } from '@/lib/supabase'

export type PushState = 'unsupported' | 'denied' | 'subscribed' | 'unsubscribed'

const TABLE = 'push_subscriptions'

export function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
}

function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean }
  if (nav.standalone === true) return true
  return typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches
}

export function isIosNotInstalled(): boolean {
  return isIos() && !isStandalone()
}

export function pushSupported(): boolean {
  if (typeof window === 'undefined') return false
  const hasApis = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  return hasApis && !isIosNotInstalled()
}

async function currentSubscription(): Promise<PushSubscription | null> {
  const registration = await navigator.serviceWorker.getRegistration()
  return (await registration?.pushManager.getSubscription()) ?? null
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  return (await currentSubscription()) ? 'subscribed' : 'unsubscribed'
}

function vapidPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key) throw new Error('Не настроен VAPID-ключ (VITE_VAPID_PUBLIC_KEY)')
  return key
}

async function serviceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await navigator.serviceWorker.getRegistration()
  if (!registration) throw new Error('Service worker не зарегистрирован, перезагрузите страницу')
  return registration
}

export async function subscriptionId(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  const bytes = new Uint8Array(digest).slice(0, 16)
  bytes[6] = (bytes[6]! & 0x0f) | 0x50
  bytes[8] = (bytes[8]! & 0x3f) | 0x80
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

async function toRow(sub: PushSubscription, userId: string): Promise<PushSubscriptionRow> {
  const json = sub.toJSON()
  const p256dh = json.keys?.p256dh
  const auth = json.keys?.auth
  if (!json.endpoint || !p256dh || !auth) throw new Error('Браузер вернул неполную подписку')
  return {
    id: await subscriptionId(json.endpoint),
    user_id: userId,
    endpoint: json.endpoint,
    p256dh,
    auth,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    updated_at: new Date().toISOString(),
  }
}

export async function enablePush(userId: string): Promise<void> {
  if (!pushSupported()) throw new Error('Браузер не поддерживает уведомления')
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey())
  if (!supabase) throw new Error('Supabase не настроен')
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Уведомления запрещены в настройках браузера')
  }
  const registration = await serviceWorker()
  const sub =
    (await registration.pushManager.getSubscription()) ??
    (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey }))
  const { error } = await supabase.from(TABLE).upsert(await toRow(sub, userId), { onConflict: 'endpoint' })
  if (error) throw new Error(`Не удалось сохранить подписку: ${error.message}`)
}

export async function disablePush(): Promise<void> {
  const sub = await currentSubscription()
  if (!sub) return
  const { endpoint } = sub
  await sub.unsubscribe()
  if (!supabase) return
  const { error } = await supabase.from(TABLE).delete().eq('endpoint', endpoint)
  if (error) throw new Error(`Не удалось удалить подписку: ${error.message}`)
}

export async function showTestNotification(): Promise<void> {
  if (!pushSupported()) throw new Error('Браузер не поддерживает уведомления')
  if ((await Notification.requestPermission()) !== 'granted') {
    throw new Error('Уведомления запрещены в настройках браузера')
  }
  const registration = await serviceWorker()
  await registration.showNotification('Dayline', { body: 'Уведомления работают' })
}
