import { ASSISTANTS } from '../../config/assistents.js'

export class AssistantFactory {
  static create(assistantId) {
    const config = ASSISTANTS[assistantId]
    if (!config) throw new Error(`Assistant ${assistantId} not found`)
    return config
  }

  static getAll() {
    return Object.values(ASSISTANTS)
  }

  static getAvailableTypes() {
    return Object.keys(ASSISTANTS)
  }
}