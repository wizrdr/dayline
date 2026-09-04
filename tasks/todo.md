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
- [x] Экран «День» + TaskSheet; проверено в браузере (Playwright, viewport iPhone): создание задач, колонки при пересечении, «без времени»
- [x] GitHub repo (wizrdr/dayline, ПУБЛИЧНЫЙ — Pages на free-тарифе только так) + Actions деплой; сайт https://wizrdr.github.io/dayline/ открывается (04.09 16:10)
- [x] Supabase настроен 04.09 17:10: проект ghuhochssdbzyxextlso (Frankfurt), миграции накачены, функции ics/remind задеплоены, secrets и remind_config заданы, cron бьёт в remind каждую минуту (проверено: 200), auth site/redirect URL заданы, ключи в .env и repo variables
- [x] ПРОВЕРКА 04.09 17:35: задача с Mac видна на iPhone (подтвердил Максим); офлайн-правка отдельно не проверялась

## Шаг 2 — повторы и inbox
- [x] Серии в шторке (WeekdayPicker), overrides «сделано»/перенос/пропуск одного дня
- [x] Inbox + назначение на день (сделано в шаге 1)
- [~] Перетаскивание по таймлайну (pointer events) — код и unit-тесты есть, на реальном touch НЕ проверено
- [ ] Завести ритм дня: Anki 09:00 ежедн., логистика пн–чт 18:00, большой блок сб 11:00, ревью вс 21:00
- [ ] ПРОВЕРКА: vitest recurrence; на таймлайне правильные дни

## Шаг 3 — календарь
- [x] Edge Function `ics` (ical.js, окно −7…+30 дней; 8 Deno-тестов, deno check OK)
- [x] Настройки: ics-ленты (UI готов, загрузка событий — нет)
- [x] Ghost-блоки событий на таймлайне, кэш в Dexie, refresh 15 мин (`src/features/calendar`)
- [ ] ПРОВЕРКА: рабочие миты Google Calendar совпадают на сегодня

## Шаг 4 — напоминания
- [x] `push_subscriptions`, `lib/push.ts`, SW `push` handler, карточка в настройках
- [x] Edge Function `remind` + pg_cron каждую минуту (deno check OK; инструкция `docs/push-setup.md`)
- [~] ПРОВЕРКА: тестовое уведомление на iPhone пришло (подтвердил Максим); напоминание от cron при закрытом приложении ещё не проверялось

## Шаг 5 — PWA
- [x] Manifest, иконки, offline precache (SW регистрируется на живом сайте)
- [x] Playwright: `e2e/day.spec.ts` + `e2e/smoke.spec.ts` на iPhone/desktop (Chromium), 8 тестов зелёные
- [x] ПРОВЕРКА: установлено на экран iPhone, вход в PWA работает (подтвердил Максим)

## Шаг 7 — доводка после первого использования (04.09 вечер)
- [x] Отступ под чёлку, крестик в шторке
- [x] Расписание Максима в базе: 19 серий (ритм + почасовой шаблон из NOW.md), описания у серий
- [x] Свайп по всему экрану «День» переключает день (useSwipe), анимация перехода
- [x] Нейтральная карточка фокуса подсвечена цветом в тёмной теме
- [x] Описание дела в строках списка и в карточке
- [x] Секция «Раньше сегодня» (свёрнута), скелет вместо мигания при загрузке
- [x] QA двумя агентами: hero открывается тапом, «Готово» у следующего дела, gap через hero, 24:00, Enter в форме календаря, тема на витрине, DurationField 5..1440, контраст text-faint, единая ширина колонки 480, FAB у колонки
- [ ] ПРОВЕРКА Максимом на iPhone: свайп пальцем, синк 19 серий, тёмная тема
- [ ] Отложено: подсказка «серии начнутся с …» после импорта; ореол IconPicker на витрине

## Шаг 6 — редизайн экрана «День» (вариант G «Фокус», выбран 04.09)
- [x] 10 направлений на канве (design/build-directions.mjs), выбран G
- [x] Импорт задач из JSON в настройках
- [x] Поле `icon` у задач: тип, миграция (накатана), IconPicker в шторке, подбор иконки по названию
- [x] Экран «День»: HeroCard (сейчас / далее / всё сделано), компактный список с иконками, «без времени», часовая сетка и drag удалены
- [x] Мобильная адаптация: прокрутка страницы, max-w 480 на десктопе, тач-цели ≥44; токен --on-color для текста на цветных карточках
- [~] ПРОВЕРКА: Playwright iPhone (11 e2e зелёные, скриншот совпал с макетом); деплой b024ef9; Максим на телефоне ещё не смотрел

## Состояние на 04.09.2026, 17:35

Вход переведён на email+пароль (magic link: 2 письма/час и привязка к браузеру). Регистрация закрыта (`disable_signup`). Подтверждено Максимом: синк Mac → iPhone, PWA на экране, тестовое уведомление. Не проверено: реальное напоминание от cron, ics-события, drag на touch, офлайн-правка. Хвост: отозвать CLI-токен `dayline-cli`.

## Состояние на 04.09.2026, 17:10

Бэкенд полностью настроен (см. галочку про Supabase в шаге 1). Осталось от Максима: первый вход по magic link на Mac и iPhone, установка PWA, включение уведомлений, ics-ссылка календаря. После первого входа — выключить регистрацию (`disable_signup`) через Management API. Отозвать CLI-токен `dayline-cli` после настройки.

## Состояние на 04.09.2026, 16:40

Код всех пяти шагов написан и закоммичен (`main`, 5 коммитов). Локально: tsc чистый, 146 vitest + 8 Deno + 8 Playwright зелёные, `npm run build` проходит. Сайт https://wizrdr.github.io/dayline/ живой (репозиторий публичный).

Осталось, всё требует Максима:
1. Проект Supabase по `docs/supabase-setup.md`: ключи в `.env` и `gh variable set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY`, `npx supabase link`, `db push`, `functions deploy ics`, `functions deploy remind --no-verify-jwt`.
2. Push по `docs/push-setup.md`: VAPID-ключи, secrets, строки `private.remind_config`.
3. Решающие проверки: синк Mac ↔ iPhone, ics-события рабочего календаря на сегодня, push на закрытый iPhone, drag на touch.
4. Мелочи: показывать ошибки лент из `useCalendarStatus()` в настройках; завести ритм дня как серии.

## Прошлое состояние (пауза 14:10)

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
