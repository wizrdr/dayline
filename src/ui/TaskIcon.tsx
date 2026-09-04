import type { IconName } from '@/domain/types'
import { cn } from './cn'

const PATHS: Record<IconName, string> = {
  cards: '<rect x="3" y="7" width="13" height="12" rx="2"/><path d="M8 4h13v12"/>',
  box: '<path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 3l1 4M14 3l-1 4"/>',
  book: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  dumbbell: '<path d="M6 8v8M18 8v8M3 10v4M21 10v4M6 12h12"/>',
  run: '<circle cx="14" cy="4" r="1.5"/><path d="M9 21l3-6 3 2 2 4M6 13l4-3 3 1 2 3 3 1M10 10l-2-3"/>',
  code: '<path d="M8 6l-6 6 6 6M16 6l6 6-6 6M14 4l-4 16"/>',
  phone: '<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  cart: '<path d="M3 4h2l2.5 11h11L21 7H6"/><circle cx="9" cy="19" r="1.5"/><circle cx="17" cy="19" r="1.5"/>',
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  heart: '<path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z"/>',
  coffee: '<path d="M4 8h12v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M6 3v2M10 3v2"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16zM14 6l3 3"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 7M22 20a7 7 0 0 0-5-6.7"/>',
  brain: '<path d="M9 4a3 3 0 0 0-3 3v1a3 3 0 0 0-2 3 3 3 0 0 0 2 3v1a3 3 0 0 0 3 3h3V4zM15 4a3 3 0 0 1 3 3v1a3 3 0 0 1 2 3 3 3 0 0 1-2 3v1a3 3 0 0 1-3 3h-3V4z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
  star: '<path d="M12 3l2.8 5.9 6.2.9-4.5 4.4 1.1 6.3L12 17.5l-5.6 3 1.1-6.3L3 9.8l6.2-.9z"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
  flag: '<path d="M5 21V4M5 4h11l-1.5 3L16 10H5"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
}

export const ICON_NAMES = Object.keys(PATHS) as IconName[]

const SUGGEST: [RegExp, IconName][] = [
  [/anki|карточк|слов/i, 'cards'],
  [/логист|переезд|перевоз|коробк/i, 'box'],
  [/italki|англ|язык|english|урок/i, 'globe'],
  [/обед|ужин|завтрак|еда|готов/i, 'bowl'],
  [/чтени|книг|read/i, 'book'],
  [/работ|мит|созвон|стендап|встреч/i, 'briefcase'],
  [/зал|трен|спорт|йога/i, 'dumbbell'],
  [/бег|прогулк|собак/i, 'run'],
  [/код|программ|side|проект|dev/i, 'code'],
  [/звон|позвон|call/i, 'phone'],
  [/почт|письм|mail|аутрич/i, 'mail'],
  [/магазин|купить|покуп/i, 'cart'],
  [/дом|убор|стирк/i, 'home'],
  [/кофе|перерыв|отдых/i, 'coffee'],
  [/музык|подкаст/i, 'music'],
  [/писать|памятк|заметк|дневник|ревью|обзор/i, 'pen'],
  [/дебат|club|клуб|люди|семь/i, 'users'],
  [/учеб|курс|изуч|lesson/i, 'brain'],
  [/утро/i, 'sun'],
  [/сон|вечер|ночь/i, 'moon'],
]

export function suggestIcon(title: string): IconName {
  return SUGGEST.find(([re]) => re.test(title))?.[1] ?? 'star'
}

export function TaskIcon({ name, size = 20, className }: { name: IconName | null; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn('shrink-0', className)}
      dangerouslySetInnerHTML={{ __html: PATHS[name ?? 'star'] }}
    />
  )
}

export default TaskIcon
