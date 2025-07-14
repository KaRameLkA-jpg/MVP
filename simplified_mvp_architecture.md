# 🏗️ УПРОЩЕННАЯ MVP АРХИТЕКТУРА

## 🎯 ПРИНЦИПЫ ДИЗАЙНА

**KISS (Keep It Simple, Stupid)**
- Минимальный технологический стек
- Простая, но расширяемая структура
- Один файл конфигурации для всего

**SOLID Принципы**
- Single Responsibility: каждый модуль решает одну задачу
- Open/Closed: легко добавлять новых ассистентов без изменения кода
- Dependency Inversion: зависимости через интерфейсы

**Clean Architecture**
- Четкое разделение слоев
- Бизнес-логика не зависит от фреймворков
- Легкое тестирование каждого слоя

---

## 🔧 МИНИМАЛЬНЫЙ ТЕХНОЛОГИЧЕСКИЙ СТЕК

```javascript
// Упрощенный стек - только необходимое
{
  "backend": {
    "runtime": "Node.js 18+",
    "framework": "Fastify", // Быстрее Express, встроенная валидация
    "database": "SQLite", // Нулевая настройка, позже легко мигрировать
    "orm": "Prisma", // Type-safe, простые миграции
    "validation": "Zod", // Runtime + compile-time валидация
    "testing": "Vitest" // Быстрее Jest
  },
  "frontend": {
    "framework": "Vite + React 18",
    "state": "Zustand", // Проще Redux, меньше boilerplate
    "ui": "TailwindCSS + HeadlessUI",
    "icons": "Lucide React"
  },
  "integrations": {
    "ai": "Claude API",
    "realtime": "Server-Sent Events" // Проще WebSockets для MVP
  }
}
```

---

## 📁 СТРУКТУРА ПРОЕКТА (Clean Architecture)

```
mindful-ai/
├── src/
│   ├── domain/              # Бизнес-логика (ядро)
│   │   ├── entities/        # Основные сущности
│   │   │   ├── User.js
│   │   │   ├── ChatSession.js
│   │   │   ├── Message.js
│   │   │   ├── Analysis.js
│   │   │   └── MemoryEntry.js
│   │   ├── services/        # Бизнес-сервисы
│   │   │   ├── ChatService.js
│   │   │   ├── AnalysisService.js
│   │   │   └── MemoryService.js
│   │   └── interfaces/      # Интерфейсы для внешних зависимостей
│   │       ├── IRepository.js
│   │       ├── IAnalysisProvider.js
│   │       └── IEventEmitter.js
│   ├── infrastructure/      # Внешние зависимости
│   │   ├── database/
│   │   │   ├── repositories/
│   │   │   │   ├── UserRepository.js
│   │   │   │   ├── ChatRepository.js
│   │   │   │   └── MemoryRepository.js
│   │   │   └── prisma/
│   │   │       └── schema.prisma
│   │   ├── external/
│   │   │   └── ClaudeProvider.js
│   │   └── events/
│   │       └── EventBus.js
│   ├── application/         # Use cases / Команды
│   │   ├── commands/
│   │   │   ├── CreateChatCommand.js
│   │   │   ├── SendMessageCommand.js
│   │   │   ├── TriggerAnalysisCommand.js
│   │   │   └── SaveMemoryCommand.js
│   │   └── queries/
│   │       ├── GetChatHistoryQuery.js
│   │       └── SearchMemoriesQuery.js
│   ├── presentation/        # API и контроллеры
│   │   ├── controllers/
│   │   │   ├── ChatController.js
│   │   │   ├── AnalysisController.js
│   │   │   └── MemoryController.js
│   │   ├── middleware/
│   │   │   ├── auth.js
│   │   │   └── validation.js
│   │   └── routes/
│   │       └── api.js
│   └── config/              # Конфигурация
│       ├── assistants.js    # Конфигурация ассистентов
│       ├── database.js
│       └── app.js
├── client/                  # React фронтенд
│   ├── src/
│   │   ├── components/
│   │   │   ├── chat/
│   │   │   ├── analysis/
│   │   │   └── memory/
│   │   ├── stores/          # Zustand стейт
│   │   ├── hooks/           # Custom hooks
│   │   └── utils/
│   └── package.json
├── prisma/
│   └── schema.prisma        # Единая схема БД
├── tests/
├── package.json
└── README.md
```

