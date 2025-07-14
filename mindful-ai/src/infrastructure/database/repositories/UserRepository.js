import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class UserRepository extends IRepository {
  async create(userData) {
    return await prisma.user.create({
      data: userData
    })
  }

  async findById(id) {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        chatSessions: {
          orderBy: { createdAt: 'desc' },
          take: 10 // Последние 10 сессий
        },
        memoryEntries: {
          where: { isArchived: false },
          orderBy: { createdAt: 'desc' }
        },
        userAchievements: {
          include: {
            achievement: true
          },
          orderBy: { earnedAt: 'desc' }
        }
      }
    })
  }

  async findByEmail(email) {
    return await prisma.user.findUnique({
      where: { email }
    })
  }

  async update(id, data) {
    return await prisma.user.update({
      where: { id },
      data
    })
  }

  async delete(id) {
    return await prisma.user.delete({
      where: { id }
    })
  }

  async getUserStats(userId) {
    const [sessionsCount, messagesCount, memoryCount] = await Promise.all([
      prisma.chatSession.count({
        where: { userId }
      }),
      prisma.message.count({
        where: { session: { userId } }
      }),
      prisma.memoryEntry.count({
        where: { userId, isArchived: false }
      })
    ])

    return {
      sessionsCount,
      messagesCount,
      memoryCount
    }
  }

  // === GAMIFICATION METHODS ===

  async addExperience(userId, points) {
    const user = await this.findById(userId)
    if (!user) throw new Error('User not found')

    const newExperience = user.experience + points
    const newTotalPoints = user.totalPoints + points
    
    // Рассчитываем новый уровень (каждые 1000 очков = новый уровень)
    const newLevel = Math.floor(newExperience / 1000) + 1
    const leveledUp = newLevel > user.level

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        experience: newExperience,
        totalPoints: newTotalPoints,
        level: newLevel
      },
      include: {
        userAchievements: {
          include: {
            achievement: true
          }
        }
      }
    })

    return {
      user: updatedUser,
      leveledUp,
      pointsEarned: points,
      previousLevel: user.level,
      newLevel
    }
  }

  async getGamificationStats(userId) {
    const user = await this.findById(userId)
    if (!user) throw new Error('User not found')

    const currentLevelExp = (user.level - 1) * 1000
    const nextLevelExp = user.level * 1000
    const progressToNextLevel = user.experience - currentLevelExp
    const expNeededForNextLevel = nextLevelExp - user.experience

    return {
      level: user.level,
      experience: user.experience,
      totalPoints: user.totalPoints,
      progressToNextLevel,
      expNeededForNextLevel,
      progressPercentage: (progressToNextLevel / 1000) * 100,
      achievements: user.userAchievements?.map(ua => ua.achievement) || []
    }
  }

  async awardAchievement(userId, achievementId) {
    try {
      const userAchievement = await prisma.userAchievement.create({
        data: {
          userId,
          achievementId
        },
        include: {
          achievement: true
        }
      })

      // Добавляем очки за достижение
      await this.addExperience(userId, userAchievement.achievement.points)

      return userAchievement
    } catch (error) {
      // Игнорируем ошибку если достижение уже получено
      if (error.code === 'P2002') {
        return null
      }
      throw error
    }
  }

  async getUserAchievements(userId) {
    return await prisma.userAchievement.findMany({
      where: { userId },
      include: {
        achievement: true
      },
      orderBy: { earnedAt: 'desc' }
    })
  }
}