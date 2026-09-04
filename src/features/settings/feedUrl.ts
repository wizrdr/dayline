export function normalizeFeedUrl(raw: string): string | null {
  const url = raw.trim()
  if (/^webcal:\/\//i.test(url)) return url.replace(/^webcal:\/\//i, 'https://')
  if (/^https?:\/\//i.test(url)) return url
  return null
}
