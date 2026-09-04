# Push-напоминания: настройка

Схема: клиент подписывается на Web Push и кладёт подписку в `push_subscriptions`. pg_cron раз в минуту дёргает Edge Function `remind`, та считает задачи на «сейчас» в таймзоне подписки и шлёт push. iOS показывает push только установленной PWA (экран «Домой»), в Safari-вкладке не работает.

1. Сгенерировать VAPID-ключи (один раз, сохранить оба):
   ```
   npx web-push generate-vapid-keys
   ```

2. Публичный ключ — в клиент:
   - локально: `VITE_VAPID_PUBLIC_KEY=<public>` в `.env`;
   - в GitHub Pages: `gh variable set VITE_VAPID_PUBLIC_KEY --body "<public>"`.

3. Секреты Edge Function (CRON_SECRET — любая длинная случайная строка, например `openssl rand -hex 32`):
   ```
   npx supabase secrets set \
     VAPID_PUBLIC_KEY=<public> \
     VAPID_PRIVATE_KEY=<private> \
     VAPID_SUBJECT=mailto:you@example.com \
     CRON_SECRET=<secret>
   ```

4. Задеплоить функцию. Без проверки JWT — её вызывает cron с общим секретом, а не пользователь:
   ```
   npx supabase functions deploy remind --no-verify-jwt
   ```

5. Применить миграцию с pg_cron/pg_net и таблицей конфига:
   ```
   npx supabase db push
   ```

6. В SQL Editor вставить две строки (`<ref>` — project ref из Dashboard → Settings → General):
   ```sql
   insert into private.remind_config (key, value) values
     ('remind_url',  'https://<ref>.supabase.co/functions/v1/remind'),
     ('cron_secret', '<тот же CRON_SECRET, что в шаге 3>');
   ```
   Проверка через минуту: `select status, return_message from cron.job_run_details order by start_time desc limit 5;`
   и логи функции в Dashboard → Edge Functions → remind (строка `remind {"sent":…}`).

7. На iPhone: открыть сайт в Safari → Поделиться → «На экран Домой» → открыть с иконки → Настройки → включить «Напоминания» → нажать «Тестовое уведомление». Если тест пришёл, SW-путь работает.

8. Решающая проверка: задача на +3 минуты с напоминанием «в момент начала», приложение закрыть. Push должен прийти на заблокированный экран.

Замена ключей: новые VAPID-ключи делают старые подписки недействительными — после смены выключить и снова включить «Напоминания» на каждом устройстве.
