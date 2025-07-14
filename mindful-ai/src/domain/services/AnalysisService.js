import { AssistantFactory } from './AssistantFactory.js'

export class AnalysisService {
  constructor(claudeProvider, chatRepository, analysisRepository, strategies, gamificationService) {
    this.claudeProvider = claudeProvider
    this.chatRepository = chatRepository
    this.analysisRepository = analysisRepository
    this.strategies = strategies
    this.gamificationService = gamificationService
  }

  async analyzeSession(sessionId) {
    console.log('🔍 [AnalysisService] Начинаем анализ сессии:', sessionId)
    
    const session = await this.chatRepository.findByIdWithMessages(sessionId)
    console.log('📄 [AnalysisService] Сессия загружена:', {
      id: session.id,
      assistantType: session.assistantType,
      messagesCount: session.messages?.length || 0
    })
    
    const assistant = AssistantFactory.create(session.assistantType)
    console.log('🤖 [AnalysisService] Ассистент создан:', {
      id: assistant.id,
      analysisStyle: assistant.analysisStyle
    })
    
    // Выбрать стратегию анализа по типу ассистента
    const strategy = this.strategies[assistant.analysisStyle]
    console.log('🎯 [AnalysisService] Стратегия выбрана:', {
      analysisStyle: assistant.analysisStyle,
      strategyFound: !!strategy,
      availableStrategies: Object.keys(this.strategies)
    })
    
    if (!strategy) {
      throw new Error(`Стратегия анализа не найдена для типа: ${assistant.analysisStyle}`)
    }
    
    const prompt = strategy.buildPrompt(session.messages, assistant.prompt)
    console.log('📝 [AnalysisService] Промпт создан:', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + '...'
    })
    
    const analysis = await this.claudeProvider.analyzeDialogue(prompt, session.messages, {
      assistantType: session.assistantType
    })
    console.log('🧠 [AnalysisService] Анализ Claude получен:', {
      hasContent: !!analysis,
      insights: analysis.insights?.length || 0,
      emotions: analysis.emotions?.length || 0,
      patterns: analysis.patterns?.length || 0,
      recommendations: analysis.recommendations?.length || 0
    })
    
    const insights = strategy.extractInsights(analysis)
    console.log('💡 [AnalysisService] Инсайты извлечены:', {
      insightsType: typeof insights,
      insightsKeys: Object.keys(insights),
      hasStrategy: 'strategy' in insights
    })
    
    return await this.saveAnalysis(sessionId, analysis, insights)
  }

  async saveAnalysis(sessionId, rawAnalysis, processedInsights) {
    const analysisData = {
      sessionId,
      strategy: processedInsights.strategy || 'unknown',
      insights: processedInsights.insights || rawAnalysis.insights || [],
      emotions: rawAnalysis.emotions || [],
      patterns: rawAnalysis.patterns || [],
      recommendations: rawAnalysis.recommendations || [],
      metadata: rawAnalysis.metadata || {},
    }
    
    // Сохраняем анализ в БД через repository
    const savedAnalysis = await this.analysisRepository.create(analysisData)
    
    // Начисляем очки за завершенный анализ (геймификация)
    if (this.gamificationService) {
      try {
        const session = await this.chatRepository.findById(sessionId)
        const userId = session?.userId || 'default-user'
        
        await this.gamificationService.awardPoints(userId, 'analysis_complete', {
          sessionId,
          analysisId: savedAnalysis.id,
          strategy: analysisData.strategy,
          insightsCount: analysisData.insights.length
        })
        
        console.log(`🎮 [AnalysisService] Начислены очки пользователю ${userId} за завершенный анализ`)
      } catch (error) {
        console.error('🎮 [AnalysisService] Ошибка начисления очков за анализ:', error)
        // Не блокируем основной процесс из-за ошибки геймификации
      }
    }
    
    return savedAnalysis
  }
}