import { prisma } from '../client.js'
import { IRepository } from '../../../domain/interfaces/IRepository.js'

export class ChatRepository extends IRepository {
  async create(sessionData) {
    return await prisma.chatSession.create({
      data: sessionData,
      include: { messages: true }
    })
  }

  async findById(id) {
    return await prisma.chatSession.findUnique({
      where: { id }
    })
  }

  async findByIdWithMessages(id) {
    return await prisma.chatSession.findUnique({
      where: { id },
      include: {
        messages: { orderBy: { order: 'asc' } },
        analyses: true
      }
    })
  }

  async addMessage(messageData) {
    return await prisma.message.create({
      data: messageData,
      include: {
        session: true
      }
    })
  }

  async getMessageCount(sessionId) {
    return await prisma.message.count({
      where: { sessionId }
    })
  }

  async getUserMessageCount(sessionId) {
    return await prisma.message.count({
      where: {
        sessionId,
        role: 'user'
      }
    })
  }

  async update(id, data) {
    return await prisma.chatSession.update({
      where: { id },
      data
    })
  }

  async delete(id) {
    return await prisma.chatSession.delete({
      where: { id }
    })
  }
}