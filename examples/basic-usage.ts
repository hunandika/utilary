/**
 * Utilary RedLock - Basic Usage Examples
 *
 * This example demonstrates the core functionality of the RedLock
 * distributed locking implementation, including automatic lock
 * management, manual lock operations, and error handling.
 *
 * @author Hunandika
 */

import { createClient, RedisClientType } from 'redis'
import { RedLock } from '../src/index'

/**
 * Demonstrates basic RedLock usage patterns with Redis.
 *
 * Covers automatic lock management, auto-extending locks,
 * and manual lock lifecycle control.
 */
async function basicExample(): Promise<void> {
  // Initialize Redis client with connection configuration
  const client = createClient({
    url: 'redis://localhost:6379',
  })

  try {
    await client.connect()
    console.log('✅ Connected to Redis successfully')

    // Initialize RedLock with custom configuration
    const redlock = new RedLock(client as RedisClientType, {
      retryCount: 5,
      retryDelay: 100,
      retryJitter: 50,
      driftFactor: 0.01,
      automaticExtensionThreshold: 500,
      onError: error => {
        console.error('🚨 RedLock operation failed:', error.message)
      },
    })

    console.log('\n=== Automatic Lock Management ===')

    // Demonstrate automatic lock acquisition and release
    await redlock.lock('payment-processing', 3000, async () => {
      console.log('🔒 Lock acquired for payment processing')
      console.log('💳 Processing payment transaction...')

      // Simulate payment processing work
      await new Promise(resolve => setTimeout(resolve, 1000))

      console.log('✅ Payment processed successfully')
      // Lock is automatically released after function completion
    })

    console.log('\n=== Auto-Extending Lock for Long Operations ===')

    // Demonstrate intelligent lock extension for long-running tasks
    await redlock.autoExtendLock('report-generation', 2000, async () => {
      console.log('🔒 Auto-extending lock acquired for report generation')
      console.log('📊 Generating comprehensive analytics report...')

      // Simulate long-running report generation (longer than initial TTL)
      // Lock will be automatically extended as needed
      await new Promise(resolve => setTimeout(resolve, 4000))

      console.log('✅ Analytics report generated successfully')
    })

    console.log('\n=== Manual Lock Lifecycle Management ===')

    // Demonstrate manual lock control for complex scenarios
    const lock = await redlock.acquire('user-data-migration', 5000)

    if (lock) {
      console.log('🔒 Manual lock acquired for user data migration')

      try {
        // Extend the lock duration for additional work
        const extended = await redlock.extend(lock, 3000)
        console.log(`🔄 Lock extension ${extended ? 'successful' : 'failed'}`)

        console.log('🔄 Migrating user data...')
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('✅ User data migration completed')
      } finally {
        // Ensure lock is always released
        const released = await redlock.release(lock)
        console.log(`🔓 Lock release ${released ? 'successful' : 'failed'}`)
      }
    } else {
      console.log('❌ Failed to acquire lock - resource may be in use')
    }

    console.log('\n=== Concurrent Operations Handling ===')

    // Demonstrate handling of concurrent lock attempts
    const concurrentOperations = [
      redlock.lock('shared-resource', 2000, async () => {
        console.log('🔒 Operation A acquired lock')
        await new Promise(resolve => setTimeout(resolve, 1000))
        console.log('✅ Operation A completed')
        return 'Result A'
      }),

      redlock
        .lock('shared-resource', 2000, async () => {
          console.log('🔒 Operation B acquired lock')
          await new Promise(resolve => setTimeout(resolve, 800))
          console.log('✅ Operation B completed')
          return 'Result B'
        })
        .catch(error => {
          console.log('⏳ Operation B waiting for lock availability')
          return 'Operation B deferred'
        }),
    ]

    const results = await Promise.allSettled(concurrentOperations)
    results.forEach((result, index) => {
      const operation = String.fromCharCode(65 + index) // A, B, C...
      if (result.status === 'fulfilled') {
        console.log(`✅ Operation ${operation}: ${result.value}`)
      } else {
        console.log(`❌ Operation ${operation} failed: ${result.reason.message}`)
      }
    })
  } catch (error) {
    console.error('💥 Example execution failed:', error)
  } finally {
    // Ensure clean disconnection
    await client.disconnect()
    console.log('\n🔌 Disconnected from Redis')
  }
}

/**
 * Entry point - Execute the basic example with error handling.
 */
async function main(): Promise<void> {
  try {
    await basicExample()
  } catch (error) {
    console.error('❌ Application failed:', error)
    process.exit(1)
  }
}

// Execute the example
main()
