import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const OUT = new URL('./directions/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const SOLID = { 1: '#e5484d', 2: '#f0842c', 3: '#e2b232', 4: '#3aa76d', 5: '#2aa1a8', 6: '#3b6cf6', 7: '#8b5cf6', 8: '#e05299' }
const SOFT = { 1: '#fdeceb', 2: '#fdefe2', 3: '#fbf3d6', 4: '#e3f5ea', 5: '#e0f4f4', 6: '#e6edfe', 7: '#eee8fd', 8: '#fce8f2' }
const SOFT_DARK = { 1: '#3a2022', 2: '#3a2a1c', 3: '#36301b', 4: '#1c3326', 5: '#1b3234', 6: '#1e2740', 7: '#2a2340', 8: '#3a1f2e' }

const week = [['пн', 31], ['вт', 1], ['ср', 2], ['чт', 3], ['пт', 4, true], ['сб', 5], ['вс', 6]]

const tasks = [
  { t: 'Anki', s: '09:00', e: '09:30', dur: 30, c: 6, icon: 'cards', done: true },
  { t: 'Стендап', s: '10:00', e: '10:30', dur: 30, cal: true },
  { t: 'Синк с продуктом', s: '14:00', e: '15:00', dur: 60, cal: true },
  { gap: '3 ч свободно' },
  { t: 'Логистика: PESEL и банк', s: '18:00', e: '19:00', dur: 60, c: 2, icon: 'box', now: true, progress: 35 },
  { t: 'italki: урок английского', s: '19:30', e: '20:15', dur: 45, c: 4, icon: 'globe' },
  { t: 'Ужин', s: '20:30', e: '21:15', dur: 45, c: 3, icon: 'bowl' },
  { t: 'Чтение', s: '22:00', e: '22:45', dur: 45, c: 7, icon: 'book' },
]
const untimed = 'Написать памятку по AI-кейсу'

const ICON = {
  cards: '<rect x="3" y="7" width="13" height="12" rx="2"/><path d="M8 4h13v12"/>',
  box: '<path d="M12 3l9 4.5v9L12 21l-9-4.5v-9L12 3z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  bowl: '<path d="M4 11h16a8 8 0 0 1-16 0z"/><path d="M9 3l1 4M14 3l-1 4"/>',
  book: '<path d="M4 5h6a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h6z"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  check: '<path d="M5 12l5 5L20 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  inbox: '<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1"/>',
  day: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 13h4"/>',
  chev: '<path d="M9 6l6 6-6 6"/>',
}
const svg = (name, size = 20, stroke = 'currentColor', sw = 1.8) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICON[name]}</svg>`

const esc = (s) => s

function shell({ font, bg, text, muted, faint, border, accent, accentFg, surface, fontLink = '', radius = 12, tabStyle, fab, body, header }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <script src="./support.js"></script>
</head>
<body>
<x-dc>
<helmet>
  ${fontLink}
  <style>
    body { margin: 0; background: ${bg}; }
    a { color: ${accent}; } a:hover { color: ${text}; }
    * { box-sizing: border-box; }
  </style>
</helmet>
<div style="width: 390px; height: 844px; position: relative; overflow: hidden; background: ${bg}; color: ${text}; font-family: ${font}; font-size: 16px; line-height: 1.35; display: flex; flex-direction: column;">
  ${header}
  <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 0;">
    ${body}
  </div>
  ${fab}
  ${tabStyle}
</div>
</x-dc>
</body>
</html>
`
}

function tabs({ surface, border, accent, muted, dark = false, square = false }) {
  const item = (icon, label, active) =>
    `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; min-height: 52px; color: ${active ? accent : muted}; font-size: 11px; font-weight: 600; letter-spacing: 0.01em;">${svg(icon, 22)}<span>${label}</span></div>`
  return `<div style="display: flex; align-items: stretch; background: ${surface}; border-top: 1px solid ${border}; padding-bottom: 18px; ${square ? '' : ''}">
    ${item('day', 'День', true)}${item('inbox', 'Инбокс', false)}${item('gear', 'Настройки', false)}
  </div>`
}

