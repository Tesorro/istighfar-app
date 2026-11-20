# Istighfar

Семейное веб-приложение для совместной практики произнесения «Астагфируллах». Два человека, одна семейная группа и одна цель — 1 000 000 повторений. Приложение складывает результаты и показывает только общий прогресс. Индивидуальные числа супругов друг другу не раскрываются.

Цель в миллион — личная договорённость участников, а не религиозная норма и не обещание награды.

## Что умеет приложение

- Регистрация, вход, выход и обновление сессии.
- Создание семьи первым участником и присоединение второго по одноразовому приглашению.
- Один отчёт на человека за календарный день в часовом поясе семьи. Свой отчёт можно исправить в тот же день.
- Общий накопительный результат, сумма за сегодня, остаток до цели и история по дням.
- Установка на домашний экран: манифест, иконки и service worker только для статических файлов.

## Стек

- Монорепозиторий на Bun Workspaces.
- Frontend: React 19, TypeScript, Vite, React Router, Tailwind CSS, shadcn-совместимые компоненты, TanStack Query, React Hook Form, Zod, Recharts, vite-plugin-pwa.
- Backend: NestJS, Prisma 7, PostgreSQL 16, JWT access token и ротируемый refresh token в HttpOnly cookie, bcryptjs.
- Локальная база: Docker Compose.

## Структура

```text
apps/web     React-приложение
apps/api     NestJS API и Prisma
docker/      init-скрипт тестовой базы
```

Подробности решений — в [ARCHITECTURE.md](ARCHITECTURE.md).

## Требования

- [Bun](https://bun.sh) 1.4 или новее.
- [Docker](https://www.docker.com/) с Docker Compose.
- Node.js 22, если API запускается через `node dist/main.js`.

## Установка

```powershell
bun install
Copy-Item .env.example .env
Copy-Item .env.example apps/api/.env
```

В обоих файлах замените `JWT_ACCESS_SECRET` на случайную строку длиной не меньше 32 символов. Файлы `.env` не попадают в Git.

## PostgreSQL

```powershell
bun run db:up
```

Compose поднимает `postgres:16-alpine` на порту 5432. Пользователь, пароль и база — `istighfar`. При первом создании тома скрипт `docker/postgres/init.sql` создаёт базу `istighfar_test` для интеграционных тестов.

Остановка:

```powershell
bun run db:down
```

## Миграции Prisma

Сгенерировать клиент:

```powershell
bun run db:generate
```

Применить существующие миграции:

```powershell
bun run db:deploy
```

Создать новую миграцию в разработке:

```powershell
bun run db:migrate
```

CLI Prisma зафиксирован на 7-й линии. Команда `npx prisma` без версии может поставить экспериментальный Prisma 8, у которого другой набор команд. Используйте скрипты из `package.json`.

## Запуск

Два терминала:

```powershell
bun run dev:api
bun run dev:web
```

- API: http://localhost:3000
- Интерфейс: http://localhost:5173
- Проверка API: http://localhost:3000/health

Vite читает `VITE_API_URL` из корневого `.env`. Хост в этом адресе должен совпадать с хостом страницы: `localhost` с `localhost`, `127.0.0.1` с `127.0.0.1`. Иначе браузер считает запрос межсайтовым и не отправляет refresh cookie. Если `http://localhost:3000` открывает другое приложение, откройте и страницу, и API через `http://127.0.0.1`.

## Тесты

Все тесты:

```powershell
bun run test
```

Только API:

```powershell
bun run --filter @istighfar/api test
```

Только интерфейс:

```powershell
bun run --filter @istighfar/web test
```

Интеграционные тесты API сами применяют миграции к `istighfar_test` и очищают свои данные. База должна быть запущена. Для них используется `BCRYPT_ROUNDS=4`.

## Сборка

```powershell
bun run --filter @istighfar/api build
bun run --filter @istighfar/web build
```

Готовый API запускается из `apps/api`:

```powershell
node dist/main.js
```

Статика frontend оказывается в `apps/web/dist`.

## Production

### Frontend на Vercel

1. Импортируйте репозиторий.
2. Root Directory: `apps/web`.
3. Framework: Vite. Install command: `bun install` из корня репозитория, если Vercel ставит зависимости только внутри `apps/web`, укажите install command `cd ../.. && bun install`.
4. Build command: `bun run build`.
5. Output: `dist`.
6. Переменная `VITE_API_URL` — публичный адрес API, например `https://api.example.com`.

`apps/web/vercel.json` отдаёт `index.html` для маршрутов SPA. Статические файлы Vercel отдаёт напрямую.

### Backend и PostgreSQL на VPS

1. Установите Docker и поднимите PostgreSQL. Не используйте пароль из `.env.example`.
2. Скопируйте `.env.example` в `apps/api/.env` и задайте production-значения:

```text
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/istighfar?schema=public
JWT_ACCESS_SECRET=<случайная строка от 32 символов>
JWT_ACCESS_TTL=15m
REFRESH_TTL_DAYS=30
BCRYPT_ROUNDS=12
CORS_ORIGINS=https://your-app.vercel.app
COOKIE_SECURE=true
COOKIE_SAMESITE=none
INVITE_TTL_HOURS=168
```

`SameSite=none` и `COOKIE_SECURE=true` нужны, когда сайт и API на разных доменах: иначе браузер не отправит refresh cookie. Если они на одном сайте, оставьте `lax`.

3. Установите зависимости, примените миграции и соберите API:

```powershell
bun install
bun run db:deploy
bun run --filter @istighfar/api build
```

4. Запускайте `node dist/main.js` из `apps/api` через systemd или другой процесс-менеджер. Перед процессом поставьте HTTPS-прокси и включите доверие к нему: приложение выставляет `trust proxy` в production.
5. В production запросы refresh и logout без заголовка `Origin` отклоняются.

Образ API описан в `Dockerfile`. Сборка:

```powershell
docker build -t istighfar-api .
```

Перед запуском контейнера передайте те же переменные, что и в `apps/api/.env`. `DATABASE_URL` внутри контейнера должен указывать на доступный PostgreSQL, а не на `localhost` самого контейнера.

## Ограничения

- В семье не больше двух участников.
- Отчёт можно создать и изменить только за сегодняшний день в часовом поясе семьи. Прошлые дни в интерфейсе не редактируются.
- Общая цель зафиксирована: 1 000 000. Часовой пояс задаётся при создании семьи.
- Максимум одного отчёта — 100 000. Это защита от случайного ввода, а не норма практики.
- Service worker кэширует оболочку приложения. Ответы API с личными данными в кэш не пишутся, офлайн-синхронизация отчётов не обещается.
- Общая сумма и собственное число математически позволяют вычислить результат второго участника. Отдельных персональных отчётов и разбивок в API нет.
