# SignalBot — Моніторинг заторів

Додаток для моніторингу дорожніх заторів на основі повідомлень з Telegram-каналів. Користувачі створюють маршрути з вулицями/об'єктами, система аналізує повідомлення з Telegram і нотифікує про проблеми на маршруті.

## Стек

- **Backend**: NestJS, TypeScript, Prisma, PostgreSQL
- **Frontend**: React, TypeScript, TanStack Query, Tailwind CSS
- **Telegram**: gramjs (MTProto client API)
- **Real-time**: Socket.IO, Web Push, Speech Synthesis API

## Структура

```
SignalBot/
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React frontend
├── prisma/           # Prisma schema
└── turbo.json        # Turborepo config
```

## Швидкий старт

### 1. Встановлення залежностей

```bash
npm install
```

### 2. Налаштування

Скопіюйте `.env.example` → `.env` і заповніть:

```bash
cp .env.example .env
```

**Обов'язкові змінні:**

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — секрет для JWT токенів
- `TELEGRAM_API_ID` / `TELEGRAM_API_HASH` — отримати на [my.telegram.org](https://my.telegram.org)
- `TELEGRAM_SESSION` — session string (генерується при першому підключенні)

**Опціональні (для Push):**

```bash
npx web-push generate-vapid-keys
```

### 3. Налаштування Telegram сесії

При першому запуску потрібно авторизуватися через MTProto:

```bash
cd apps/api
npx ts-node src/telegram/generate-session.ts
```

Це згенерує `TELEGRAM_SESSION` string. Збережіть його в `.env`.

### 4. База даних

```bash
cd prisma
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Запуск

```bash
# Обидва сервери
npm run dev

# Або окремо
npm run dev:api   # :3000
npm run dev:web   # :5173
```

## Архітектура

### Data Flow

```
Telegram Channels → gramjs listener → AnalysisService (parse & classify)
                                            ↓
                                      MatchingService (match vs user routes)
                                            ↓
                                      NotificationsService
                                       ↙    ↓     ↘
                                  WebSocket  Push   DB
                                      ↓
                                  React UI → Toast + TTS (optional)
```

### Модулі бекенду

- **TelegramModule** — підключення до каналів через gramjs MTProto
- **AnalysisModule** — парсинг повідомлень, витяг локацій, класифікація типу проблеми
- **MatchingModule** — in-memory індекс маршрутів, мачинг повідомлень
- **RoutesModule** — CRUD маршрутів користувача
- **NotificationsModule** — WebSocket gateway, Web Push, CRUD нотифікацій
- **AuthModule** — JWT авторизація

### Типи проблем (IssueType)

| Тип | Ключові слова |
|-----|---------------|
| TRAFFIC_JAM | затор, пробка, стоїть, не їде, тягнучка |
| ACCIDENT | дтп, аварія, зіткнення |
| ROAD_WORK | ремонт, розкопали, перекрили |
| POLICE_CHECKPOINT | поліція, патруль, блокпост |
| ROAD_CLOSURE | перекрито, закрито, об'їзд |

## API Endpoints

### Auth
- `POST /api/auth/register` — реєстрація
- `POST /api/auth/login` — вхід
- `GET /api/auth/me` — поточний юзер

### Routes
- `GET /api/routes` — список маршрутів
- `POST /api/routes` — створити маршрут
- `GET /api/routes/:id` — деталі маршруту
- `PATCH /api/routes/:id` — оновити
- `DELETE /api/routes/:id` — видалити

### Notifications
- `GET /api/notifications` — список (пагінація)
- `GET /api/notifications/unread-count` — кількість непрочитаних
- `PATCH /api/notifications/:id/read` — позначити прочитаним
- `PATCH /api/notifications/read-all` — позначити всі прочитаними
- `POST /api/notifications/subscribe` — підписка на Push

### Channels
- `GET /api/channels` — список каналів
- `POST /api/channels` — додати канал
- `PATCH /api/channels/:id` — вкл/викл
- `DELETE /api/channels/:id` — видалити

### Telegram
- `GET /api/telegram/status` — статус підключення

### WebSocket Events
- `notification` — нова нотифікація (server → client)