function fabBtn({ accent, accentFg, square = false, shadow = '0 8px 24px rgba(0,0,0,0.18)' }) {
  return `<div style="position: absolute; right: 20px; bottom: 96px; width: 56px; height: 56px; border-radius: ${square ? '10px' : '9999px'}; background: ${accent}; color: ${accentFg}; display: flex; align-items: center; justify-content: center; box-shadow: ${shadow};">${svg('plus', 26, accentFg, 2.2)}</div>`
}

function weekStrip({ accent, accentFg, muted, faint, text, surface, radius = 9999, pad = '0 20px 12px', chipBg = 'transparent', border = 'transparent', flat = false }) {
  const chips = week
    .map(([d, n, sel]) => {
      const bgc = sel ? accent : chipBg
      const col = sel ? accentFg : text
      return `<div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 6px 0; border-radius: ${radius}px; background: ${bgc}; border: 1px solid ${sel ? accent : border}; color: ${col};">
      <span style="font-size: 10px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${sel ? accentFg : faint};">${d}</span>
      <span style="font-size: 16px; font-weight: 600;">${n}</span>
    </div>`
    })
    .join('')
  return `<div style="display: flex; gap: 6px; padding: ${pad};">${chips}</div>`
}

function headerBlock({ title = 'Сегодня', sub = 'пятница, 4 сентября', text, muted, sizeTitle = 30, weight = 700, family = 'inherit', extra = '', pad = '18px 20px 8px', align = 'space-between' }) {
  return `<div style="display: flex; align-items: flex-end; justify-content: ${align}; padding: ${pad};">
    <div style="display: flex; flex-direction: column; gap: 2px;">
      <div style="font-size: ${sizeTitle}px; font-weight: ${weight}; letter-spacing: -0.02em; line-height: 1.05; font-family: ${family}; color: ${text};">${title}</div>
      <div style="font-size: 14px; color: ${muted};">${sub}</div>
    </div>
    ${extra}
  </div>`
}

const nowLabel = (muted, accent) =>
  `<div style="display: flex; align-items: center; gap: 8px; padding: 0 20px 10px; font-size: 13px; color: ${muted};"><span style="width: 8px; height: 8px; border-radius: 9999px; background: ${accent};"></span>Сейчас: Логистика · Далее: italki 19:30</div>`

