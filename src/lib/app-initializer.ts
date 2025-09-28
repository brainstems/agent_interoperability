import { getAgentEventSubscriber } from './agent-event-subscriber'
import { getEventBus } from './event-bus'
import { getCRMEventPublisher } from './crm-event-publisher'

export class AppInitializer {
  private static initialized = false

  static async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      console.log('Initializing church management system...')

      // Initialize event bus
      const eventBus = getEventBus()
      console.log('✓ Event bus initialized')

      // Initialize CRM event publisher
      const eventPublisher = getCRMEventPublisher()
      console.log('✓ CRM event publisher initialized')

      // Initialize agent event subscriptions
      const agentSubscriber = getAgentEventSubscriber()
      console.log('✓ Agent event subscriptions initialized')

      // Verify event bus connectivity
      await this.verifyEventBusConnectivity()

      this.initialized = true
      console.log('✅ Church management system initialization complete')

    } catch (error) {
      console.error('❌ Failed to initialize church management system:', error)
      throw error
    }
  }

  private static async verifyEventBusConnectivity(): Promise<void> {
    try {
      const eventBus = getEventBus()
      
      // Publish a test event to verify connectivity
      await eventBus.publish({
        type: 'system.startup',
        source: 'app_initializer',
        data: {
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0'
        },
        metadata: {
          triggeredBy: 'system_startup'
        },
        churchId: 'system',
        userId: 'system'
      })

      console.log('✓ Event bus connectivity verified')
    } catch (error) {
      console.error('❌ Event bus connectivity check failed:', error)
      throw error
    }
  }

  static isInitialized(): boolean {
    return this.initialized
  }
}

// Auto-initialize when module is imported
if (typeof window === 'undefined') {
  // Server-side initialization
  AppInitializer.initialize().catch(console.error)
}
