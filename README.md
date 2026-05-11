# Barber AI Prototype

Прототип Next.js-приложения для подбора барбер-образа по фотографии клиента.

## Запуск

```bash
npm install
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000).

## Переменные окружения

Скопируйте `.env.example` в `.env.local` и заполните ключи:

- `POLZA_API_KEY` - ключ Polza для vision и Nano Banana.
- `OPENAI_API_KEY` - альтернативное имя ключа, если используется OpenAI-совместимый API.
- `APP_BASE_URL` - публичный URL приложения без слэша в конце. Для локальной разработки с webhook нужен tunnel/ngrok.
- `BARBER_DEBUG_PROMPTS=1` - опционально выводит отладочный промпт Nano Banana в ответе API.

## Скрипты

- `npm run dev` - локальная разработка.
- `npm run build` - production-сборка.
- `npm run lint` - проверка ESLint.
- `npm run verify:polza` - проверка ключа Polza.
- `npm run verify:openai` - проверка OpenAI-совместимого ключа.
