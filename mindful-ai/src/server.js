import fastify from 'fastify'
import { setupContainer } from './config/app.js'
import { AuthMiddleware } from './infrastructure/auth/AuthMiddleware.js'

// Настройка контейнера DI
const container = setupContainer()

// Создание Fastify приложения
const app = fastify({ 
  logger: process.env.NODE_ENV !== 'production' 
})

// CORS настройки
app.register(import('@fastify/cors'), {
  origin: [
    'http://localhost:5173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
  ]
})

// Добавляем безопасные заголовки для защиты от XSS и других атак
app.addHook('onSend', async (request, reply, payload) => {
  // Content Security Policy - предотвращает XSS атаки
  reply.header('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' http://localhost:3000; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "media-src 'self'; " +
    "frame-src 'none';"
  )
  
  // Дополнительные безопасные заголовки
  reply.header('X-Content-Type-Options', 'nosniff')
  reply.header('X-Frame-Options', 'DENY')
  reply.header('X-XSS-Protection', '1; mode=block')
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin')
  reply.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  
  return payload
})

app.get('/api/chats', { preHandler: AuthMiddleware.optionalAuth }, async (request, reply) => {
  try {
    const chatRepository = container.get('ChatRepository')
    const userId = request.user.id || 'default-user' // fallback для обратной совместимости
    const sessions = await chatRepository.findByUser(userId)
    reply.send(sessions)
  } catch (e) {
    reply.code(500).send({ error: 'Ошибка загрузки чатов' })
  }
})


