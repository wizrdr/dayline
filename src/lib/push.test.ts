import {
  disablePush,
  enablePush,
  getPushState,
  isIosNotInstalled,
  pushSupported,
  subscriptionId,
  urlBase64ToUint8Array,
} from './push'

const supabaseMock: { supabase: unknown } = { supabase: null }
vi.mock('@/lib/supabase', () => ({
  get supabase() {
    return supabaseMock.supabase
  },
}))

const ENDPOINT = 'https://push.example.com/sub/abc'

function fakeSubscription(overrides: Partial<PushSubscriptionJSON> = {}) {
  return {
    endpoint: ENDPOINT,
    toJSON: () => ({ endpoint: ENDPOINT, keys: { p256dh: 'p', auth: 'a' }, ...overrides }),
    unsubscribe: vi.fn().mockResolvedValue(true),
  }
}

function installPushApis(sub: ReturnType<typeof fakeSubscription> | null, permission: NotificationPermission) {
  const pushManager = {
    getSubscription: vi.fn().mockResolvedValue(sub),
    subscribe: vi.fn().mockResolvedValue(fakeSubscription()),
  }
  const registration = { pushManager, showNotification: vi.fn() }
  Object.defineProperty(navigator, 'serviceWorker', {
    value: { getRegistration: vi.fn().mockResolvedValue(registration) },
    configurable: true,
  })
  vi.stubGlobal('PushManager', class {})
  vi.stubGlobal('Notification', { permission, requestPermission: vi.fn().mockResolvedValue(permission) })
  return { pushManager, registration }
}

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
  Reflect.deleteProperty(navigator, 'serviceWorker')
  Reflect.deleteProperty(navigator, 'standalone')
  Reflect.deleteProperty(navigator, 'userAgent')
  supabaseMock.supabase = null
})

describe('urlBase64ToUint8Array', () => {
  it('decodes plain base64', () => {
    expect(Array.from(urlBase64ToUint8Array('AQID'))).toEqual([1, 2, 3])
  })
  it('handles url-safe alphabet and missing padding', () => {
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual(Array.from(urlBase64ToUint8Array('+/8=')))
    expect(Array.from(urlBase64ToUint8Array('-_8'))).toEqual([251, 255])
  })
  it('returns a real ArrayBuffer-backed view', () => {
    expect(urlBase64ToUint8Array('AQ').buffer).toBeInstanceOf(ArrayBuffer)
  })
})

describe('subscriptionId', () => {
  it('is a stable uuid derived from the endpoint', async () => {
    const a = await subscriptionId(ENDPOINT)
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
    expect(await subscriptionId(ENDPOINT)).toBe(a)
    expect(await subscriptionId(`${ENDPOINT}2`)).not.toBe(a)
  })
})

describe('isIosNotInstalled', () => {
  it('is false on non-iOS', () => {
    setUserAgent('Mozilla/5.0 (Macintosh) Safari')
    expect(isIosNotInstalled()).toBe(false)
  })
  it('is true on iPhone in the browser tab', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari')
    expect(isIosNotInstalled()).toBe(true)
  })
  it('is false on iPhone when installed', () => {
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari')
    Object.defineProperty(navigator, 'standalone', { value: true, configurable: true })
    expect(isIosNotInstalled()).toBe(false)
  })
})

describe('getPushState', () => {
  it('is unsupported in a bare jsdom', async () => {
    expect(pushSupported()).toBe(false)
    expect(await getPushState()).toBe('unsupported')
  })
  it('is unsupported on iPhone outside the installed app', async () => {
    installPushApis(null, 'default')
    setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari')
    expect(await getPushState()).toBe('unsupported')
  })
  it('is denied when permission is denied', async () => {
    installPushApis(null, 'denied')
    expect(await getPushState()).toBe('denied')
  })
  it('is unsubscribed without a subscription', async () => {
    installPushApis(null, 'default')
    expect(await getPushState()).toBe('unsubscribed')
  })
  it('is subscribed with a subscription', async () => {
    installPushApis(fakeSubscription(), 'granted')
    expect(await getPushState()).toBe('subscribed')
  })
})

describe('enablePush', () => {
  it('throws a Russian error when unsupported', async () => {
    await expect(enablePush('u1')).rejects.toThrow('Браузер не поддерживает уведомления')
  })
  it('throws when the VAPID key is missing', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    installPushApis(null, 'default')
    await expect(enablePush('u1')).rejects.toThrow('VITE_VAPID_PUBLIC_KEY')
  })
  it('throws when permission is refused', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
    installPushApis(null, 'denied')
    supabaseMock.supabase = { from: vi.fn() }
    await expect(enablePush('u1')).rejects.toThrow('запрещены')
  })
  it('subscribes and upserts the row keyed by endpoint', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
    const { pushManager } = installPushApis(null, 'granted')
    const upsert = vi.fn().mockResolvedValue({ error: null })
    supabaseMock.supabase = { from: vi.fn().mockReturnValue({ upsert }) }

    await enablePush('u1')

    expect(pushManager.subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array),
    })
    const [row, options] = upsert.mock.calls[0]!
    expect(options).toEqual({ onConflict: 'endpoint' })
    expect(row).toMatchObject({
      id: await subscriptionId(ENDPOINT),
      user_id: 'u1',
      endpoint: ENDPOINT,
      p256dh: 'p',
      auth: 'a',
    })
    expect(typeof row.tz).toBe('string')
  })
  it('surfaces a supabase error', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', 'AQID')
    installPushApis(fakeSubscription(), 'granted')
    const upsert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    supabaseMock.supabase = { from: vi.fn().mockReturnValue({ upsert }) }
    await expect(enablePush('u1')).rejects.toThrow('boom')
  })
})

describe('disablePush', () => {
  it('unsubscribes and deletes the row by endpoint', async () => {
    const sub = fakeSubscription()
    installPushApis(sub, 'granted')
    const eq = vi.fn().mockResolvedValue({ error: null })
    supabaseMock.supabase = { from: vi.fn().mockReturnValue({ delete: () => ({ eq }) }) }

    await disablePush()

    expect(sub.unsubscribe).toHaveBeenCalled()
    expect(eq).toHaveBeenCalledWith('endpoint', ENDPOINT)
  })
  it('is a no-op without a subscription', async () => {
    installPushApis(null, 'granted')
    supabaseMock.supabase = { from: vi.fn() }
    await disablePush()
    expect((supabaseMock.supabase as { from: ReturnType<typeof vi.fn> }).from).not.toHaveBeenCalled()
  })
})