---

## 🗄️ УПРОЩЕННАЯ СХЕМА БД (Prisma)

```prisma
// prisma/schema.prisma - Вся схема в одном файле
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"  // Для MVP, легко мигрировать на PostgreSQL
  url      = env("DATABASE_URL")
}

model User {
  id            String        @id @default(cuid())
  email         String        @unique
  createdAt     DateTime      @default(now())
  chatSessions  ChatSession[]
  memoryEntries MemoryEntry[]
  settings      Json?         // Гибкие настройки пользователя
}

model ChatSession {
  id          String     @id @default(cuid())
  userId      String
  assistantId String     // Ссылка на конфиг ассистента
  title       String?    
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
  user        User       @relation(fields: [userId], references: [id])
  messages    Message[]
  analyses    Analysis[]
}

model Message {
  id        String      @id @default(cuid())
  sessionId String
  role      String      // 'user' | 'assistant'
  content   String
  timestamp DateTime    @default(now())
  order     Int         // Порядок сообщений
  session   ChatSession @relation(fields: [sessionId], references: [id])
}

model Analysis {
  id          String        @id @default(cuid())
  sessionId   String
  content     String        // JSON с анализом от Claude
  insights    Json          // Структурированные инсайты
  status      String        // 'pending' | 'completed' | 'failed'
  createdAt   DateTime      @default(now())
  session     ChatSession   @relation(fields: [sessionId], references: [id])
  memoryEntry MemoryEntry?  // Связь с сохраненной памятью
}

model MemoryEntry {
  id         String    @id @default(cuid())
  userId     String
  title      String
  content    String
  tags       String[]  // Массив тегов
  analysisId String?   @unique
  createdAt  DateTime  @default(now())
  user       User      @relation(fields: [userId], references: [id])
  analysis   Analysis? @relation(fields: [analysisId], references: [id])
}
```

---

## 🏛️ КЛЮЧЕВЫЕ ПАТТЕРНЫ И РЕАЛИЗАЦИЯ

### 1. Repository Pattern (Абстракция данных)

```javascript
// src/domain/interfaces/IRepository.js
export class IRepository {
  async create(data) { throw new Error('Not implemented') }
  async findById(id) { throw new Error('Not implemented') }
  async update(id, data) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
}

// src/infrastructure/database/repositories/ChatRepository.js
import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class ChatRepository extends IRepository {
  async create(sessionData) {
    return await prisma.chatSession.create({
      data: sessionData,
      include: { messages: true }
    })
  }

  async findByIdWithMessages(id) {
    return await prisma.chatSession.findUnique({
      where: { id },
      include: { 
        messages: { orderBy: { order: 'asc' } },
        analyses: true 
      }
    })
  }

  async getMessageCount(sessionId) {
    return await prisma.message.count({
      where: { sessionId }
    })
  }
}
```

### 2. Factory Pattern (Создание ассистентов)

```javascript
// src/config/assistants.js - Простая конфигурация
export const ASSISTANTS = {
  coach: {
    id: 'coach',
    name: 'Life Coach',
    personality: 'supportive',
    prompt: `Ты опытный лайф-коуч. Задавай уточняющие вопросы, 
             помогай структурировать мысли, фокусируйся на действиях.`,
    analysisStyle: 'action-oriented'
  },
  therapist: {
    id: 'therapist', 
    name: 'Wise Therapist',
    personality: 'empathetic',
    prompt: `Ты мудрый терапевт. Слушай внимательно, отражай эмоции,
             помогай понять глубинные паттерны.`,
    analysisStyle: 'pattern-focused'
  },
  mentor: {
    id: 'mentor',
    name: 'Experienced Mentor', 
    personality: 'wise',
    prompt: `Ты опытный ментор. Делись мудростью, предлагай перспективы,
             помогай увидеть большую картину.`,
    analysisStyle: 'insight-driven'
  },
  friend: {
    id: 'friend',
    name: 'Supportive Friend',
    personality: 'casual',
    prompt: `Ты поддерживающий друг. Будь естественным, искренним,
             создавай безопасное пространство для размышлений.`,
    analysisStyle: 'emotion-focused'
  }
}

// src/domain/services/AssistantFactory.js
export class AssistantFactory {
  static create(assistantId) {
    const config = ASSISTANTS[assistantId]
    if (!config) throw new Error(`Assistant ${assistantId} not found`)
    return config
  }

  static getAll() {
    return Object.values(ASSISTANTS)
  }
}
```