// Хелс-чек
app.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// API роуты для чатов
app.post('/api/chats', { preHandler: AuthMiddleware.optionalAuth }, async (request, reply) => {
  try {
    const chatRepository = container.get('ChatRepository')
    const { assistantType = 'coach', title = 'Новый чат' } = request.body
    const userId = request.user.id || 'default-user' // fallback для обратной совместимости
    
    const session = await chatRepository.create({
      title,
      assistantType,
      userId
    })
    
    return session
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/chats/:id', async (request, reply) => {
  try {
    const chatRepository = container.get('ChatRepository')
    const session = await chatRepository.findByIdWithMessages(request.params.id)
    
    if (!session) {
      return reply.code(404).send({ error: 'Chat not found' })
    }
    
    return session
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.post('/api/chats/:id/messages', async (request, reply) => {
  try {
    const sendMessageCommand = container.get('SendMessageCommand')
    const { content, role = 'user' } = request.body
    
    if (!content) {
      return reply.code(400).send({ error: 'Content is required' })
    }
    
    const message = await sendMessageCommand.execute({
      sessionId: request.params.id,
      role,
      content
    })
    
    return message
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// API роуты для анализа
app.post('/api/analysis/:sessionId', async (request, reply) => {
  try {
    const analysisService = container.get('AnalysisService')
    const analysis = await analysisService.analyzeSession(request.params.sessionId)
    
    return analysis
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// API роуты для памяти (инсайтов)
// Новый роут для клиента без userId в пути
app.get('/api/memory', { preHandler: AuthMiddleware.optionalAuth }, async (request, reply) => {
  try {
    const memoryRepository = container.get('MemoryRepository')
    const { type, tags, chatId, limit = 50, offset = 0 } = request.query
    const userId = request.user.id || 'default-user' // fallback для обратной совместимости
    
    console.log('🔍 [API] Запрос памяти:', {
      userId,
      chatId,
      type,
      tags,
      limit,
      offset
    })
    
    const options = {
      type,
      tags: tags ? tags.split(',') : undefined,
      chatId,
      limit: Number(limit),
      offset: Number(offset)
    }
    
    const memories = await memoryRepository.findByUserId(userId, options)
    
    return {
      memories,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: memories.length === Number(limit)
      }
    }
  } catch (error) {
    console.error('❌ [API] Ошибка получения памяти:', error)
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/memory/:userId', async (request, reply) => {
  try {
    const memoryRepository = container.get('MemoryRepository')
    const { type, tags, chatId, limit = 50, offset = 0 } = request.query
    
    const options = {
      type,
      tags: tags ? tags.split(',') : undefined,
      chatId, // Добавляем поддержку фильтрации по chatId
      limit: Number(limit),
      offset: Number(offset)
    }
    
    const memories = await memoryRepository.findByUserId(request.params.userId, options)
    
    return {
      memories,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
        hasMore: memories.length === Number(limit)
      }
    }
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.post('/api/memory', async (request, reply) => {
  try {
    const memoryRepository = container.get('MemoryRepository')
    const {
      userId,
      title,
      content,
      type = 'insight',
      tags = [],
      sourceType,
      sourceId,
      importance = 3
    } = request.body
    
    if (!userId || !title || !content) {
      return reply.code(400).send({
        error: 'userId, title и content обязательны'
      })
    }
    
    const memoryData = {
      userId,
      title,
      content,
      type,
      tags,
      sourceType,
      sourceId,
      importance
    }
    
    const memory = await memoryRepository.create(memoryData)
    
    // Начисляем очки за сохранение инсайта (геймификация)
    try {
      const gamificationService = container.get('GameificationService')
      await gamificationService.awardPoints(userId, 'insight_saved', {
        memoryId: memory.id,
        type,
        sourceType,
        sourceId
      })
      
      console.log(`🎮 [API] Начислены очки пользователю ${userId} за сохранение инсайта`)
    } catch (error) {
      console.error('🎮 [API] Ошибка начисления очков за сохранение инсайта:', error)
      // Не блокируем основной процесс из-за ошибки геймификации
    }
    
    return memory
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// Роут поиска с userId в query параметрах (для клиента)
app.get('/api/memory/search', { preHandler: AuthMiddleware.optionalAuth }, async (request, reply) => {
  try {
    const { q: searchQuery, limit = 20, offset = 0 } = request.query
    const userId = request.user.id || 'default-user' // fallback для обратной совместимости
    
    // Валидация параметров
    if (!userId || userId.trim().length === 0) {
      return reply.code(400).send({ error: 'User ID обязателен' })
    }
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return reply.code(400).send({ error: 'Параметр поиска q обязателен' })
    }
    
    // Валидация пагинации
    const limitNum = Number(limit)
    const offsetNum = Number(offset)
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return reply.code(400).send({ error: 'Limit должен быть числом от 1 до 100' })
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return reply.code(400).send({ error: 'Offset должен быть неотрицательным числом' })
    }
    
    const memoryRepository = container.get('MemoryRepository')
    const options = {
      limit: limitNum,
      offset: offsetNum
    }
    
    const memories = await memoryRepository.searchByContent(
      userId.trim(),
      searchQuery.trim(),
      options
    )
    
    return {
      memories,
      query: searchQuery.trim(),
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: memories.length === limitNum
      }
    }
  } catch (error) {
    console.error('Ошибка поиска воспоминаний:', error)
    reply.code(500).send({ error: 'Ошибка поиска воспоминаний' })
  }
})

app.get('/api/memory/search/:userId', async (request, reply) => {
  try {
    const { userId } = request.params
    const { q: searchQuery, limit = 20, offset = 0 } = request.query
    
    // Валидация параметров
    if (!userId || userId.trim().length === 0) {
      return reply.code(400).send({ error: 'User ID обязателен' })
    }
    
    if (!searchQuery || searchQuery.trim().length === 0) {
      return reply.code(400).send({ error: 'Параметр поиска q обязателен' })
    }
    
    // Валидация пагинации
    const limitNum = Number(limit)
    const offsetNum = Number(offset)
    
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return reply.code(400).send({ error: 'Limit должен быть числом от 1 до 100' })
    }
    
    if (isNaN(offsetNum) || offsetNum < 0) {
      return reply.code(400).send({ error: 'Offset должен быть неотрицательным числом' })
    }
    
    const memoryRepository = container.get('MemoryRepository')
    const options = {
      limit: limitNum,
      offset: offsetNum
    }
    
    const memories = await memoryRepository.searchByContent(
      userId.trim(),
      searchQuery.trim(),
      options
    )
    
    return {
      memories,
      query: searchQuery.trim(),
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        hasMore: memories.length === limitNum
      }
    }
  } catch (error) {
    console.error('Ошибка поиска воспоминаний:', error)
    reply.code(500).send({ error: 'Ошибка поиска воспоминаний' })
  }
})

app.get('/api/memory/stats/:userId', async (request, reply) => {
  try {
    const memoryRepository = container.get('MemoryRepository')
    const stats = await memoryRepository.getMemoryStats(request.params.userId)
    
    return stats
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// SSE роут для real-time уведомлений
app.get('/api/analysis/stream/:sessionId', async (request, reply) => {
  try {
    const sessionId = request.params.sessionId
    
    // Настройка SSE заголовков
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    })

    // Отправка начального события
    reply.raw.write(`data: ${JSON.stringify({
      type: 'connected',
      sessionId,
      timestamp: new Date().toISOString()
    })}\n\n`)

    // Получаем EventBus для подписки на события
    const eventBus = container.get('EventBus')
    
    // Функция для отправки события клиенту
    const sendEvent = (eventData) => {
      if (reply.raw.destroyed) return
      
      try {
        reply.raw.write(`data: ${JSON.stringify({
          ...eventData,
          timestamp: new Date().toISOString()
        })}\n\n`)
      } catch (error) {
        console.error('Ошибка отправки SSE события:', error)
      }
    }

    // Подписка на события анализа для данной сессии
    const analysisCompletedHandler = (data) => {
      if (data.sessionId === sessionId) {
        sendEvent({
          type: 'analysis:completed',
          sessionId,
          analysisId: data.analysisId
        })
      }
    }

    const analysisFailedHandler = (data) => {
      if (data.sessionId === sessionId) {
        sendEvent({
          type: 'analysis:failed',
          sessionId,
          error: data.error?.message || 'Ошибка анализа'
        })
      }
    }

    // Регистрируем обработчики
    eventBus.on('analysis:completed', analysisCompletedHandler)
    eventBus.on('analysis:failed', analysisFailedHandler)

    // Ping для поддержания соединения
    const pingInterval = setInterval(() => {
      if (reply.raw.destroyed) {
        clearInterval(pingInterval)
        return
      }
      
      try {
        reply.raw.write(`data: ${JSON.stringify({
          type: 'ping',
          timestamp: new Date().toISOString()
        })}\n\n`)
      } catch (error) {
        clearInterval(pingInterval)
      }
    }, 30000) // Каждые 30 секунд

    // Обработка закрытия соединения
    request.raw.on('close', () => {
      clearInterval(pingInterval)
      eventBus.off('analysis:completed', analysisCompletedHandler)
      eventBus.off('analysis:failed', analysisFailedHandler)
      
      if (!reply.raw.destroyed) {
        reply.raw.end()
      }
    })

    request.raw.on('aborted', () => {
      clearInterval(pingInterval)
      eventBus.off('analysis:completed', analysisCompletedHandler)
      eventBus.off('analysis:failed', analysisFailedHandler)
    })

  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// API роуты для ассистентов
app.get('/api/assistants', async (request, reply) => {
  try {
    const { AssistantFactory } = await import('./domain/services/AssistantFactory.js')
    const assistants = AssistantFactory.getAll()
    
    return assistants.map(assistant => ({
      id: assistant.id,
      name: assistant.name,
      description: assistant.description,
      type: assistant.type
    }))
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// API роуты для геймификации
app.get('/api/user/stats', { preHandler: AuthMiddleware.optionalAuth }, async (request, reply) => {
  try {
    const userId = request.user.id || 'default-user' // fallback для обратной совместимости
    const userRepository = container.get('UserRepository')
    const gamificationService = container.get('GameificationService')
    
    const [basicStats, gamificationData] = await Promise.all([
      userRepository.getUserStats(userId),
      gamificationService.getUserGamificationData(userId)
    ])
    
    return {
      ...basicStats,
      ...gamificationData
    }
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/gamification/stats/:userId', async (request, reply) => {
  try {
    const gamificationService = container.get('GameificationService')
    const data = await gamificationService.getUserGamificationData(request.params.userId)
    
    return data
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/achievements', async (request, reply) => {
  try {
    const achievementRepository = container.get('AchievementRepository')
    const achievements = await achievementRepository.findAll()
    
    return achievements
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/achievements/:userId', async (request, reply) => {
  try {
    const achievementRepository = container.get('AchievementRepository')
    const progress = await achievementRepository.getUserProgress(request.params.userId)
    
    return progress
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

app.get('/api/leaderboard', async (request, reply) => {
  try {
    const { limit = 10 } = request.query
    const gamificationService = container.get('GameificationService')
    const leaderboard = await gamificationService.getLeaderboard(Number(limit))
    
    return leaderboard
  } catch (error) {
    reply.code(500).send({ error: error.message })
  }
})

// Запуск сервера
const start = async () => {
  try {
    const port = process.env.PORT || 3000
    const host = process.env.HOST || '0.0.0.0'
    
    app.get('/', async (request, reply) => {
        return { message: 'Mindful AI backend работает!' }
    })

    // Инициализация системы геймификации
    try {
      const gamificationService = container.get('GameificationService')
      await gamificationService.initializeGameification()
    } catch (error) {
      console.error('⚠️ Ошибка инициализации геймификации:', error.message)
    }

    await app.listen({ port: Number(port), host })
    console.log(`🚀 Mindful AI Server running at http://localhost:${port}`)
    console.log(`📊 Health check: http://localhost:${port}/health`)
    console.log(`🤖 Assistants: http://localhost:${port}/api/assistants`)
    console.log(`🎮 Gamification: initialized`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()