// ---------- Layout: FEED (cards + rail with icon circles) ----------
function feed(th, opts = {}) {
  const { surface, text, muted, faint, border, accent, dark } = th
  const soft = dark ? SOFT_DARK : SOFT
  const iconSize = opts.iconSize ?? 40
  const r = opts.radius ?? 16
  const cardPad = opts.cardPad ?? '12px 14px'
  const rows = tasks
    .map((x) => {
      if (x.gap)
        return `<div style="display: flex; align-items: center; gap: 12px; padding: 4px 0 4px ${iconSize / 2 - 1 + 20}px;">
          <div style="width: 2px; height: 28px; border-radius: 2px; background: ${border};"></div>
          <span style="font-size: 12px; color: ${faint}; margin-left: ${iconSize / 2 + 3}px;">${x.gap}</span>
        </div>`
      const isCal = !!x.cal
      const col = isCal ? muted : SOLID[x.c]
      const bgc = isCal ? 'transparent' : surface
      const iconBg = isCal ? 'transparent' : opts.solidIcon ? col : soft[x.c]
      const iconFg = isCal ? faint : opts.solidIcon ? '#fff' : col
      const rightMark = x.done
        ? `<div style="width: 24px; height: 24px; border-radius: 9999px; background: ${col}; display: flex; align-items: center; justify-content: center;">${svg('check', 14, '#fff', 2.5)}</div>`
        : isCal
          ? ''
          : `<div style="width: 24px; height: 24px; border-radius: 9999px; border: 1.5px solid ${border};"></div>`
      const progress = x.now
        ? `<div style="height: 3px; border-radius: 2px; background: ${soft[x.c]}; margin-top: 8px; overflow: hidden;"><div style="width: ${x.progress}%; height: 100%; background: ${col};"></div></div>`
        : ''
      return `<div style="display: flex; align-items: stretch; gap: 12px; padding: 0 20px;">
        <div style="display: flex; flex-direction: column; align-items: center; width: ${iconSize}px; flex: none;">
          <div style="width: ${iconSize}px; height: ${iconSize}px; border-radius: ${opts.iconRadius ?? 9999}px; background: ${iconBg}; border: ${isCal ? `1.5px dashed ${border}` : 'none'}; display: flex; align-items: center; justify-content: center; color: ${iconFg};">${svg(isCal ? 'cal' : x.icon, iconSize * 0.5, iconFg)}</div>
          <div style="flex: 1; width: 2px; background: ${border}; margin: 6px 0;"></div>
        </div>
        <div style="flex: 1; margin-bottom: 10px; padding: ${cardPad}; border-radius: ${r}px; background: ${bgc}; border: ${isCal ? `1.5px dashed ${border}` : opts.cardBorder ? `1px solid ${border}` : 'none'}; box-shadow: ${isCal || !opts.shadow ? 'none' : opts.shadow}; opacity: ${x.done ? 0.6 : 1};">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 0;">
              <div style="font-weight: 600; font-size: 15px; text-decoration: ${x.done ? 'line-through' : 'none'}; color: ${isCal ? muted : text}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${x.t}</div>
              <div style="font-size: 12.5px; color: ${faint};">${x.s}–${x.e} · ${x.dur} мин</div>
            </div>
            ${rightMark}
          </div>
          ${progress}
        </div>
      </div>`
    })
    .join('')
  const untimedRow = `<div style="margin: 4px 20px 12px; padding: 12px 14px; border-radius: ${r}px; background: ${surface}; border: 1px dashed ${border}; display: flex; align-items: center; gap: 12px; color: ${text};">
    <div style="width: 24px; height: 24px; border-radius: 9999px; border: 1.5px solid ${border};"></div>
    <div style="flex: 1; font-size: 15px;">${untimed}</div>
    <span style="font-size: 12px; color: ${faint};">без времени</span>
  </div>`
  return `${untimedRow}<div style="display: flex; flex-direction: column; overflow: hidden;">${rows}</div>`
}

// ---------- Layout: DENSE LIST ----------
function dense(th) {
  const { surface, text, muted, faint, border, accent } = th
  const rows = tasks
    .map((x) => {
      if (x.gap) return `<div style="padding: 6px 16px; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: ${faint}; background: ${th.bg};">${x.gap}</div>`
      const isCal = !!x.cal
      const col = isCal ? faint : SOLID[x.c]
      return `<div style="display: flex; align-items: center; gap: 12px; padding: 11px 16px; border-bottom: 1px solid ${border}; background: ${x.now ? th.nowBg ?? surface : surface};">
        <div style="width: 44px; font-size: 13px; font-variant-numeric: tabular-nums; color: ${x.now ? accent : muted}; font-weight: ${x.now ? 700 : 500};">${x.s}</div>
        <div style="width: 10px; height: 10px; border-radius: ${isCal ? '2px' : '9999px'}; background: ${isCal ? 'transparent' : col}; border: ${isCal ? `1.5px solid ${faint}` : 'none'}; flex: none;"></div>
        <div style="flex: 1; font-size: 15px; color: ${isCal ? muted : text}; text-decoration: ${x.done ? 'line-through' : 'none'}; opacity: ${x.done ? 0.55 : 1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${x.t}</div>
        <div style="font-size: 12px; color: ${faint};">${x.dur}м</div>
        ${x.done ? svg('check', 18, col, 2.4) : `<div style="width: 20px; height: 20px; border-radius: 9999px; border: 1.5px solid ${border};"></div>`}
      </div>`
    })
    .join('')
  return `<div style="border-top: 1px solid ${border};">${rows}
    <div style="display: flex; align-items: center; gap: 12px; padding: 11px 16px; color: ${text};">
      <div style="width: 44px; font-size: 12px; color: ${faint};">—</div>
      <div style="width: 10px; height: 10px; border-radius: 9999px; border: 1.5px dashed ${faint};"></div>
      <div style="flex: 1; font-size: 15px;">${untimed}</div>
    </div>
  </div>`
}

