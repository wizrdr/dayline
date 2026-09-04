# Расписание как код

Недельный ритм живёт в одном файле, а не в UI приложения. Агент правит файл, скрипт синхронизирует серии в базу.

## Канонический файл
`~/Documents/Obsidian Vault/personal/career-plan/dayline-schedule.json`

Формат = формат импорта (`src/features/import/schema.ts`) плюс обязательный `key`:

```json
{
  "version": 1,
  "tasks": [
    { "key": "anki", "title": "Anki", "icon": "cards", "color": "blue",
      "start": "13:45", "duration": 10, "repeat": "daily", "from": "2026-09-04", "remind": 5,
      "note": "10 минут карточек сразу после обеда" }
  ]
}
```

Поля: `key` (slug `[a-z0-9-]`, стабильный навсегда), `title`, `start` (`HH:MM`), `duration` (минуты или `"1h 30m"`),
`color` (red/orange/yellow/green/teal/blue/purple/pink), `icon` (из `IconName`), `note`, `remind` (минут до начала),
`repeat` (`"daily"`, `"weekdays"`, `"weekends"` или массив `["пн", "ср"]`), `from`, `until` (ГГГГ-ММ-ДД).

## Как агент обновляет файл из NOW.md
- Только серии (`repeat`). Разовые задачи создаются в приложении, не здесь.
- `key` не переименовывать: скрипт ищет строку в базе по нему. Смена ключа = удаление + новая серия.
- Всегда указывать `from`; иначе новая серия стартует «сегодня», а при обновлении дата не меняется.
- Блок заканчивается → ставить `"until"`, а не удалять запись. Удалённый ключ скрипт мягко удалит из базы (`deleted_at`).
- Блок меняет дни или время с какой-то даты → закрыть старую запись `until` и добавить новую с суффиксом (`logistics-reading-2`).
- Серии, созданные руками в приложении (без `source_key`), скрипт не трогает.

## Команды
```
node scripts/push-schedule.mjs --dry-run   # показать план: create / update / adopt / delete
node scripts/push-schedule.mjs             # применить одной транзакцией
```
Токен: `SUPABASE_ACCESS_TOKEN`, иначе `~/.supabase/access-token`, иначе keychain Supabase CLI (`npx supabase login`).
Другой email владельца: `DAYLINE_EMAIL=...`. Другой файл: первым аргументом.
