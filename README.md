# 🧠 Mindful AI

**Интеллектуальная платформа для проведения осознанных диалогов с AI-ассистентами**

Mindful AI — это инновационная платформа, ориентированная на личностный рост, саморефлексию и психологическую поддержку через взаимодействие с специализированными AI-ассистентами.

![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18-green.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)

---

## 🎯 Описание проекта

### Основная функциональность

**🤖 Четыре типа AI-ассистентов:**
- **Коуч** - фокус на достижении целей и мотивации
- **Терапевт** - работа с эмоциями и психологическими паттернами  
- **Ментор** - мудрые советы и жизненная перспектива
- **Друг** - поддержка и неформальное общение

**🔍 Автоматический анализ диалогов:**
- Триггер анализа каждые 5 сообщений
- Применение различных стратегий анализа:
  - `action-oriented` - фокус на действиях
  - `pattern-focused` - выявление паттернов
  - `insight-driven` - глубокие инсайты
  - `emotion-focused` - эмоциональный анализ
- Структурированные инсайты от Claude AI

**🧠 Система персональной памяти:**
- Сохранение инсайтов в "карту памяти"
- Поиск и категоризация инсайтов по тегам
- Статистика и аналитика личного развития

**Элементы геймификации:**
- Получение достижений 
- Уровневая структура
- Просмотр доступных достижений

**История чатов:**
- История диалогов с каждым ассистентом 
- Переход к диалогу из истории
- Поиск по истории диалогов

**⚡ Real-time функции:**
- Server-Sent Events для уведомлений об анализе
- Мгновенные ответы ассистентов
- Динамическое обновление интерфейса

---

## 🏗️ Архитектура

Проект построен по принципам **Clean Architecture** с чётким разделением ответственности и инверсией зависимостей.

### Архитектурные слои

**📦 Domain Layer (Доменный слой):**
- `entities/` - Основные сущности системы
- `services/` - Бизнес-логика и доменные сервисы
- `interfaces/` - Абстракции для внешних зависимостей

**⚙️ Application Layer (Слой приложения):**
- `commands/` - Use cases для выполнения действий
- `queries/` - Use cases для получения данных

**🔧 Infrastructure Layer (Инфраструктурный слой):**
- `database/` - Работа с базой данных (Prisma + SQLite)
- `external/` - Внешние API (Claude)
- `events/` - Система событий

**🌐 Presentation Layer (Слой представления):**
- `routes/` - REST API endpoints
- `controllers/` - HTTP контроллеры

### Архитектурные решения
- **🎨 API First Design**
- **📡 Event-Driven Architecture**
- **🔒 Type Safety**

---

## 🛠️ Стек технологий

### Backend Technologies

**🖥️ Runtime & Framework:**
- **Node.js 18+** - JavaScript runtime
- **Fastify 5.4.0** - Быстрый веб-фреймворк
- **ES Modules** - Современная модульная система

**🗄️ Database & ORM:**
- **SQLite** - Встроенная база данных (dev), легко мигрировать на PostgreSQL
- **Prisma 6.11.1** - Type-safe ORM с автогенерацией клиента

**🔍 Validation & Configuration:**
- **Zod 3.22.4** - Runtime валидация схем данных
- **dotenv 16.3.1** - Управление переменными окружения

**🤖 AI Integration:**
- **Claude API (Anthropic)** - Модель claude-3-sonnet-20240229
- **node-fetch 3.3.2** - HTTP клиент для внешних API

### Frontend Technologies

**🌐 Core Technologies:**
- **Vanilla JavaScript (ES6+)** - Нативный JavaScript без фреймворков
- **HTML5** - Семантическая разметка
- **CSS3** - Современные стили с Flexbox/Grid

**📡 Communication:**
- **Server-Sent Events (SSE)** - Real-time коммуникация
- **Fetch API** - HTTP запросы к backend

---

## 🎨 Используемые паттерны

### Архитектурные паттерны
- **🏛️ Clean Architecture** - Чёткое разделение на слои с инверсией зависимостей
- **📊 CQRS** - Разделение команд и запросов

### Поведенческие паттерны
- **🏭 Factory Pattern** - [`AssistantFactory`](src/domain/services/AssistantFactory.js) для создания ассистентов
- **🎯 Strategy Pattern** - Стратегии анализа диалогов в [`analysis-strategies/`](src/domain/services/analysis-strategies/)
- **⚡ Command Pattern** - [`SendMessageCommand`](src/application/commands/SendMessageCommand.js)
- **👁️ Observer Pattern** - [`EventBus`](src/infrastructure/events/EventBus.js) система событий