### 3. Command Pattern (Use Cases)

```javascript
// src/application/commands/SendMessageCommand.js
export class SendMessageCommand {
  constructor(chatRepository, analysisService, eventBus) {
    this.chatRepository = chatRepository
    this.analysisService = analysisService
    this.eventBus = eventBus
  }

  async execute({ sessionId, role, content }) {
    // 1. Сохранить сообщение
    const messageCount = await this.chatRepository.getMessageCount(sessionId)
    const message = await this.chatRepository.addMessage({
      sessionId,
      role,
      content,
      order: messageCount + 1
    })

    // 2. Проверить триггер анализа
    if (messageCount + 1 >= 5 && messageCount % 5 === 4) {
      this.eventBus.emit('analysis:trigger', { sessionId })
    }

    return message
  }
}
```

### 4. Observer Pattern (События)

```javascript
// src/infrastructure/events/EventBus.js
import { EventEmitter } from 'events'

export class EventBus extends EventEmitter {
  constructor() {
    super()
    this.setupListeners()
  }

  setupListeners() {
    this.on('analysis:trigger', this.handleAnalysisTrigger.bind(this))
    this.on('analysis:completed', this.handleAnalysisCompleted.bind(this))
  }

  async handleAnalysisTrigger({ sessionId }) {
    // Запустить анализ асинхронно
    try {
      const analysisService = container.get('AnalysisService')
      await analysisService.analyzeSession(sessionId)
    } catch (error) {
      this.emit('analysis:failed', { sessionId, error })
    }
  }

  async handleAnalysisCompleted({ sessionId, analysisId }) {
    // Уведомить фронтенд через SSE
    const sseService = container.get('SSEService')
    sseService.send(sessionId, {
      type: 'analysis:ready',
      analysisId
    })
  }
}
```

### 5. Strategy Pattern (Типы анализа)

```javascript
// src/domain/services/AnalysisService.js
export class AnalysisService {
  constructor(claudeProvider, strategies) {
    this.claudeProvider = claudeProvider
    this.strategies = strategies
  }

  async analyzeSession(sessionId) {
    const session = await this.chatRepository.findByIdWithMessages(sessionId)
    const assistant = AssistantFactory.create(session.assistantId)
    
    // Выбрать стратегию анализа по типу ассистента
    const strategy = this.strategies[assistant.analysisStyle]
    const prompt = strategy.buildPrompt(session.messages, assistant.prompt)
    
    const analysis = await this.claudeProvider.analyze(prompt)
    const insights = strategy.extractInsights(analysis)
    
    return await this.saveAnalysis(sessionId, analysis, insights)
  }
}

// src/domain/services/analysis-strategies/ActionOrientedStrategy.js
export class ActionOrientedStrategy {
  buildPrompt(messages, assistantPrompt) {
    return `
      Контекст ассистента: ${assistantPrompt}
      
      Диалог: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Сделай краткий анализ диалога с фокусом на:
      1. Ключевые вызовы пользователя
      2. Конкретные действия для решения
      3. Следующие шаги
      
      Формат ответа в JSON:
      {
        "summary": "краткая суть диалога",
        "keyInsights": ["инсайт1", "инсайт2"],
        "actionItems": ["действие1", "действие2"],
        "nextSteps": ["шаг1", "шаг2"]
      }
    `
  }

  extractInsights(analysis) {
    try {
      return JSON.parse(analysis)
    } catch {
      return { summary: analysis, keyInsights: [], actionItems: [], nextSteps: [] }
    }
  }
}
```

---

## 🚀 API ENDPOINTS (Минималистичные)

