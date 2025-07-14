import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class MemoryRepository extends IRepository {
  async create(memoryData) {
    return await prisma.memoryEntry.create({
      data: memoryData,
      include: {
        user: true
      }
    })
  }

  async findById(id) {
    return await prisma.memoryEntry.findUnique({
      where: { id },
      include: {
        user: true
      }
    })
  }

  async findByUserId(userId, options = {}) {
    const {
      type,
      tags,
      chatId,
      isArchived = false,
      limit = 50,
      offset = 0,
      orderBy = 'createdAt',
      order = 'desc'
    } = options

    const where = {
      userId,
      isArchived,
      ...(type && { type }),
      ...(tags && tags.length > 0 && {
        tags: {
          array_contains: tags
        }
      }),
      ...(chatId && {
        sourceId: chatId,
        sourceType: 'chat'
      })
    }

    return await prisma.memoryEntry.findMany({
      where,
      orderBy: { [orderBy]: order },
      take: limit,
      skip: offset,
      include: {
        user: true
      }
    })
  }

  async searchByContent(userId, searchQuery, options = {}) {
    const {
      limit = 20,
      offset = 0
    } = options

    // Валидация входных параметров для предотвращения инъекций
    if (typeof userId !== 'string' || !userId.trim()) {
      throw new Error('Invalid userId parameter')
    }
    
    if (typeof searchQuery !== 'string' || !searchQuery.trim()) {
      throw new Error('Invalid searchQuery parameter')
    }
    
    if (typeof limit !== 'number' || limit < 1 || limit > 100) {
      throw new Error('Invalid limit parameter')
    }
    
    if (typeof offset !== 'number' || offset < 0) {
      throw new Error('Invalid offset parameter')
    }

    try {
      // Безопасный поиск с использованием Prisma ORM без raw SQL
      const searchLower = searchQuery.toLowerCase().trim();
      
      // Используем contains для безопасного поиска (Prisma автоматически экранирует)
      const memories = await prisma.memoryEntry.findMany({
        where: {
          userId: userId.trim(),
          isArchived: false,
          OR: [
            {
              title: {
                contains: searchLower,
                mode: 'insensitive'
              }
            },
            {
              content: {
                contains: searchLower,
                mode: 'insensitive'
              }
            }
          ]
        },
        orderBy: [
          { importance: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit,
        skip: offset,
        include: {
          user: true
        }
      });
      
      return memories;
      
    } catch (error) {
      console.error('Error in searchByContent:', error.message);
      
      // Безопасный fallback без raw SQL
      try {
        const allMemories = await prisma.memoryEntry.findMany({
          where: {
            userId: userId.trim(),
            isArchived: false
          },
          orderBy: [
            { importance: 'desc' },
            { createdAt: 'desc' }
          ],
          include: {
            user: true
          }
        });
        
        // Безопасная фильтрация в JavaScript
        const searchLower = searchQuery.toLowerCase().trim();
        const filtered = allMemories.filter(memory =>
          memory.title && memory.title.toLowerCase().includes(searchLower) ||
          memory.content && memory.content.toLowerCase().includes(searchLower)
        );
        
        // Применяем пагинацию
        return filtered.slice(offset, Math.min(offset + limit, filtered.length));
      } catch (fallbackError) {
        console.error('Fallback search also failed:', fallbackError.message);
        return [];
      }
    }
  }

  async findByTags(userId, tags, options = {}) {
    const {
      limit = 20,
      offset = 0
    } = options

    return await prisma.memoryEntry.findMany({
      where: {
        userId,
        isArchived: false,
        tags: {
          array_contains: tags
        }
      },
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset
    })
  }

  async update(id, data) {
    return await prisma.memoryEntry.update({
      where: { id },
      data,
      include: {
        user: true
      }
    })
  }

  async delete(id) {
    return await prisma.memoryEntry.delete({
      where: { id }
    })
  }

  async archive(id) {
    return await this.update(id, { isArchived: true })
  }

  async unarchive(id) {
    return await this.update(id, { isArchived: false })
  }

  async getMemoryStats(userId) {
    const [totalCount, archivedCount, typeStats] = await Promise.all([
      prisma.memoryEntry.count({
        where: { userId }
      }),
      prisma.memoryEntry.count({
        where: { userId, isArchived: true }
      }),
      prisma.memoryEntry.groupBy({
        by: ['type'],
        where: { userId, isArchived: false },
        _count: {
          type: true
        }
      })
    ])

    return {
      totalCount,
      activeCount: totalCount - archivedCount,
      archivedCount,
      typeStats: typeStats.reduce((acc, stat) => {
        acc[stat.type] = stat._count.type
        return acc
      }, {})
    }
  }

  // Методы для работы с анализами как источником инсайтов
  async createFromAnalysis(userId, analysis, selectedInsights = []) {
    const memoryEntries = []
    
    // Создаем записи памяти из инсайтов анализа
    if (selectedInsights.length > 0) {
      for (const insight of selectedInsights) {
        const memoryData = {
          userId,
          title: insight.title || `Инсайт из анализа ${analysis.strategy}`,
          content: insight.content || insight.description || insight,
          type: 'insight',
          tags: insight.tags || [analysis.strategy, 'auto-generated'],
          sourceType: 'analysis',
          sourceId: analysis.id,
          importance: insight.importance || 3
        }
        
        const memoryEntry = await this.create(memoryData)
        memoryEntries.push(memoryEntry)
      }
    }
    
    return memoryEntries
  }

  async findBySourceId(sourceId, sourceType = null) {
    const where = {
      sourceId,
      ...(sourceType && { sourceType })
    }

    return await prisma.memoryEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: true
      }
    })
  }

  async findByAnalysisId(analysisId) {
    return await this.findBySourceId(analysisId, 'analysis')
  }

  async findBySessionId(sessionId) {
    return await this.findBySourceId(sessionId, 'chat')
  }

  async createInsightFromAnalysis(userId, analysisId, insightData) {
    const memoryData = {
      userId,
      title: insightData.title,
      content: insightData.content,
      type: insightData.type || 'insight',
      tags: insightData.tags || [],
      sourceType: 'analysis',
      sourceId: analysisId,
      importance: insightData.importance || 3
    }

    return await this.create(memoryData)
  }

  async bulkCreateFromAnalysis(userId, analysisId, insights) {
    const memoryEntries = []
    
    for (const insight of insights) {
      try {
        const memoryEntry = await this.createInsightFromAnalysis(userId, analysisId, insight)
        memoryEntries.push(memoryEntry)
      } catch (error) {
        console.error('Ошибка создания инсайта:', error)
      }
    }
    
    return memoryEntries
  }

  async bulkCreateFromChat(userId, sessionId, insights) {
    const memoryEntries = []
    
    for (const insight of insights) {
      try {
        const memoryData = {
          userId,
          title: insight.title,
          content: insight.content,
          type: insight.type || 'insight',
          tags: insight.tags || [],
          sourceType: 'chat',
          sourceId: sessionId,
          importance: insight.importance || 3
        }
        
        const memoryEntry = await this.create(memoryData)
        memoryEntries.push(memoryEntry)
      } catch (error) {
        console.error('Ошибка создания инсайта из чата:', error)
      }
    }
    
    return memoryEntries
  }

  async getInsightsByType(userId, type, options = {}) {
    const { limit = 20, offset = 0 } = options

    return await prisma.memoryEntry.findMany({
      where: {
        userId,
        type,
        isArchived: false
      },
      orderBy: [
        { importance: 'desc' },
        { createdAt: 'desc' }
      ],
      take: limit,
      skip: offset,
      include: {
        user: true
      }
    })
  }
}