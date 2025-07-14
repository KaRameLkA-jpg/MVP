export class ActionOrientedStrategy {
  buildPrompt(messages, assistantPrompt) {
    return `
      Контекст ассистента: ${assistantPrompt}
      
      Диалог: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Сделай краткий анализ диалога с фокусом на:
      1. Ключевые вызовы и проблемы пользователя
      2. Конкретные действия для решения
      3. Практические рекомендации и следующие шаги
      
      Формат ответа в JSON:
      {
        "strategy": "action-oriented",
        "insights": ["ключевая проблема 1", "вызов 2", "препятствие 3"],
        "emotions": ["беспокойство по поводу действий", "мотивация к изменениям"],
        "patterns": ["откладывание важных решений", "поиск быстрых результатов"],
        "recommendations": ["конкретное действие 1", "следующий шаг 2", "план действий 3"]
      }
    `
  }

  extractInsights(analysis) {
    console.log('🎯 [ActionOrientedStrategy] Извлекаем инсайты:', {
      analysisType: typeof analysis,
      hasStrategy: 'strategy' in analysis,
      hasInsights: 'insights' in analysis
    })

    try {
      // analysis уже объект, не нужно парсить JSON
      const result = {
        strategy: 'action-oriented',
        insights: analysis.insights || analysis.keyInsights || [],
        emotions: analysis.emotions || [],
        patterns: analysis.patterns || [],
        recommendations: analysis.recommendations || analysis.actionItems || analysis.nextSteps || []
      }

      console.log('✅ [ActionOrientedStrategy] Инсайты успешно извлечены:', {
        strategy: result.strategy,
        insights: result.insights.length,
        emotions: result.emotions.length,
        patterns: result.patterns.length,
        recommendations: result.recommendations.length
      })

      return result
    } catch (error) {
      console.warn('⚠️ [ActionOrientedStrategy] Ошибка обработки, возвращаем fallback:', error.message)
      return {
        strategy: 'action-oriented',
        insights: ['Анализ временно недоступен'],
        emotions: [],
        patterns: [],
        recommendations: []
      }
    }
  }
}