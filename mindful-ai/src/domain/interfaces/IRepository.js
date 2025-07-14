export class IRepository {
  async create(data) { throw new Error('Not implemented') }
  async findById(id) { throw new Error('Not implemented') }
  async update(id, data) { throw new Error('Not implemented') }
  async delete(id) { throw new Error('Not implemented') }
  async findByUser(userId) {
  return await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' }
  })
}

}