import { Container } from './container.js'
import { ChatRepository } from '../infrastructure/database/repositories/ChatRepository.js'
import { UserRepository } from '../infrastructure/database/repositories/UserRepository.js'
import { MemoryRepository } from '../infrastructure/database/repositories/MemoryRepository.js'
import { AnalysisRepository } from '../infrastructure/database/repositories/AnalysisRepository.js'
import { AchievementRepository } from '../infrastructure/database/repositories/AchievementRepository.js'
import { EventBus } from '../infrastructure/events/EventBus.js'
import { ClaudeProvider } from '../infrastructure/external/ClaudeProvider.js'
import { AnalysisService } from '../domain/services/AnalysisService.js'
import { GameificationService } from '../domain/services/GameificationService.js'
import { ActionOrientedStrategy } from '../domain/services/analysis-strategies/ActionOrientedStrategy.js'
import { PatternFocusedStrategy } from '../domain/services/analysis-strategies/PatternFocusedStrategy.js'
import { InsightDrivenStrategy } from '../domain/services/analysis-strategies/InsightDrivenStrategy.js'
import { EmotionFocusedStrategy } from '../domain/services/analysis-strategies/EmotionFocusedStrategy.js'
import { SendMessageCommand } from '../application/commands/SendMessageCommand.js'

export function setupContainer() {
  const container = new Container()

  // Repositories
  container.register('ChatRepository', () => new ChatRepository())
  container.register('UserRepository', () => new UserRepository())
  container.register('MemoryRepository', () => new MemoryRepository())
  container.register('AnalysisRepository', () => new AnalysisRepository())
  container.register('AchievementRepository', () => new AchievementRepository())

  // External Services
  container.register('ClaudeProvider', () => new ClaudeProvider())
  
  // Infrastructure Services
  container.register('EventBus', () => new EventBus(container))
  
  // Analysis Strategies
  const strategies = {
    'action-oriented': new ActionOrientedStrategy(),
    'pattern-focused': new PatternFocusedStrategy(),
    'insight-driven': new InsightDrivenStrategy(),
    'emotion-focused': new EmotionFocusedStrategy()
  }
  
  // Domain Services
  container.register('AnalysisService', () => new AnalysisService(
    container.get('ClaudeProvider'),
    container.get('ChatRepository'),
    container.get('AnalysisRepository'),
    strategies,
    container.get('GameificationService')
  ))

  container.register('GameificationService', () => new GameificationService(
    container.get('UserRepository'),
    container.get('AchievementRepository'),
    container.get('EventBus')
  ))

  // Commands
  container.register('SendMessageCommand', () => new SendMessageCommand(
    container.get('ChatRepository'),
    container.get('AnalysisService'),
    container.get('EventBus'),
    container.get('ClaudeProvider'),
    container.get('GameificationService')
  ))

  return container
}