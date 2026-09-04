# Настройка Supabase (делается один раз, руками)

## Проект и ключи
1. https://supabase.com/dashboard → **New project**. Organization — любая, Name `dayline`, Region **Frankfurt (eu-central-1)**, пароль БД сохрани в менеджер паролей.
2. Дождись создания. **Project Settings → API**: скопируй **Project URL** и **anon public** key.
3. Локально: `cp .env.example .env`, вставь значения в `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
4. GitHub: репозиторий → **Settings → Secrets and variables → Actions → Variables → New repository variable**. Создай две переменные с теми же именами и значениями (это Variables, не Secrets — anon key публичный).

## Auth
5. **Authentication → URL Configuration**:
   - Site URL: `https://wizrdr.github.io/dayline/`
   - Redirect URLs → Add: `https://wizrdr.github.io/dayline/**` и `http://localhost:5173/**`
6. **Authentication → Providers → Email**: оставь включённым. «Confirm email» можно выключить — для magic link оно не нужно.
7. После первого успешного входа вернись в **Authentication → Providers → Email** (или **Sign In / Up**) и выключи **Allow new users to sign up**. Приложение однопользовательское; чужой email не должен создать аккаунт.

## Миграции
8. `npx supabase login` — откроется браузер, подтверди. Если браузер недоступен: https://supabase.com/dashboard/account/tokens → **Generate new token**, затем `npx supabase login --token <token>`.
9. `npx supabase link --project-ref <ref>` — `<ref>` это часть Project URL перед `.supabase.co` (например `abcdefghijklmnop`). Спросит пароль БД из шага 1.
10. `npx supabase db push` — применит `supabase/migrations/*.sql`. Проверь в **Table Editor**, что появились `tasks`, `task_overrides`, `ics_feeds`, `push_subscriptions`.
11. **Database → Publications → supabase_realtime**: убедись, что `tasks`, `task_overrides`, `ics_feeds` включены (миграция делает это сама; если нет — включи тумблеры).

## Проверка
12. `npm run dev` → http://localhost:5173 → введи email → открой ссылку из письма **в том же браузере**. Должен открыться экран «День».
13. Создай задачу и проверь в **Table Editor → tasks**, что строка появилась с твоим `user_id`.
