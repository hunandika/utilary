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
 * Validates and sanitizes delay values for setTimeout to prevent code injection
 * @param delay - The delay value to validate
 * @returns A safe delay value between 0 and MAX_DELAY
 */
const validateDelay = (delay: number): number => {
  const MAX_DELAY = 10000; // Maximum allowed delay in milliseconds
  if (typeof delay !== 'number' || isNaN(delay)) {
    return 1000; // Default safe value
  }
  return Math.min(Math.max(0, delay), MAX_DELAY);
};

/**
 * Safe timeout promise that prevents code injection
 * @param delay - The delay in milliseconds
 */
const safeTimeout = (delay: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, validateDelay(delay)));
};

/**
 * Demonstrates automatic lock management with RedLock
 * @param redlock - RedLock instance
 */
async function demonstrateAutoLock(redlock: RedLock): Promise<void> {
  console.log('\n=== Automatic Lock Management ===')

  await redlock.lock('payment-processing', 3000, async () => {
    console.log('🔒 Lock acquired for payment processing')
    console.log('💳 Processing payment transaction...')

    await safeTimeout(1000)

    console.log('✅ Payment processed successfully')
  })
}

/**
 * Demonstrates auto-extending lock functionality with different extension policies
 * @param redlock - RedLock instance
 */
async function demonstrateAutoExtendLock(redlock: RedLock): Promise<void> {
  console.log('\n=== Auto-Extending Lock with Extension Limits ===')

  // Example 1: Limited extensions for critical operations
  console.log('\n📊 Report generation with max 3 extensions:')
  await redlock.autoExtendLock('report-generation', 2000, async () => {
    console.log('🔒 Auto-extending lock acquired (max 3 extensions)')
    console.log('📊 Generating comprehensive analytics report...')

    await safeTimeout(4000) // This might trigger 1-2 extensions

    console.log('✅ Analytics report generated successfully')
  }, { maxExtensions: 3 })

  // Example 2: Payment processing with strict limits
  console.log('\n💳 Payment processing with max 1 extension:')
  await redlock.autoExtendLock('payment-critical', 1500, async () => {
    console.log('🔒 Payment lock acquired (max 1 extension)')
    console.log('💳 Processing critical payment...')

    await safeTimeout(2000) // Will trigger exactly 1 extension

    console.log('✅ Payment processed within extension limit')
  }, { maxExtensions: 1 })

  // Example 3: Background sync with unlimited extensions
  console.log('\n🔄 Background sync with unlimited extensions:')
  await redlock.autoExtendLock('background-sync', 1000, async () => {
    console.log('🔒 Background sync lock acquired (unlimited extensions)')
    console.log('🔄 Syncing large dataset...')

    await safeTimeout(2500) // Will extend as needed

    console.log('✅ Background sync completed')
  }, { maxExtensions: -1 }) // -1 means unlimited

  // Example 4: Custom extension threshold
  console.log('\n⚙️ Custom extension threshold demo:')
  await redlock.autoExtendLock('custom-threshold', 2000, async () => {
    console.log('🔒 Lock with custom 1000ms extension threshold')
    console.log('⚙️ Running operation with early extension trigger...')

    await safeTimeout(1800) // Will extend earlier due to custom threshold

    console.log('✅ Operation completed with custom threshold')
  }, {
    maxExtensions: 2,
    extensionThreshold: 1000 // Extend when 1000ms left instead of default 500ms
  })
}

/**
 * Demonstrates manual lock lifecycle management
 * @param redlock - RedLock instance
 */
async function demonstrateManualLock(redlock: RedLock): Promise<void> {
  console.log('\n=== Manual Lock Lifecycle Management ===')

  const lock = await redlock.acquire('user-data-migration', 5000)

  if (!lock) {
    console.log('❌ Failed to acquire lock - resource may be in use')
    return
  }

  console.log('🔒 Manual lock acquired for user data migration')

  try {
    const extended = await redlock.extend(lock, 3000)
    console.log(`🔄 Lock extension ${extended ? 'successful' : 'failed'}`)

    console.log('🔄 Migrating user data...')
    await safeTimeout(1000)
    console.log('✅ User data migration completed')
  } finally {
    const released = await redlock.release(lock)
    console.log(`🔓 Lock release ${released ? 'successful' : 'failed'}`)
  }
}

/**
 * Demonstrates handling of concurrent operations
 * @param redlock - RedLock instance
 */
async function demonstrateConcurrentOperations(redlock: RedLock): Promise<void> {
  console.log('\n=== Concurrent Operations Handling ===')

  const concurrentOperations = [
    redlock.lock('shared-resource', 2000, async () => {
      console.log('🔒 Operation A acquired lock')
      await safeTimeout(1000)
      console.log('✅ Operation A completed')
      return 'Result A'
    }),

    redlock.lock('shared-resource', 2000, async () => {
      console.log('🔒 Operation B acquired lock')
      await safeTimeout(800)
      console.log('✅ Operation B completed')
      return 'Result B'
    }).catch(error => {
      console.log('⏳ Operation B waiting for lock availability')
      return 'Operation B deferred'
    })
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
}

/**
 * Initializes Redis client with connection configuration
 */
async function initializeRedisClient(): Promise<RedisClientType> {
  const client = createClient({
    url: 'redis://localhost:6379',
  })

  await client.connect()
  console.log('✅ Connected to Redis successfully')

  return client as RedisClientType
}

/**
 * Demonstrates basic RedLock usage patterns with Redis
 */
async function basicExample(): Promise<void> {
  let client: RedisClientType | null = null

  try {
    client = await initializeRedisClient()

    const redlock = new RedLock(client, {
      retryCount: 5,
      retryDelay: 100,
      retryJitter: 50,
      driftFactor: 0.01,
      automaticExtensionThreshold: 100,
      onError: error => {
        console.error('🚨 RedLock operation failed:', error.message)
      },
    })

    // Run all demonstrations sequentially
    await demonstrateAutoLock(redlock)
    await demonstrateAutoExtendLock(redlock)
    await demonstrateManualLock(redlock)
    await demonstrateConcurrentOperations(redlock)

  } catch (error) {
    console.error('💥 Example execution failed:', error)
  } finally {
    if (client) {
      await client.disconnect()
      console.log('\n🔌 Disconnected from Redis')
    }
  }
}

/**
 * Entry point - Execute the basic example with error handling
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
