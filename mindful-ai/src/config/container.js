export class Container {
  constructor() {
    this.services = new Map()
  }

  register(name, factory) {
    this.services.set(name, factory)
  }

  get(name) {
    const factory = this.services.get(name)
    if (!factory) throw new Error(`Service ${name} not found`)
    return factory()
  }
}