// ---------- Layout: PROPORTIONAL BLOCKS ----------
function proportional(th) {
  const { surface, text, muted, faint, border, accent, dark } = th
  const soft = dark ? SOFT_DARK : SOFT
  const px = (m) => Math.max(44, m * 1.1)
  const rows = tasks
    .map((x) => {
      if (x.gap)
        return `<div style="height: 48px; display: flex; align-items: center; justify-content: center; margin: 0 20px; border-left: 2px dashed ${border}; padding-left: 12px; font-size: 12px; color: ${faint}; justify-content: flex-start;">${x.gap}</div>`
      const isCal = !!x.cal
      const col = isCal ? muted : SOLID[x.c]
      const h = px(x.dur)
      return `<div style="display: flex; gap: 10px; margin: 0 20px 6px; height: ${h}px;">
        <div style="width: 44px; font-size: 12px; color: ${x.now ? accent : faint}; font-variant-numeric: tabular-nums; padding-top: 4px; font-weight: ${x.now ? 700 : 500};">${x.s}</div>
        <div style="flex: 1; border-radius: 12px; background: ${isCal ? 'transparent' : col}; color: ${isCal ? muted : '#fff'}; border: ${isCal ? `1.5px dashed ${border}` : 'none'}; padding: 10px 14px; display: flex; flex-direction: column; justify-content: space-between; opacity: ${x.done ? 0.5 : 1}; position: relative; overflow: hidden;">
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
            <div style="font-weight: 700; font-size: 15px; letter-spacing: -0.01em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; text-decoration: ${x.done ? 'line-through' : 'none'};">${x.t}</div>
            ${isCal ? svg('cal', 16, faint) : x.done ? svg('check', 18, '#fff', 2.5) : `<div style="width: 20px; height: 20px; border-radius: 9999px; border: 1.5px solid rgba(255,255,255,0.7);"></div>`}
          </div>
          ${h > 60 ? `<div style="font-size: 12px; opacity: 0.85;">${x.s}–${x.e} · ${x.dur} мин</div>` : ''}
          ${x.now ? `<div style="position: absolute; left: 0; right: 0; bottom: 0; height: 4px; background: rgba(255,255,255,0.35);"><div style="width: ${x.progress}%; height: 100%; background: #fff;"></div></div>` : ''}
        </div>
      </div>`
    })
    .join('')
  return `<div style="padding: 12px 0 0;">${rows}</div>`
}

// ---------- Layout: HERO NOW + compact list ----------
function hero(th) {
  const { surface, text, muted, faint, border, accent, accentFg, dark } = th
  const soft = dark ? SOFT_DARK : SOFT
  const now = tasks.find((x) => x.now)
  const col = SOLID[now.c]
  const heroCard = `<div style="margin: 0 20px 16px; padding: 20px; border-radius: 24px; background: ${col}; color: #fff; display: flex; flex-direction: column; gap: 14px; box-shadow: 0 16px 40px -16px ${col};">
    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; opacity: 0.9;"><span>Сейчас</span><span>ещё 40 мин</span></div>
    <div style="display: flex; align-items: center; gap: 14px;">
      <div style="width: 52px; height: 52px; border-radius: 16px; background: rgba(255,255,255,0.22); display: flex; align-items: center; justify-content: center;">${svg(now.icon, 28, '#fff')}</div>
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <div style="font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">${now.t}</div>
        <div style="font-size: 14px; opacity: 0.9;">${now.s}–${now.e}</div>
      </div>
    </div>
    <div style="height: 6px; border-radius: 3px; background: rgba(255,255,255,0.3); overflow: hidden;"><div style="width: ${now.progress}%; height: 100%; background: #fff;"></div></div>
    <div style="display: flex; gap: 10px;">
      <div style="flex: 1; text-align: center; padding: 11px; border-radius: 9999px; background: #fff; color: ${col}; font-weight: 700; font-size: 14px;">Готово</div>
      <div style="flex: 1; text-align: center; padding: 11px; border-radius: 9999px; background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; font-size: 14px;">+15 мин</div>
    </div>
  </div>`
  const rest = tasks
    .filter((x) => !x.gap && !x.now)
    .map((x) => {
      const isCal = !!x.cal
      const c = isCal ? faint : SOLID[x.c]
      return `<div style="display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${border};">
        <div style="width: 34px; height: 34px; border-radius: 10px; background: ${isCal ? 'transparent' : soft[x.c]}; border: ${isCal ? `1.5px dashed ${border}` : 'none'}; display: flex; align-items: center; justify-content: center; color: ${c};">${svg(isCal ? 'cal' : x.icon, 18, c)}</div>
        <div style="flex: 1; min-width: 0;"><div style="font-size: 15px; font-weight: 600; color: ${isCal ? muted : text}; text-decoration: ${x.done ? 'line-through' : 'none'}; opacity: ${x.done ? 0.55 : 1}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${x.t}</div><div style="font-size: 12px; color: ${faint};">${x.s}–${x.e}</div></div>
        ${x.done ? svg('check', 18, c, 2.4) : ''}
      </div>`
    })
    .join('')
  return `${heroCard}<div style="margin: 0 20px; padding: 0 0 8px; font-size: 12px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; color: ${faint};">Дальше сегодня</div><div style="margin: 0 20px; display: flex; flex-direction: column;">${rest}</div>`
}

