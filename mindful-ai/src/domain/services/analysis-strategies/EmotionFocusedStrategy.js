export class EmotionFocusedStrategy {
  buildPrompt(messages, assistantPrompt) {
    return `
      Контекст ассистента: ${assistantPrompt}
      
      Диалог: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Сделай краткий анализ диалога с фокусом на:
      1. Эмоциональное состояние и динамика чувств
      2. Эмоциональные потребности и триггеры
      3. Способы поддержки и эмоциональной регуляции
      
      Формат ответа в JSON:
      {
        "strategy": "emotion-focused",
        "insights": ["эмоциональный инсайт 1", "понимание состояния 2", "динамика чувств 3"],
        "emotions": ["основная эмоция 1", "сопутствующее чувство 2", "скрытое переживание 3"],
        "patterns": ["эмоциональный триггер 1", "паттерн реагирования 2", "цикл чувств 3"],
        "recommendations": ["стратегия поддержки 1", "способ регуляции 2", "практика роста 3"]
      }
    `
  }

  extractInsights(analysis) {
    console.log('💗 [EmotionFocusedStrategy] Извлекаем инсайты:', {
      analysisType: typeof analysis,
      hasStrategy: 'strategy' in analysis,
      hasInsights: 'insights' in analysis
    })

    try {
      // analysis уже объект, не нужно парсить JSON
      const result = {
        strategy: 'emotion-focused',
        insights: analysis.insights || [],
        emotions: analysis.emotions || analysis.emotionalStates || [],
        patterns: analysis.patterns || analysis.emotionalTriggers || [],
        recommendations: analysis.recommendations || analysis.supportStrategies || analysis.emotionalGrowth || []
      }

      console.log('✅ [EmotionFocusedStrategy] Инсайты успешно извлечены:', {
        strategy: result.strategy,
        insights: result.insights.length,
        emotions: result.emotions.length,
        patterns: result.patterns.length,
        recommendations: result.recommendations.length
      })

      return result
    } catch (error) {
      console.warn('⚠️ [EmotionFocusedStrategy] Ошибка обработки, возвращаем fallback:', error.message)
      return {
        strategy: 'emotion-focused',
        insights: ['Анализ временно недоступен'],
        emotions: [],
        patterns: [],
        recommendations: []
      }
    }
  }
}