# Telegram Stats

![Preview](public/preview.png)

## Локальная разработка (без Docker)
```bash
npm install
npm run dev
```
Открой URL из консоли (обычно http://localhost:5173). Перетащи файл `result.json` из экспорта Telegram.

## Экспорт Telegram
Telegram Desktop → Настройки → Дополнительно → Экспорт данных Telegram → Выбери чат → Формат JSON.

## Конфигурация
- Фильтрация ботов: ник оканчивается на `bot`.
- Исключённые отправители: список в `DEFAULT_EXCLUDED_SENDERS`.
- Ссылки на сообщения строятся из slug чата в UI.