// ---------- Layout: EDITORIAL (serif numerals, hairlines) ----------
function editorial(th) {
  const { text, muted, faint, border, accent, serif } = th
  const rows = tasks
    .map((x) => {
      if (x.gap) return `<div style="padding: 14px 24px; font-size: 13px; font-style: italic; color: ${faint}; font-family: ${serif};">${x.gap}</div>`
      const isCal = !!x.cal
      const col = isCal ? faint : SOLID[x.c]
      return `<div style="display: flex; gap: 16px; padding: 14px 24px; border-top: 1px solid ${border}; align-items: baseline; ${x.now ? `background: ${th.nowBg};` : ''}">
        <div style="width: 64px; font-family: ${serif}; font-size: 22px; letter-spacing: -0.02em; color: ${x.now ? text : muted}; font-variant-numeric: tabular-nums; line-height: 1;">${x.s}</div>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: center; gap: 8px;"><span style="width: 8px; height: 8px; border-radius: 9999px; background: ${col}; ${isCal ? `background: transparent; border: 1.5px solid ${faint};` : ''}"></span><span style="font-size: 16px; color: ${isCal ? muted : text}; text-decoration: ${x.done ? 'line-through' : 'none'}; opacity: ${x.done ? 0.5 : 1};">${x.t}</span></div>
          <div style="font-size: 12px; color: ${faint}; letter-spacing: 0.04em;">${x.dur} мин · до ${x.e}${x.now ? ' · идёт' : ''}</div>
        </div>
        ${x.done ? svg('check', 18, muted, 2) : ''}
      </div>`
    })
    .join('')
  return `<div style="border-bottom: 1px solid ${border};">${rows}</div><div style="padding: 14px 24px; font-size: 14px; color: ${muted}; font-style: italic; font-family: ${serif};">Без времени: ${untimed}</div>`
}

