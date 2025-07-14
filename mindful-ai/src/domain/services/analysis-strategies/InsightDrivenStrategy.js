export class InsightDrivenStrategy {
  buildPrompt(messages, assistantPrompt) {
    return `
      Контекст ассистента: ${assistantPrompt}
      
      Диалог: ${messages.map(m => `${m.role}: ${m.content}`).join('\n')}
      
      Сделай краткий анализ диалога с фокусом на:
      1. Глубокие инсайты и прозрения
      2. Возможности для роста и развития
      3. Долгосрочную перспективу и жизненные уроки
      
      Формат ответа в JSON:
      {
        "strategy": "insight-driven",
        "insights": ["глубокий инсайт 1", "ключевое прозрение 2", "важное понимание 3"],
        "emotions": ["чувство поиска смысла", "желание роста", "стремление к пониманию"],
        "patterns": ["паттерн самопознания", "цикл обучения", "привычка рефлексии"],
        "recommendations": ["возможность роста 1", "жизненный урок 2", "долгосрочная перспектива 3"]
      }
    `
  }

  extractInsights(analysis) {
    console.log('🔍 [InsightDrivenStrategy] Извлекаем инсайты:', {
      analysisType: typeof analysis,
      hasStrategy: 'strategy' in analysis,
      hasInsights: 'insights' in analysis
    })

    try {
      // analysis уже объект, не нужно парсить JSON
      const result = {
        strategy: 'insight-driven',
        insights: analysis.insights || analysis.deepInsights || [],
        emotions: analysis.emotions || [],
        patterns: analysis.patterns || [],
        recommendations: analysis.recommendations || analysis.growthOpportunities || analysis.lifeWisdom || analysis.longTermPerspective || []
      }

      console.log('✅ [InsightDrivenStrategy] Инсайты успешно извлечены:', {
        strategy: result.strategy,
        insights: result.insights.length,
        emotions: result.emotions.length,
        patterns: result.patterns.length,
        recommendations: result.recommendations.length
      })

      return result
    } catch (error) {
      console.warn('⚠️ [InsightDrivenStrategy] Ошибка обработки, возвращаем fallback:', error.message)
      return {
        strategy: 'insight-driven',
        insights: ['Анализ временно недоступен'],
        emotions: [],
        patterns: [],
        recommendations: []
      }
    }
  }
}