```javascript
// src/presentation/routes/api.js
export const routes = [
  // Чаты
  'POST   /api/chats',                    // Создать новый чат
  'GET    /api/chats/:id',                // Получить чат с сообщениями
  'POST   /api/chats/:id/messages',       // Отправить сообщение
  'GET    /api/chats/:id/stream',         // SSE для уведомлений

  // Анализ
  'POST   /api/analysis/:sessionId',      // Запустить анализ
  'GET    /api/analysis/:id',             // Получить результат анализа
  
  // Память
  'POST   /api/memory',                   // Сохранить в память
  'GET    /api/memory',                   // Получить память пользователя
  'GET    /api/memory/search',            // Поиск по памяти

  // Мета
  'GET    /api/assistants',               // Список доступных ассистентов
  'GET    /api/user/stats'                // Статистика пользователя
]
```

---

## 📦 DEPENDENCY INJECTION (Простой контейнер)

```javascript
// src/config/container.js
class Container {
  constructor() {
    this.services = new Map()
  }

  register(name, factory) {
    this.services.set(name, factory)
  }

  get(name) {
    const factory = this.services.get(name)
    if (!factory) throw new Error(`Service ${name} not found`)
    return factory()
  }
}

// src/config/app.js - Настройка зависимостей
export function setupContainer() {
  const container = new Container()

  // Repositories
  container.register('ChatRepository', () => new ChatRepository())
  container.register('MemoryRepository', () => new MemoryRepository())

  // Services  
  container.register('EventBus', () => new EventBus())
  container.register('ClaudeProvider', () => new ClaudeProvider(process.env.CLAUDE_API_KEY))
  
  container.register('AnalysisService', () => new AnalysisService(
    container.get('ClaudeProvider'),
    {
      'action-oriented': new ActionOrientedStrategy(),
      'pattern-focused': new PatternFocusedStrategy(),
      'insight-driven': new InsightDrivenStrategy(),
      'emotion-focused': new EmotionFocusedStrategy()
    }
  ))

  // Commands
  container.register('SendMessageCommand', () => new SendMessageCommand(
    container.get('ChatRepository'),
    container.get('AnalysisService'), 
    container.get('EventBus')
  ))

  return container
}
```

---

## 🎯 ПЛАН РЕАЛИЗАЦИИ (5 БЫСТРЫХ ИТЕРАЦИЙ)

### Итерация 1: Фундамент (1 сессия)
```bash
# Настройка проекта
npm create vite@latest mindful-ai --template react
npm install fastify prisma @prisma/client zod
npx prisma init --datasource-provider sqlite
npx prisma db push
```

### Итерация 2: Базовый чат (1 сессия)
- Простейший чат интерфейс
- Сохранение сообщений в БД
- Выбор типа ассистента

### Итерация 3: Claude интеграция (1 сессия)  
- Подключение Claude API
- Триггер анализа после 5 сообщений
- Базовый анализ одним промптом

### Итерация 4: Инсайт-система (1 сессия)
- Отображение результатов анализа
- Кнопка "Сохранить в память"
- Простая карта памяти

### Итерация 5: Полировка (1 сессия)
- SSE для real-time уведомлений
- Базовая геймификация
- Финальное тестирование

---

## ✅ КРИТЕРИИ ГОТОВНОСТИ MVP

**Функциональные:**
- ✅ 4 типа ассистентов работают
- ✅ Анализ после 5 сообщений
- ✅ Сохранение инсайтов в память
- ✅ Просмотр истории чатов
- ✅ Поиск по памяти

**Технические:**
- ✅ Clean Architecture соблюдена
- ✅ Код покрыт базовыми тестами
- ✅ API документирован
- ✅ База данных правильно спроектирована
- ✅ Производительность приемлема

**UX:**
- ✅ Интуитивный интерфейс
- ✅ Быстрая обратная связь
- ✅ Элементы геймификации работают

---

## 🎯 КЛЮЧЕВЫЕ ПРЕИМУЩЕСТВА АРХИТЕКТУРЫ

1. **Простота развертывания** - SQLite, один процесс
2. **Clean Architecture** - легко тестировать и расширять  
3. **Type Safety** - Prisma + Zod для валидации
4. **Модульность** - легко добавлять новых ассистентов
5. **Производительность** - минимальные зависимости
6. **Масштабируемость** - простая миграция на PostgreSQL + микросервисы

**Эта архитектура дает максимальную функциональность при минимальной сложности! 🚀**