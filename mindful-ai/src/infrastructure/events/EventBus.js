import { EventEmitter } from 'events'

export class EventBus extends EventEmitter {
  constructor(container) {
    super()
    this.container = container
    this.setupListeners()
  }

  setupListeners() {
    this.on('analysis:trigger', this.handleAnalysisTrigger.bind(this))
    this.on('analysis:completed', this.handleAnalysisCompleted.bind(this))
  }

  async handleAnalysisTrigger({ sessionId }) {
    // Запустить анализ асинхронно
    try {
      const analysisService = this.container.get('AnalysisService')
      const analysis = await analysisService.analyzeSession(sessionId)
      
      // Эмитим событие об успешном завершении анализа
      this.emit('analysis:completed', {
        sessionId,
        analysisId: analysis.id,
        analysis
      })
    } catch (error) {
      console.error('Ошибка анализа:', error)
      this.emit('analysis:failed', { sessionId, error })
    }
  }

  async handleAnalysisCompleted({ sessionId, analysisId, analysis }) {
    // Событие уже эмитируется для SSE клиентов
    // Здесь можно добавить дополнительную логику обработки
    console.log(`Анализ ${analysisId} для сессии ${sessionId} завершен`)
    
    // Попробуем создать автоматические инсайты в памяти, если есть данные
    try {
      if (analysis && analysis.insights && Array.isArray(analysis.insights)) {
        const memoryRepository = this.container.get('MemoryRepository')
        const userId = 'default-user' // TODO: получать из сессии
        
        // Создаем инсайты в памяти из анализа
        const insights = analysis.insights.map(insight => ({
          title: typeof insight === 'string' ? `Инсайт: ${insight.substring(0, 50)}...` : insight.title || 'Инсайт из анализа',
          content: typeof insight === 'string' ? insight : insight.content || insight.description,
          type: 'insight',
          tags: [analysis.strategy || 'auto-generated'],
          importance: 3
        }))
        
        if (insights.length > 0) {
          // ИСПРАВЛЕНИЕ: используем sessionId вместо analysisId для привязки к чату
          await memoryRepository.bulkCreateFromChat(userId, sessionId, insights)
          console.log(`Создано ${insights.length} инсайтов в памяти`)
        }
      }
    } catch (error) {
      console.warn('Ошибка создания автоматических инсайтов:', error.message)
    }
  }

  // Метод для запуска анализа извне
  async triggerAnalysis(sessionId) {
    this.emit('analysis:trigger', { sessionId })
  }

  // Метод для эмитирования произвольных событий анализа
  emitAnalysisEvent(eventType, data) {
    this.emit(`analysis:${eventType}`, data)
  }
}