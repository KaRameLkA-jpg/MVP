import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class AchievementRepository extends IRepository {
  async create(achievementData) {
    return await prisma.achievement.create({
      data: achievementData
    })
  }

  async findById(id) {
    return await prisma.achievement.findUnique({
      where: { id }
    })
  }

  async findByKey(key) {
    return await prisma.achievement.findUnique({
      where: { key }
    })
  }

  async findAll() {
    return await prisma.achievement.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' }
    })
  }

  async findByCategory(category) {
    return await prisma.achievement.findMany({
      where: { 
        category,
        isActive: true 
      },
      orderBy: { createdAt: 'asc' }
    })
  }

  async update(id, data) {
    return await prisma.achievement.update({
      where: { id },
      data
    })
  }

  async delete(id) {
    return await prisma.achievement.delete({
      where: { id }
    })
  }

  // === ACHIEVEMENT MANAGEMENT METHODS ===

  async initializeDefaultAchievements() {
    const defaultAchievements = [
      {
        key: 'first_message',
        name: 'Первые шаги',
        description: 'Отправьте первое сообщение',
        icon: '👋',
        category: 'engagement',
        points: 10
      },
      {
        key: 'first_analysis',
        name: 'Мыслитель',
        description: 'Получите первый анализ',
        icon: '🧠',
        category: 'progress',
        points: 50
      },
      {
        key: 'insight_collector_10',
        name: 'Коллекционер',
        description: 'Сохраните 10 инсайтов в память',
        icon: '📚',
        category: 'milestones',
        points: 100
      },
      {
        key: 'chatty_100',
        name: 'Болтун',
        description: 'Отправьте 100 сообщений',
        icon: '💬',
        category: 'milestones',
        points: 200
      },
      {
        key: 'level_5',
        name: 'Поднебесный',
        description: 'Достигните 5-го уровня',
        icon: '⭐',
        category: 'milestones',
        points: 150
      },
      {
        key: 'week_streak',
        name: 'Постоянство',
        description: 'Пользуйтесь приложением 7 дней подряд',
        icon: '🔥',
        category: 'engagement',
        points: 120
      }
    ]

    for (const achievement of defaultAchievements) {
      try {
        await prisma.achievement.upsert({
          where: { key: achievement.key },
          update: {},
          create: achievement
        })
      } catch (error) {
        console.error(`Ошибка создания достижения ${achievement.key}:`, error)
      }
    }

    console.log('🏆 Базовые достижения инициализированы')
  }

  async checkUserAchievements(userId, stats) {
    const unlockedAchievements = []
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      select: { achievement: { select: { key: true } } }
    })
    
    const unlockedKeys = userAchievements.map(ua => ua.achievement.key)

    // Проверяем условия для каждого достижения
    const achievements = await this.findAll()
    
    for (const achievement of achievements) {
      if (unlockedKeys.includes(achievement.key)) {
        continue // Уже получено
      }

      let shouldUnlock = false

      switch (achievement.key) {
        case 'first_message':
          shouldUnlock = stats.messagesCount >= 1
          break
        case 'first_analysis':
          shouldUnlock = stats.analysisCount >= 1
          break
        case 'insight_collector_10':
          shouldUnlock = stats.memoryCount >= 10
          break
        case 'chatty_100':
          shouldUnlock = stats.messagesCount >= 100
          break
        case 'level_5':
          shouldUnlock = stats.level >= 5
          break
        case 'week_streak':
          // Эта логика потребует отдельной реализации для отслеживания дней активности
          shouldUnlock = false
          break
      }

      if (shouldUnlock) {
        unlockedAchievements.push(achievement)
      }
    }

    return unlockedAchievements
  }

  async getUserProgress(userId) {
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId },
      include: { achievement: true },
      orderBy: { earnedAt: 'desc' }
    })

    const allAchievements = await this.findAll()
    const unlockedIds = userAchievements.map(ua => ua.achievementId)
    
    const lockedAchievements = allAchievements.filter(
      achievement => !unlockedIds.includes(achievement.id)
    )

    return {
      unlocked: userAchievements,
      locked: lockedAchievements,
      totalUnlocked: userAchievements.length,
      totalAvailable: allAchievements.length,
      completionPercentage: (userAchievements.length / allAchievements.length) * 100
    }
  }
}