// ---------- Layout: MONO BRUTALIST ----------
function mono(th) {
  const { text, muted, faint, border, accent, surface } = th
  const rows = tasks
    .map((x) => {
      if (x.gap) return `<div style="padding: 10px 16px; font-size: 12px; color: ${faint}; border-bottom: 2px solid ${text};">// ${x.gap.toLowerCase()}</div>`
      const isCal = !!x.cal
      const col = isCal ? 'transparent' : SOLID[x.c]
      return `<div style="display: flex; align-items: stretch; border-bottom: 2px solid ${text}; background: ${x.now ? text : surface}; color: ${x.now ? surface : text};">
        <div style="width: 70px; padding: 12px 10px; border-right: 2px solid ${x.now ? surface : text}; font-size: 13px; display: flex; flex-direction: column; gap: 2px;"><span>${x.s}</span><span style="opacity: 0.6;">${x.e}</span></div>
        <div style="width: 14px; background: ${col}; border-right: 2px solid ${x.now ? surface : text}; ${isCal ? `background: repeating-linear-gradient(45deg, ${border} 0 3px, transparent 3px 6px);` : ''}"></div>
        <div style="flex: 1; padding: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 0.02em; text-decoration: ${x.done ? 'line-through' : 'none'}; opacity: ${x.done ? 0.5 : 1};">${x.t}${x.now ? `<div style="font-size: 11px; opacity: 0.7; text-transform: none; margin-top: 4px;">[${'#'.repeat(7)}${'.'.repeat(13)}] ${x.progress}%</div>` : ''}</div>
        <div style="width: 48px; display: flex; align-items: center; justify-content: center; border-left: 2px solid ${x.now ? surface : text}; font-size: 14px;">${x.done ? '[x]' : isCal ? '' : '[ ]'}</div>
      </div>`
    })
    .join('')
  return `<div style="border-top: 2px solid ${text};">${rows}</div><div style="padding: 12px 16px; font-size: 13px; color: ${muted};">[ ] ${untimed} <span style="color: ${faint};">— без времени</span></div>`
}

// ---------- Layout: RAIL (big hours left) ----------
function rail(th) {
  const { surface, text, muted, faint, border, accent, dark } = th
  const soft = dark ? SOFT_DARK : SOFT
  const rows = tasks
    .map((x) => {
      if (x.gap) return `<div style="display: flex; gap: 14px; padding: 0 20px; height: 44px; align-items: center;"><div style="width: 56px;"></div><div style="flex: 1; border-top: 1px dashed ${border}; position: relative;"><span style="position: absolute; top: -9px; left: 0; background: ${th.bg}; padding-right: 8px; font-size: 12px; color: ${faint};">${x.gap}</span></div></div>`
      const isCal = !!x.cal
      const col = isCal ? muted : SOLID[x.c]
      return `<div style="display: flex; gap: 14px; padding: 0 20px 10px; align-items: flex-start;">
        <div style="width: 56px; flex: none; padding-top: 6px;"><div style="font-size: 22px; font-weight: 800; letter-spacing: -0.04em; line-height: 1; color: ${x.now ? accent : text}; opacity: ${x.done ? 0.4 : 1};">${x.s.slice(0, 2)}<span style="font-size: 13px; font-weight: 600; opacity: 0.6;">:${x.s.slice(3)}</span></div></div>
        <div style="flex: 1; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 14px; background: ${isCal ? 'transparent' : soft[x.c]}; border: ${isCal ? `1.5px dashed ${border}` : 'none'}; opacity: ${x.done ? 0.55 : 1}; border-left: ${isCal ? `1.5px dashed ${border}` : `4px solid ${col}`};">
          <div style="flex: 1; min-width: 0;"><div style="font-size: 15px; font-weight: 700; color: ${isCal ? muted : text}; text-decoration: ${x.done ? 'line-through' : 'none'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${x.t}</div><div style="font-size: 12px; color: ${isCal ? faint : col}; font-weight: 600;">${x.dur} мин${x.now ? ` · осталось 40` : ''}</div></div>
          ${x.done ? svg('check', 18, col, 2.5) : isCal ? svg('cal', 18, faint) : `<div style="width: 22px; height: 22px; border-radius: 7px; border: 2px solid ${col}; opacity: 0.7;"></div>`}
        </div>
      </div>`
    })
    .join('')
  return `<div style="padding-top: 8px;">${rows}</div>`
}

// ---------- Directions ----------
const SYS = `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif`
const light = { bg: '#f5f5f7', surface: '#ffffff', text: '#1c1c1e', muted: '#6e6e73', faint: '#a1a1a6', border: '#e3e3e8', accent: '#3b6cf6', accentFg: '#ffffff' }
const darkT = { bg: '#0f0f11', surface: '#1a1a1e', text: '#f2f2f5', muted: '#9a9aa3', faint: '#63636b', border: '#2b2b32', accent: '#6f93ff', accentFg: '#0f0f11', dark: true }

