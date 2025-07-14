export class GameificationService {
  constructor(userRepository, achievementRepository, eventBus) {
    this.userRepository = userRepository
    this.achievementRepository = achievementRepository
    this.eventBus = eventBus
    
    // Точки за различные действия
    this.POINTS = {
      MESSAGE: 10,          // За отправку сообщения
      ANALYSIS_COMPLETE: 50, // За завершенный анализ
      INSIGHT_SAVED: 25     // За сохранение инсайта
    }
  }

  // === ОСНОВНЫЕ МЕТОДЫ НАЧИСЛЕНИЯ ОЧКОВ ===

  async awardPoints(userId, action, metadata = {}) {
    try {
      console.log(`🎮 [GameificationService] Начисляем очки пользователю ${userId} за действие: ${action}`)
      
      let points = 0
      switch (action) {
        case 'message':
          points = this.POINTS.MESSAGE
          break
        case 'analysis_complete':
          points = this.POINTS.ANALYSIS_COMPLETE
          break
        case 'insight_saved':
          points = this.POINTS.INSIGHT_SAVED
          break
        default:
          console.warn(`🎮 [GameificationService] Неизвестное действие: ${action}`)
          return null
      }

      // Начисляем очки и проверяем повышение уровня
      const result = await this.userRepository.addExperience(userId, points)
      
      // Отправляем событие о получении очков
      this.eventBus.emit('gamification:points_earned', {
        userId,
        action,
        points,
        totalPoints: result.user.totalPoints,
        experience: result.user.experience,
        level: result.user.level,
        leveledUp: result.leveledUp,
        metadata
      })

      // Если повысился уровень, отправляем отдельное событие
      if (result.leveledUp) {
        console.log(`🎉 [GameificationService] Пользователь ${userId} повысился до уровня ${result.newLevel}!`)
        this.eventBus.emit('gamification:level_up', {
          userId,
          previousLevel: result.previousLevel,
          newLevel: result.newLevel,
          totalPoints: result.user.totalPoints
        })
      }

      // Проверяем достижения
      await this.checkAndAwardAchievements(userId)

      return result

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка начисления очков:`, error)
      throw error
    }
  }

  // === УПРАВЛЕНИЕ ДОСТИЖЕНИЯМИ ===

  async checkAndAwardAchievements(userId) {
    try {
      // Получаем статистику пользователя
      const stats = await this.getUserStatsForAchievements(userId)
      
      // Проверяем какие достижения можно разблокировать
      const newAchievements = await this.achievementRepository.checkUserAchievements(userId, stats)
      
      // Награждаем новыми достижениями
      for (const achievement of newAchievements) {
        await this.awardAchievement(userId, achievement.id)
      }

      return newAchievements

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка проверки достижений:`, error)
      return []
    }
  }

  async awardAchievement(userId, achievementId) {
    try {
      const userAchievement = await this.userRepository.awardAchievement(userId, achievementId)
      
      if (userAchievement) {
        console.log(`🏆 [GameificationService] Пользователь ${userId} получил достижение: ${userAchievement.achievement.name}`)
        
        // Отправляем событие о получении достижения
        this.eventBus.emit('gamification:achievement_earned', {
          userId,
          achievement: userAchievement.achievement,
          earnedAt: userAchievement.earnedAt
        })

        return userAchievement
      }

      return null

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка награждения достижением:`, error)
      throw error
    }
  }

  // === ПОЛУЧЕНИЕ СТАТИСТИКИ ===

  async getUserGamificationData(userId) {
    try {
      const [gamificationStats, achievements] = await Promise.all([
        this.userRepository.getGamificationStats(userId),
        this.achievementRepository.getUserProgress(userId)
      ])

      return {
        ...gamificationStats,
        achievements: achievements.unlocked,
        availableAchievements: achievements.locked,
        achievementProgress: {
          unlocked: achievements.totalUnlocked,
          total: achievements.totalAvailable,
          percentage: achievements.completionPercentage
        }
      }

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка получения данных геймификации:`, error)
      throw error
    }
  }

  async getUserStatsForAchievements(userId) {
    try {
      const [userStats, user] = await Promise.all([
        this.userRepository.getUserStats(userId),
        this.userRepository.findById(userId)
      ])

      // Получаем количество анализов
      const analysisCount = await this.getAnalysisCount(userId)

      return {
        ...userStats,
        analysisCount,
        level: user.level,
        experience: user.experience,
        totalPoints: user.totalPoints
      }

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка получения статистики для достижений:`, error)
      return {}
    }
  }

  async getAnalysisCount(userId) {
    try {
      // Подсчитываем количество анализов через сессии пользователя
      const { prisma } = await import('../../infrastructure/database/client.js')
      
      return await prisma.analysis.count({
        where: {
          session: {
            userId: userId
          }
        }
      })
    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка подсчета анализов:`, error)
      return 0
    }
  }

  // === ИНИЦИАЛИЗАЦИЯ ===

  async initializeGameification() {
    try {
      console.log('🎮 [GameificationService] Инициализация системы геймификации...')
      
      // Инициализируем базовые достижения
      await this.achievementRepository.initializeDefaultAchievements()
      
      console.log('🎮 [GameificationService] Система геймификации инициализирована')

    } catch (error) {
      console.error('🎮 [GameificationService] Ошибка инициализации геймификации:', error)
      throw error
    }
  }

  // === МЕТОДЫ-ХЕЛПЕРЫ ===

  async getLeaderboard(limit = 10) {
    try {
      const { prisma } = await import('../../infrastructure/database/client.js')
      
      return await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          level: true,
          totalPoints: true,
          experience: true
        },
        orderBy: [
          { level: 'desc' },
          { totalPoints: 'desc' }
        ],
        take: limit
      })

    } catch (error) {
      console.error(`🎮 [GameificationService] Ошибка получения лидерборда:`, error)
      return []
    }
  }

  calculateLevelProgress(experience) {
    const currentLevel = Math.floor(experience / 1000) + 1
    const currentLevelExp = (currentLevel - 1) * 1000
    const nextLevelExp = currentLevel * 1000
    const progressToNextLevel = experience - currentLevelExp
    const progressPercentage = (progressToNextLevel / 1000) * 100

    return {
      currentLevel,
      progressToNextLevel,
      expNeededForNextLevel: nextLevelExp - experience,
      progressPercentage: Math.min(progressPercentage, 100)
    }
  }
}