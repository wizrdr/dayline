# Dayline — план работ

Полный план с архитектурой: `~/.claude/plans/glistening-herding-iverson.md` (копия решений ниже).

## Решения
- PWA (iPhone + Mac), Supabase free, GitHub Pages, ics только чтение, push-напоминания в MVP, без виджета.
- Local-first: Dexie + sync LWW по `updated_at`, realtime дёргает pull.
- Повторы: серия с `weekdays[]`, экземпляры материализуются на клиенте, отклонения в `task_overrides`.
- Дизайн-система: токены в `src/styles/tokens.css`, примитивы в `src/ui`, витрина `/design`.

## Шаг 1 — каркас и синк
- [x] Scaffold Vite + зависимости + конфиги
- [x] Дизайн-система: tokens.css, Tailwind-маппинг, примитивы `src/ui`, витрина `/design`
- [x] Dexie schema + `sync.ts` + vitest на fake Supabase
- [x] Supabase: миграция 0001 (таблицы, RLS), `lib/supabase.ts`, magic-link вход
- [x] Domain: `recurrence.ts`, `layout.ts` + тесты
- [x] Экран «День» + TaskSheet (сабагент закончил 14:20; tsc чистый, 116 тестов; в браузере НЕ открывалось)
- [~] GitHub repo создан (wizrdr/dayline, private), workflow написан; ещё нет коммита, пуша и включённых Pages
- [ ] Wizard для Максима: проект Supabase, ключи, redirect URL
- [ ] ПРОВЕРКА: задача с Mac видна на iPhone без перезагрузки; офлайн-правка догоняет

## Шаг 2 — повторы и inbox
- [ ] Серии в шторке (WeekdayPicker), overrides «сделано»/перенос одного дня
- [x] Inbox + назначение на день (сделано в шаге 1)
- [ ] Перетаскивание по таймлайну (pointer events)
- [ ] Завести ритм дня: Anki 09:00 ежедн., логистика пн–чт 18:00, большой блок сб 11:00, ревью вс 21:00
- [ ] ПРОВЕРКА: vitest recurrence; на таймлайне правильные дни

## Шаг 3 — календарь
- [ ] Edge Function `ics` (ical.js, окно ±30 дней)
- [x] Настройки: ics-ленты (UI готов, загрузка событий — нет)
- [ ] Ghost-блоки событий на таймлайне, кэш в Dexie, refresh 15 мин
- [ ] ПРОВЕРКА: рабочие миты Google Calendar совпадают на сегодня

## Шаг 4 — напоминания
- [ ] `push_subscriptions`, `lib/push.ts`, SW `push` handler
- [ ] Edge Function `remind` + pg_cron каждую минуту, VAPID secrets
- [ ] ПРОВЕРКА: push приходит на iPhone при закрытом приложении

## Шаг 5 — PWA
- [ ] Manifest, иконки, offline precache
- [ ] Playwright: viewport iPhone, задачи не перекрываются
- [ ] ПРОВЕРКА: установка на экран iPhone и в Dock Mac

## Состояние на паузе (04.09.2026, 14:10)

Сделано и проверено локально (`npx tsc` без ошибок, `npx vitest run` → 18 файлов, 116 тестов зелёные):
- Каркас: Vite + React 19 + TS strict + Tailwind v4, алиас `@/`, vite-plugin-pwa (injectManifest, `src/sw.ts` с push-обработчиком), Playwright-конфиг, `e2e/smoke.spec.ts`, иконки `public/icon-*.png`.
- Дизайн-система: `src/styles/tokens.css`, `src/index.css` (`@theme inline`, палитра Tailwind по умолчанию ОТКЛЮЧЕНА — только токен-утилиты), примитивы `src/ui/*`, витрина `/design`, lint-тест на палитру `src/test/tokens-lint.test.ts`.
- Домен: `src/domain/{dates,recurrence,layout,fixtures}.ts` + тесты.
- База и синк: `src/db/{schema,repo,hooks,events}.ts`, `src/sync/{client,sync,fakeClient}.ts` + тесты (LWW, пагинация, realtime, dirty-in-flight).
- Supabase: `supabase/migrations/20260904000000_init.sql` (4 таблицы, RLS, realtime), `supabase/config.toml`, `src/lib/supabase.ts`, `src/features/auth/*` (magic link), `docs/supabase-setup.md` — инструкция для Максима.
- Приложение: `src/App.tsx` (роуты /, /inbox, /settings, /design), `src/app/{Shell,SyncProvider,theme}.tsx`, `src/features/inbox/InboxPage.tsx`, `src/features/settings/*`.

НЕ сделано / НЕ проверено:
- Приложение ни разу не собиралось целиком и не открывалось в браузере.
- Нет ни одного git-коммита, ничего не запушено, GitHub Pages не включены (`gh api -X POST repos/wizrdr/dayline/pages -f build_type=workflow` после первого пуша).
- Проект Supabase не создан (шаги в `docs/supabase-setup.md`), `.env` пуст.
- Загрузка ics (Edge Function), push (Edge Function `remind` + pg_cron), drag-resize — следующие шаги.

С чего продолжить:
1. `npm run build`, затем `npm run dev` и открыть `/design` и `/` в браузере (Playwright, viewport iPhone), исправить визуал и drag на touch.
2. Добавить в `src/features/day` секцию для скролла: проверить FAB над таб-баром и скролл к «сейчас».
3. Первый коммит, пуш в main, включить Pages, проверить Actions.
4. Wizard для Максима: Supabase-проект, ключи в `.env` и repo variables, redirect URL.
5. Решающая проверка синка на Mac + iPhone.
