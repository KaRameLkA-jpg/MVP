export class ClaudeProvider {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY
    this.model = process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229'
    this.baseUrl = 'https://api.anthropic.com/v1/messages'
    
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required')
    }
  }

  /**
   * Отправляет запрос в Claude API для анализа диалога
   * @param {string} prompt - Промпт для анализа
   * @param {Array} messages - История сообщений для контекста
   * @param {Object} options - Дополнительные опции
   * @returns {Promise<Object>} - Ответ Claude с анализом
   */
  async analyzeDialogue(prompt, messages = [], options = {}) {
    const {
      maxTokens = 1000,
      temperature = 0.7,
      assistantType = 'coach'
    } = options

    console.log('🤖 [ClaudeProvider] Начинаем анализ диалога:', {
      assistantType,
      messagesCount: messages.length,
      promptLength: prompt.length
    })

    try {
      const systemPrompt = this._buildSystemPrompt(assistantType, prompt)
      console.log('📋 [ClaudeProvider] Системный промпт создан:', {
        systemPromptLength: systemPrompt.length,
        systemPromptPreview: systemPrompt.substring(0, 300) + '...'
      })
      
      const conversationContext = this._buildConversationContext(messages)
      console.log('💬 [ClaudeProvider] Контекст диалога:', {
        contextMessages: conversationContext.length
      })

      const requestPayload = {
        model: this.model,
        max_tokens: maxTokens,
        temperature,
        system: systemPrompt,
        messages: conversationContext
      }
      console.log('📤 [ClaudeProvider] Отправляем запрос в Claude:', {
        model: requestPayload.model,
        max_tokens: requestPayload.max_tokens,
        temperature: requestPayload.temperature,
        systemLength: requestPayload.system.length,
        messagesCount: requestPayload.messages.length
      })

      const response = await this._makeRequest(requestPayload)
      console.log('📥 [ClaudeProvider] Ответ от Claude получен:', {
        hasContent: !!response.content,
        contentLength: response.content?.[0]?.text?.length || 0,
        usage: response.usage,
        contentPreview: response.content?.[0]?.text?.substring(0, 200) + '...'
      })

      const parsed = this._parseAnalysisResponse(response)
      console.log('🔍 [ClaudeProvider] Ответ распарсен:', {
        insights: parsed.insights?.length || 0,
        emotions: parsed.emotions?.length || 0,
        patterns: parsed.patterns?.length || 0,
        recommendations: parsed.recommendations?.length || 0,
        hasError: !!parsed.metadata?.error
      })

      return parsed
    } catch (error) {
      console.error('❌ [ClaudeProvider] Ошибка Claude API:', error)
      throw new Error(`Claude analysis failed: ${error.message}`)
    }
  }

  /**
   * Генерирует ответ ассистента на сообщение пользователя
   * @param {string} userMessage - Сообщение пользователя
   * @param {Array} conversationHistory - История диалога
   * @param {string} assistantType - Тип ассистента
   * @returns {Promise<string>} - Ответ ассистента
   */
  async generateResponse(userMessage, conversationHistory = [], assistantType = 'coach') {
    try {
      const systemPrompt = this._buildAssistantSystemPrompt(assistantType)
      const messages = [
        ...this._buildConversationContext(conversationHistory),
        { role: 'user', content: userMessage }
      ]

      const response = await this._makeRequest({
        model: this.model,
        max_tokens: 500,
        temperature: 0.8,
        system: systemPrompt,
        messages
      })

      return response.content[0]?.text || 'Извините, я не смог сгенерировать ответ.'
    } catch (error) {
      console.error('Claude Response Generation Error:', error)
      throw new Error(`Response generation failed: ${error.message}`)
    }
  }

  /**
   * Выполняет HTTP запрос к Claude API с retry логикой
   * @private
   */
  async _makeRequest(payload, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(`Claude API error ${response.status}: ${errorData.error?.message || response.statusText}`)
        }

        return await response.json()
      } catch (error) {
        if (attempt === retries) {
          throw error
        }
        
        // Exponential backoff для retry
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  /**
   * Строит системный промпт для анализа диалога
   * @private
   */
  _buildSystemPrompt(assistantType, analysisPrompt) {
    const assistantPersonas = {
      coach: 'Ты опытный лайф-коуч, фокусируешься на действиях и достижении целей.',
      therapist: 'Ты эмпатичный терапевт, помогаешь понять эмоции и паттерны поведения.',
      mentor: 'Ты мудрый наставник, даешь советы основанные на жизненном опыте.',
      friend: 'Ты поддерживающий друг, создаешь атмосферу доверия и понимания.'
    }

    console.log('🔧 [ClaudeProvider] Используем промпт стратегии как есть:', {
      assistantType,
      analysisPromptLength: analysisPrompt.length,
      analysisPromptPreview: analysisPrompt.substring(0, 200) + '...'
    })

    // Используем промпт стратегии как есть, добавляя только базовую персону
    return `${assistantPersonas[assistantType] || assistantPersonas.coach}

Твоя задача: провести анализ диалога и предоставить структурированные инсайты.

${analysisPrompt}`
  }

  /**
   * Строит системный промпт для генерации ответа ассистента
   * @private
   */
  _buildAssistantSystemPrompt(assistantType) {
    const personas = {
      coach: `Ты опытный лайф-коуч. Твой стиль:
- Фокусируешься на действиях и конкретных шагах
- Задаешь мотивирующие вопросы
- Помогаешь ставить цели и планировать их достижение
- Поддерживаешь активную жизненную позицию`,

      therapist: `Ты эмпатичный терапевт. Твой стиль:
- Проявляешь глубокое понимание и сочувствие
- Помогаешь исследовать эмоции и чувства
- Создаешь безопасное пространство для выражения
- Работаешь с паттернами мышления и поведения`,

      mentor: `Ты мудрый наставник. Твой стиль:
- Делишься жизненным опытом и мудростью
- Предлагаешь долгосрочную перспективу
- Помогаешь увидеть более широкую картину
- Направляешь к собственным открытиям`,

      friend: `Ты поддерживающий друг. Твой стиль:
- Создаешь атмосферу доверия и понимания
- Выражаешь искреннюю заботу и интерес
- Поддерживаешь в трудные моменты
- Радуешься успехам и достижениям`
    }

    return `${personas[assistantType] || personas.coach}

Отвечай тепло, по-человечески, на русском языке. Длина ответа: 2-4 предложения.`
  }

  /**
   * Преобразует историю сообщений в формат Claude API
   * @private
   */
  _buildConversationContext(messages) {
    return messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content
    })).slice(-10) // Берем последние 10 сообщений для контекста
  }

  /**
   * Парсит ответ Claude для анализа диалога
   * @private
   */
  _parseAnalysisResponse(response) {
    try {
      const content = response.content[0]?.text || '{}'
      console.log('🔍 [ClaudeProvider] Парсим ответ Claude:', {
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...'
      })
      
      const analysis = JSON.parse(content)
      
      // Проверяем что ответ не пустой
      const hasContent = analysis && (
        (analysis.insights && analysis.insights.length > 0) ||
        (analysis.emotions && analysis.emotions.length > 0) ||
        (analysis.patterns && analysis.patterns.length > 0) ||
        (analysis.recommendations && analysis.recommendations.length > 0)
      )
      
      if (!hasContent) {
        console.warn('⚠️ [ClaudeProvider] Claude вернул пустой анализ, используем fallback')
        return this._getFallbackAnalysis('empty_response')
      }
      
      const result = {
        strategy: analysis.strategy || 'unknown',
        insights: analysis.insights || [],
        emotions: analysis.emotions || [],
        patterns: analysis.patterns || [],
        recommendations: analysis.recommendations || [],
        metadata: {
          model: this.model,
          timestamp: new Date().toISOString(),
          usage: response.usage,
          strategy: analysis.strategy
        }
      }

      console.log('✅ [ClaudeProvider] Ответ успешно распарсен:', {
        strategy: result.strategy,
        insights: result.insights.length,
        emotions: result.emotions.length,
        patterns: result.patterns.length,
        recommendations: result.recommendations.length
      })

      return result
    } catch (error) {
      console.error('❌ [ClaudeProvider] Ошибка парсинга ответа Claude:', error)
      return this._getFallbackAnalysis('parse_error', error.message)
    }
  }

  /**
   * Возвращает fallback анализ при ошибках
   * @private
   */
  _getFallbackAnalysis(errorType, errorMessage = '') {
    const fallbackInsights = {
      empty_response: [
        'Диалог проанализирован, но детальные инсайты временно недоступны',
        'Продолжайте общение для более глубокого анализа'
      ],
      parse_error: [
        'Произошла техническая ошибка при анализе',
        'Попробуйте продолжить диалог'
      ]
    }

    return {
      strategy: 'fallback',
      insights: fallbackInsights[errorType] || ['Анализ временно недоступен'],
      emotions: ['нейтральное состояние'],
      patterns: ['продолжение диалога'],
      recommendations: ['Продолжите общение для улучшения анализа'],
      metadata: {
        error: errorMessage,
        errorType,
        model: this.model,
        timestamp: new Date().toISOString(),
        isFallback: true
      }
    }
  }
}