const dirs = []

// A — Лента карточек (мягкая, светлая)
{
  const th = { ...light, font: SYS }
  dirs.push({
    file: 'Main.dc.html', title: 'A · Лента', note: 'Карточки на вертикальной нити, иконка в мягком круге, прогресс у текущей. Самое близкое к привычному.',
    html: shell({ ...th, header: headerBlock({ ...th }) + weekStrip({ ...th }) + nowLabel(th.muted, SOLID[2]), body: feed(th, { shadow: '0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)' }), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}
// B — Графит (тёмная лента)
{
  const th = { ...darkT, font: SYS }
  dirs.push({
    file: 'B-Grafit.dc.html', title: 'B · Графит', note: 'Та же лента в тёмном. Цвета задач приглушённые, иконки на тёмных подложках.',
    html: shell({ ...th, header: headerBlock({ ...th }) + weekStrip({ ...th, chipBg: th.surface, border: th.border }) + nowLabel(th.muted, SOLID[2]), body: feed(th, { cardBorder: true }), fab: fabBtn(th, { shadow: '0 8px 24px rgba(0,0,0,0.5)' }), tabStyle: tabs(th) }),
  })
}
// C — Редакторская (serif)
{
  const serif = `'Newsreader', Georgia, 'Times New Roman', serif`
  const th = { bg: '#faf8f4', surface: '#faf8f4', text: '#1b1a17', muted: '#6b665c', faint: '#a39d91', border: '#e6e1d7', accent: '#1b1a17', accentFg: '#faf8f4', font: SYS, serif, nowBg: '#f1ede4' }
  dirs.push({
    file: 'C-Redaktorskaya.dc.html', title: 'C · Редакторская', note: 'Серифные цифры времени, тонкие линейки, почти без цвета. Спокойно, как бумажный ежедневник.',
    html: shell({ ...th, fontLink: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400&display=swap">`, header: headerBlock({ ...th, title: 'Пятница', sub: '4 сентября · 3 дела, 2 встречи', sizeTitle: 40, weight: 400, family: serif }) + weekStrip({ ...th, radius: 4, chipBg: 'transparent', pad: '0 24px 8px' }), body: editorial(th), fab: fabBtn({ ...th, square: true, shadow: 'none' }), tabStyle: tabs(th) }),
  })
}
// D — Плотный список
{
  const th = { ...light, bg: '#f2f2f7', font: SYS, nowBg: '#fff7ed' }
  dirs.push({
    file: 'D-Plotnyj.dc.html', title: 'D · Плотный', note: 'Компактные строки: время, точка цвета, название. Максимум дел на экране, минимум декора.',
    html: shell({ ...th, header: headerBlock({ ...th, sizeTitle: 26, pad: '16px 16px 8px' }) + weekStrip({ ...th, pad: '0 16px 10px' }), body: dense(th), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}
// E — Блоки по длительности
{
  const th = { ...light, font: SYS }
  dirs.push({
    file: 'E-Bloki.dc.html', title: 'E · Блоки', note: 'Высота карточки пропорциональна длительности, свободное время подписано. Сплошная заливка цветом.',
    html: shell({ ...th, header: headerBlock({ ...th }) + weekStrip({ ...th }), body: proportional(th), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}
// F — Крупные иконки, крем
{
  const th = { bg: '#f7f3ec', surface: '#ffffff', text: '#221f1a', muted: '#6f6a60', faint: '#a8a196', border: '#e9e2d6', accent: '#e07a3a', accentFg: '#ffffff', font: `'Manrope', ${SYS}` }
  dirs.push({
    file: 'F-Krem.dc.html', title: 'F · Крем', note: 'Тёплый кремовый фон, крупные квадратные иконки в цвете задачи, большие радиусы. Дружелюбно.',
    html: shell({ ...th, fontLink: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Manrope:wght@500;600;700;800&display=swap">`, header: headerBlock({ ...th, weight: 800 }) + weekStrip({ ...th, radius: 14, chipBg: th.surface, border: th.border }), body: feed(th, { iconSize: 48, iconRadius: 14, solidIcon: true, radius: 18, shadow: '0 2px 10px rgba(60,40,10,0.06)' }), fab: fabBtn(th, { shadow: '0 10px 24px rgba(224,122,58,0.35)' }), tabStyle: tabs(th) }),
  })
}
// G — Фокус на «сейчас»
{
  const th = { ...light, font: SYS }
  dirs.push({
    file: 'G-Fokus.dc.html', title: 'G · Фокус', note: 'Текущее дело — большая карточка с прогрессом и действиями, остальное компактным списком ниже.',
    html: shell({ ...th, header: headerBlock({ ...th, sizeTitle: 28 }) + weekStrip({ ...th, pad: '0 20px 16px' }), body: hero(th), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}
// H — Моно
{
  const th = { bg: '#f4f4f0', surface: '#f4f4f0', text: '#111111', muted: '#555555', faint: '#8a8a8a', border: '#cfcfc8', accent: '#111111', accentFg: '#f4f4f0', font: `'JetBrains Mono', ui-monospace, Menlo, monospace` }
  dirs.push({
    file: 'H-Mono.dc.html', title: 'H · Моно', note: 'Моноширинный шрифт, чёрные линии 2px, квадратные углы, цвет только полосой. Инструмент, не приложение.',
    html: shell({ ...th, fontLink: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600;700&display=swap">`, header: headerBlock({ ...th, title: 'ПТ 04.09', sub: 'сегодня · 18:20', sizeTitle: 26, weight: 700 }) + weekStrip({ ...th, radius: 0, chipBg: 'transparent', border: th.border, pad: '0 16px 12px' }), body: mono(th), fab: fabBtn({ ...th, square: true, shadow: '4px 4px 0 #8a8a8a' }), tabStyle: tabs({ ...th, square: true }) }),
  })
}
// I — Бумага (тёплая, округлый шрифт)
{
  const th = { bg: '#fbf7f0', surface: '#fffdf8', text: '#2b2620', muted: '#7a7166', faint: '#b0a698', border: '#ece4d8', accent: '#2f9e6b', accentFg: '#ffffff', font: `'Nunito', ${SYS}` }
  dirs.push({
    file: 'I-Bumaga.dc.html', title: 'I · Бумага', note: 'Тёплая бумажная гамма, округлый шрифт, тонкая пунктирная нить. Мягче А, без «приложенческого» глянца.',
    html: shell({ ...th, fontLink: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;600;700;800&display=swap">`, header: headerBlock({ ...th, weight: 800, sizeTitle: 30 }) + weekStrip({ ...th, radius: 12, chipBg: th.surface, border: th.border }), body: feed(th, { iconSize: 40, radius: 16, cardBorder: true, untimedTop: true }), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}
// J — Рельс часов
{
  const th = { ...light, bg: '#ffffff', surface: '#ffffff', font: SYS }
  dirs.push({
    file: 'J-Rels.dc.html', title: 'J · Рельс', note: 'Крупные часы слева как рельс, справа мягкие карточки с цветным ребром. Время читается первым.',
    html: shell({ ...th, header: headerBlock({ ...th, sizeTitle: 32, weight: 800 }) + weekStrip({ ...th, pad: '0 20px 14px' }), body: rail(th), fab: fabBtn(th), tabStyle: tabs(th) }),
  })
}

for (const d of dirs) writeFileSync(join(OUT, d.file), d.html)

const W = 390, H = 844, GX = 120, GY = 200
const artboards = dirs.map((d, i) => ({ file: d.file, title: d.title, x: (i % 5) * (W + GX), y: Math.floor(i / 5) * (H + GY), w: W, h: H }))
const annotations = dirs.map((d, i) => ({ id: `note-${d.title[0].toLowerCase()}`, x: (i % 5) * (W + GX), y: Math.floor(i / 5) * (H + GY) + H + 24, w: W, text: `${d.title}\n${d.note}` }))
writeFileSync(join(OUT, 'canvas.json'), JSON.stringify({ artboards, annotations, launch: { view: 'canvas' } }, null, 2))
console.log('written', dirs.length, 'artboards')