### Структурные паттерны
- **📚 Repository Pattern** - Абстракция доступа к данным
- **💉 Dependency Injection** - DI контейнер в [`container.js`](src/config/container.js)

### Принципы проектирования
- **✨ SOLID Principles**
- **🎯 DRY (Don't Repeat Yourself)**
- **💎 KISS (Keep It Simple, Stupid)**

---

## 📁 Структура проекта

```
mindful-ai/
├── 📄 .env                          # Переменные окружения
├── 📄 package.json                  # Серверные зависимости
├── 🗄️ prisma/                       # Схема базы данных
│   ├── 📄 schema.prisma            # Prisma схема (5 моделей)
│   └── 📄 dev.db                   # SQLite база данных
├── 🔧 src/                          # Серверный код (Clean Architecture)
│   ├── 🏛️ domain/                   # Доменный слой
│   │   ├── entities/               # Основные сущности
│   │   ├── interfaces/             # Интерфейсы и абстракции
│   │   └── services/               # Бизнес-логика
│   ├── ⚙️ application/              # Слой приложения
│   │   ├── commands/               # Use cases для команд
│   │   └── queries/                # Use cases для запросов
│   ├── 🔧 infrastructure/           # Инфраструктурный слой
│   │   ├── database/               # Работа с БД
│   │   ├── external/               # Внешние API
│   │   └── events/                 # Система событий
│   ├── 🌐 presentation/             # Слой представления
│   │   ├── routes/                 # API роуты
│   │   ├── controllers/            # HTTP контроллеры
│   │   └── middleware/             # Middleware
│   ├── ⚡ config/                   # Конфигурация
│   └── 📄 server.js                # Точка входа сервера
├── 🎨 client/                       # Фронтенд
│   ├── 📄 index.html               # Главная страница
│   ├── 📄 app.js                   # Основная логика SPA
│   ├── 📄 styles.css               # Стили
│   └── 📁 src/                     # Компоненты (структура готова)
└── 🧪 tests/                       # Тесты
```

---

## 🚀 Быстрый старт

### Предварительные требования

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **Claude API Key** от Anthropic

### Установка

1. **Клонирование репозитория:**
```bash
git clone <repository-url>
cd mindful-ai
```

2. **Установка зависимостей:**
```bash
npm install
```

3. **Настройка переменных окружения:**
```bash
cp .env.example .env
```

Заполните `.env` файл:
```env
CLAUDE_API_KEY=your_claude_api_key_here
PORT=3000
DATABASE_URL="file:./dev.db"
```

4. **Настройка базы данных:**
```bash
npm run db:generate
npm run db:push
```

### Запуск в разработке

**Backend сервер:**
```bash
npm run dev
# или
npm start
```
Сервер запустится на `http://localhost:3000`

**Frontend клиент:**
```bash
cd client
python3 -m http.server 8080
```
Клиент будет доступен на `http://localhost:8080`

### Полезные команды

```bash
# Просмотр базы данных
npm run db:studio

# Обновление схемы БД
npm run db:push

# Регенерация Prisma клиента
npm run db:generate

# Запуск тестов
npm test
```

---

## 📚 API документация

### Основные endpoints

#### Chat API
```http
POST /api/chat
Content-Type: application/json

{
  "message": "Привет! Как дела?",
  "assistantType": "coach"
}
```

#### Memory API
```http
GET /api/memory/insights
GET /api/memory/insights/search?query=motivation
```

#### Events (SSE)
```http
GET /api/events
```

### Типы ассистентов
- `coach` - Коуч
- `therapist` - Терапевт  
- `mentor` - Ментор
- `friend` - Друг

### Стратегии анализа
- `action-oriented` - Ориентированная на действия
- `pattern-focused` - Фокус на паттернах
- `insight-driven` - Управляемая инсайтами
- `emotion-focused` - Эмоционально-ориентированная

---

## 🔧 Разработка

### Архитектурные принципы

1. **Clean Architecture** - строгое разделение слоёв
2. **SOLID принципы** - качественный объектно-ориентированный код
3. **DDD подход** - domain-driven design
4. **Type Safety** - использование Zod для валидации

### Добавление нового ассистента

1. Обновите [`assistents.js`](src/config/assistents.js)
2. Добавьте новую стратегию в [`analysis-strategies/`](src/domain/services/analysis-strategies/)
3. Обновите [`AssistantFactory`](src/domain/services/AssistantFactory.js)

### Добавление новой стратегии анализа

Создайте новый файл в [`src/domain/services/analysis-strategies/`](src/domain/services/analysis-strategies/):

```javascript
export class YourStrategy {
  async analyze(messages, assistantType) {
    // Ваша логика анализа
    return {
      insights: [],
      patterns: [],
      recommendations: []
    };
  }
}
```



---
