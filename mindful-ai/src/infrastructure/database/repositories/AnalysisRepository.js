import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class AnalysisRepository extends IRepository {
  async create(analysisData) {
    return await prisma.analysis.create({
      data: analysisData,
      include: {
        session: true
      }
    })
  }

  async findById(id) {
    return await prisma.analysis.findUnique({
      where: { id },
      include: {
        session: true
      }
    })
  }

  async findBySessionId(sessionId) {
    return await prisma.analysis.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: true
      }
    })
  }

  async findLatestBySessionId(sessionId) {
    return await prisma.analysis.findFirst({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      include: {
        session: true
      }
    })
  }

  async update(id, data) {
    return await prisma.analysis.update({
      where: { id },
      data,
      include: {
        session: true
      }
    })
  }

  async delete(id) {
    return await prisma.analysis.delete({
      where: { id }
    })
  }

  async findByStrategy(strategy, options = {}) {
    const { limit = 50, offset = 0 } = options

    return await prisma.analysis.findMany({
      where: { strategy },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        session: true
      }
    })
  }

  async getAnalysisStats(sessionId) {
    const [totalCount, strategyStats] = await Promise.all([
      prisma.analysis.count({
        where: { sessionId }
      }),
      prisma.analysis.groupBy({
        by: ['strategy'],
        where: { sessionId },
        _count: {
          strategy: true
        }
      })
    ])

    return {
      totalCount,
      strategyStats: strategyStats.reduce((acc, stat) => {
        acc[stat.strategy] = stat._count.strategy
        return acc
      }, {})
    }
  }
}