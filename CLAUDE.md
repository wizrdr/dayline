# Dayline

Личный планировщик дня (аналог Structured) для одного пользователя: Mac + iPhone как PWA.
План и решения: `tasks/todo.md`. Уроки: `tasks/lessons.md`.

## Стек
React 19 + Vite + TypeScript + Tailwind v4 + zustand + react-router. Dexie (IndexedDB) как единственный источник данных на клиенте, Supabase (Postgres + Auth + Realtime + Edge Functions) как сервер синхронизации. Хостинг: GitHub Pages через Actions.

## Правила
- Local-first: UI читает и пишет только Dexie (`src/db`). Сервер трогает только `src/sync`.
- Синк: каждая строка несёт `updated_at` (ISO) и `deleted_at`; удаление всегда soft. Конфликт = last-write-wins по `updated_at`.
- Дизайн-система: цвета, отступы, радиусы только через токены `src/styles/tokens.css` и утилиты Tailwind, которые на них замаплены. В `src/features` и `src/ui` запрещены палитровые классы Tailwind (`bg-gray-*`, `text-slate-*`) и hex-цвета. Фичи собираются из примитивов `src/ui`.
- Время задач: `date` (YYYY-MM-DD, локальная дата) + `start_min` (минуты от полуночи) + `duration_min`. Никаких Date с таймзонами в модели.
- Комментарии в коде: по умолчанию нет; если нужен, одна строка на английском, только WHY.
- Проверка: `npm test` (vitest), `npm run build` (tsc + vite), `npm run e2e` (Playwright).

## Команды
```
npm run dev        # http://localhost:5173
npm test           # vitest run
npm run build
npx supabase db push          # миграции
npx supabase functions deploy # edge functions
```

## Расписание как код
Недельные серии владельца хранятся в `~/Documents/Obsidian Vault/personal/career-plan/dayline-schedule.json` (формат импорта + `key`).
Запрос «обнови расписание» = правка этого файла по `NOW.md` из vault, затем `node scripts/push-schedule.mjs --dry-run` и без флага.
Скрипт сопоставляет серии по `tasks.source_key`; ручные серии без ключа не трогает. Правила: `docs/schedule-as-code.md`.
