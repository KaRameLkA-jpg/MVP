export class PatternFocusedStrategy {
  buildPrompt(messages, assistantPrompt) {
    return `
      Контекст ассистента: ${assistantPrompt}
      
      Диалог: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Сделай краткий анализ диалога с фокусом на:
      1. Повторяющиеся паттерны поведения или мышления
      2. Основные темы и циклы в разговоре
      3. Скрытые убеждения и установки
      
      Формат ответа в JSON:
      {
        "strategy": "pattern-focused",
        "insights": ["ключевой паттерн 1", "важный цикл 2", "скрытая установка 3"],
        "emotions": ["эмоция связанная с паттерном", "чувство повторения", "реакция на цикл"],
        "patterns": ["поведенческий паттерн 1", "мысленный паттерн 2", "рекурсивная тема 3"],
        "recommendations": ["способ изменения паттерна 1", "стратегия осознания 2", "метод трансформации 3"]
      }
    `
  }

  extractInsights(analysis) {
    console.log('🔄 [PatternFocusedStrategy] Извлекаем инсайты:', {
      analysisType: typeof analysis,
      hasStrategy: 'strategy' in analysis,
      hasInsights: 'insights' in analysis
    })

    try {
      // analysis уже объект, не нужно парсить JSON
      const result = {
        strategy: 'pattern-focused',
        insights: analysis.insights || [],
        emotions: analysis.emotions || [],
        patterns: analysis.patterns || analysis.behaviorPatterns || analysis.thoughtPatterns || analysis.recursiveThemes || [],
        recommendations: analysis.recommendations || analysis.underlyingBeliefs || []
      }

      console.log('✅ [PatternFocusedStrategy] Инсайты успешно извлечены:', {
        strategy: result.strategy,
        insights: result.insights.length,
        emotions: result.emotions.length,
        patterns: result.patterns.length,
        recommendations: result.recommendations.length
      })

      return result
    } catch (error) {
      console.warn('⚠️ [PatternFocusedStrategy] Ошибка обработки, возвращаем fallback:', error.message)
      return {
        strategy: 'pattern-focused',
        insights: ['Анализ временно недоступен'],
        emotions: [],
        patterns: [],
        recommendations: []
      }
    }
  }
}