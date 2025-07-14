export class SendMessageCommand {
  constructor(chatRepository, analysisService, eventBus, claudeProvider, gamificationService) {
    this.chatRepository = chatRepository
    this.analysisService = analysisService
    this.eventBus = eventBus
    this.claudeProvider = claudeProvider
    this.gamificationService = gamificationService
  }

  async execute({ sessionId, role, content }) {
    // 1. Сохранить пользовательское сообщение
    const messageCount = await this.chatRepository.getMessageCount(sessionId)
    const userMessage = await this.chatRepository.addMessage({
      sessionId,
      role,
      content,
      order: messageCount + 1
    })

    // 2. Генерировать ответ ассистента (только для пользовательских сообщений)
    if (role === 'user') {
      try {
        // Получаем информацию о сессии и истории сообщений
        const session = await this.chatRepository.findByIdWithMessages(sessionId)
        if (!session) {
          throw new Error(`Session ${sessionId} not found`)
        }

        // Получаем историю сообщений для контекста
        const conversationHistory = session.messages || []
        
        // Генерируем ответ ассистента
        const assistantResponse = await this.claudeProvider.generateResponse(
          content,
          conversationHistory,
          session.assistantType
        )

        // Сохраняем ответ ассистента
        const newMessageCount = await this.chatRepository.getMessageCount(sessionId)
        await this.chatRepository.addMessage({
          sessionId,
          role: 'assistant',
          content: assistantResponse,
          order: newMessageCount + 1
        })
      } catch (error) {
        console.error('Failed to generate assistant response:', error)
        // Сохраняем сообщение об ошибке как ответ ассистента
        const newMessageCount = await this.chatRepository.getMessageCount(sessionId)
        await this.chatRepository.addMessage({
          sessionId,
          role: 'assistant',
          content: 'Извините, произошла ошибка при генерации ответа. Попробуйте еще раз.',
          order: newMessageCount + 1
        })
      }
    }

    // 3. Начислить очки за отправку сообщения (геймификация)
    if (role === 'user' && this.gamificationService) {
      try {
        const session = await this.chatRepository.findById(sessionId)
        const userId = session?.userId || 'default-user'
        
        await this.gamificationService.awardPoints(userId, 'message', {
          sessionId,
          messageId: userMessage.id,
          content: content.slice(0, 100) // Первые 100 символов для контекста
        })
      } catch (error) {
        console.error('🎮 [SendMessageCommand] Ошибка начисления очков за сообщение:', error)
        // Не блокируем основной процесс из-за ошибки геймификации
      }
    }

    // 4. Проверить триггер анализа (каждые 5 пользовательских сообщений)
    if (role === 'user') {
      const userMessageCount = await this.chatRepository.getUserMessageCount(sessionId)
      if (userMessageCount >= 5 && userMessageCount % 5 === 0) {
        this.eventBus.emit('analysis:trigger', { sessionId })
      }
    }

    return userMessage
  }
}