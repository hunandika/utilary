# Utilary - TypeScript Utility Library

[![CI/CD](https://github.com/hunandika/utilary/actions/workflows/ci.yml/badge.svg)](https://github.com/hunandika/utilary/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/hunandika/utilary/graph/badge.svg?token=wnXFspz8uF)](https://codecov.io/gh/hunandika/utilary)
[![CodeFactor](https://www.codefactor.io/repository/github/hunandika/utilary/badge?s=1a152b71a37c619f0ee1d6ffd0847cf40ac6e37c)](https://www.codefactor.io/repository/github/hunandika/utilary)
[![Known Vulnerabilities](https://snyk.io/test/github/hunandika/utilary/badge.svg)](https://snyk.io/test/github/hunandika/utilary)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

A comprehensive TypeScript utility library featuring Redis distributed locking and more. Designed for scalable applications requiring reliable concurrency control and data management utilities.

## Features

- 🔒 **Distributed Locking**: Redis-based distributed locks with RedLock algorithm
- 🔄 **Auto-Retry & Extension**: Smart retry mechanism and lock extension for long operations
- ⚡ **Timeout Management**: Sophisticated timeout handling with automatic error recovery
- 🛡️ **Error Resilience**: Comprehensive error handling with customizable callbacks
- 🚀 **High Performance**: Optimized for high-concurrency environments
- 📦 **TypeScript First**: Full type safety with zero external dependencies

## Installation

```bash
npm install utilary redis
```

## Quick Start

```typescript
import { createClient } from 'redis'
import { RedLock } from 'utilary'

// Initialize Redis client
const client = createClient({
  url: 'redis://localhost:6379',
})
await client.connect()

// Create RedLock instance with advanced configuration
const redlock = new RedLock(client, {
  retryCount: 5,        // Maximum retry attempts
  retryDelay: 100,      // Base delay between retries (ms)
  retryJitter: 50,      // Random delay variation
  driftFactor: 0.01,    // Clock drift compensation
  automaticExtensionThreshold: 500,  // Auto-extension threshold
  onError: error => {
    console.error('🚨 RedLock operation failed:', error.message)
  },
})
```

📚 **[View Complete Examples →](https://github.com/hunandika/utilary/blob/main/examples/basic-usage.ts)**

## Core Features

### 1. Automatic Lock Management

```typescript
// Simple operations with automatic lock handling
await redlock.lock('payment-processing', 3000, async () => {
  await processPayment()
  // Lock is automatically released after completion
})
```

### 2. Auto-Extending Locks with Smart Limits

```typescript
// Long-running operations with controlled extensions
await redlock.autoExtendLock('report-generation', 2000, async () => {
  await generateLargeReport()
  // Lock automatically extends up to 5 times
}, { maxExtensions: 5 })

// Payment processing with strict limit
await redlock.autoExtendLock('payment-critical', 1500, async () => {
  await processPayment()
  // Only 1 extension allowed for predictable timing
}, { maxExtensions: 1 })

// Background sync with unlimited extensions
await redlock.autoExtendLock('data-sync', 3000, async () => {
  await syncLargeDataset()
  // Unlimited extensions for unpredictable operations
}, { maxExtensions: -1 })

// Custom extension threshold for early triggers
await redlock.autoExtendLock('custom-operation', 2000, async () => {
  await performOperation()
  // Extend when 1000ms left instead of default 500ms
}, {
  maxExtensions: 3,
  extensionThreshold: 1000
})
```

### 3. Manual Lock Control

```typescript
// Fine-grained control over lock lifecycle
const lock = await redlock.acquire('user-data', 5000)
if (lock) {
  try {
    await performOperation()
    await redlock.extend(lock, 3000)  // Extend if needed
    await continueOperation()
  } finally {
    await redlock.release(lock)
  }
}
```

## Advanced Features

### Smart Extension Management

RedLock provides intelligent extension control with flexible configuration:

#### Extension Policies

1. **Unlimited Extensions** (default behavior)
   ```typescript
   await redlock.autoExtendLock('operation', 2000, fn) // No options = unlimited
   await redlock.autoExtendLock('operation', 2000, fn, { maxExtensions: -1 })
   ```

2. **Limited Extensions**
   ```typescript
   await redlock.autoExtendLock('payment', 3000, fn, { maxExtensions: 2 })
   // Will extend maximum 2 times, then let TTL expire naturally
   ```

3. **No Extensions**
   ```typescript
   await redlock.autoExtendLock('quick-task', 1000, fn, { maxExtensions: 0 })
   // Behaves like regular lock() with fixed TTL
   ```

#### Custom Extension Thresholds

Control when extensions are triggered:

```typescript
await redlock.autoExtendLock('operation', 5000, fn, {
  maxExtensions: 3,
  extensionThreshold: 1500  // Extend when 1500ms left (vs default 500ms)
})
```

#### Use Case Recommendations

- **Payment Processing**: `maxExtensions: 1-2` (predictable timing)
- **Data Migration**: `maxExtensions: 5-10` (reasonable safety margin)
- **Background Jobs**: `maxExtensions: -1` (unlimited for reliability)
- **Critical Operations**: `maxExtensions: 0` (strict time bounds)

### Smart Retry System

RedLock implements an intelligent retry mechanism with:

1. **Exponential Backoff**
   - Increasing delays between retries
   - Prevents system overload
   - Example: 100ms → 200ms → 400ms → 800ms

2. **Random Jitter**
   - Prevents thundering herd problem
   - Improves concurrent operation handling
   - Reduces network congestion

### Error Handling & Timeouts

```typescript
try {
  await redlock.lock('critical-operation', 2000, async () => {
    await criticalTask()
  })
} catch (error) {
  if (error instanceof LockTimeoutError) {
    // Handle timeout - operation exceeded duration
    await handleTimeout()
  } else if (error instanceof LockAcquisitionError) {
    // Handle acquisition failure - retries exhausted
    await handleAcquisitionFailure()
  }
}
```

### Production Monitoring

```typescript
const redlock = new RedLock(client, {
  onError: (error) => {
    if (error instanceof LockTimeoutError) {
      metrics.increment('lock.timeouts')
      logger.warn('Lock timeout', {
        resource: error.resource,
        duration: error.duration
      })
    }
  }
})
```

## Real-World Examples

> 💡 **Want more examples?** Check out our [complete example collection](https://github.com/hunandika/utilary/blob/main/examples/basic-usage.ts) with detailed use cases and advanced patterns.

### High-Concurrency Payment Processing

```typescript
async function processPaymentWithRetry(userId: string, amount: number) {
  const LOCK_DURATION = 5000
  const MAX_RETRIES = 3

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await redlock.lock(`payment-${userId}`, LOCK_DURATION, async () => {
        await validateBalance(userId)
        await deductAmount(userId, amount)
        await createTransaction(userId, amount)
      })
      return true
    } catch (error) {
      if (error instanceof LockTimeoutError) {
        if (attempt === MAX_RETRIES) throw error
        await delay(1000 * attempt)  // Exponential backoff
      } else {
        throw error
      }
    }
  }
}
```

### Distributed Data Updates with Extension Control

```typescript
// Data migration with reasonable extension limits
await redlock.autoExtendLock('user-migration', 2000, async () => {
  const userData = await fetchUserData()
  await processLargeDataset(userData)
  await saveUpdatedData(userData)
}, { maxExtensions: 10 }) // Allow up to 10 extensions for large operations

// Critical financial operations with strict control
await redlock.autoExtendLock('financial-calc', 3000, async () => {
  await performComplexCalculation()
  await updateAccountBalances()
}, {
  maxExtensions: 2,        // Maximum 2 extensions
  extensionThreshold: 800  // Extend early for safety
})
```

## Quick Reference

### autoExtendLock() Options

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `maxExtensions` | `number` | `undefined` | Maximum extensions allowed (`-1` = unlimited, `0` = none, `>0` = limit) |
| `extensionThreshold` | `number` | `100` | Time remaining (ms) when extension is triggered |

### Common Patterns

```typescript
// 💳 Payment processing (predictable timing)
await redlock.autoExtendLock('payment', 3000, paymentFn, {
  maxExtensions: 1
})

// 📊 Data processing (reasonable safety)
await redlock.autoExtendLock('analytics', 5000, analyticsFn, {
  maxExtensions: 5
})

// 🔄 Background sync (maximum reliability)
await redlock.autoExtendLock('sync', 2000, syncFn, {
  maxExtensions: -1
})

// ⚡ Quick operations (no extensions)
await redlock.autoExtendLock('cache-refresh', 1000, cacheFn, {
  maxExtensions: 0
})

// 🎯 Custom threshold (extend early)
await redlock.autoExtendLock('critical', 4000, criticalFn, {
  maxExtensions: 2,
  extensionThreshold: 1500  // Extend when 1.5s left
})
```

## Best Practices

### Thread Safety & Error Handling

**⚠️ CRITICAL: Always wrap RedLock operations in try-catch blocks** to ensure proper thread handling when locks fail or expire.

```typescript
// ✅ CORRECT: Proper error handling with cleanup
async function processWithLock(userId: string) {
  let transaction = null
  let timer = null

  try {
    // Start transaction
    transaction = await db.beginTransaction()

    // Set operation timeout
    timer = setTimeout(() => {
      throw new Error('Operation timeout')
    }, 30000)

    await redlock.lock(`user-${userId}`, 5000, async () => {
      await updateUserData(userId, transaction)
      await transaction.commit()
    })

  } catch (error) {
    // Handle lock failures, timeouts, or operation errors
    if (transaction) {
      await transaction.rollback()
      console.log('Transaction rolled back due to error')
    }

    if (error instanceof LockTimeoutError) {
      console.error('Lock operation timed out:', error.message)
      // Handle timeout-specific cleanup
    } else if (error instanceof LockAcquisitionError) {
      console.error('Failed to acquire lock:', error.message)
      // Handle acquisition failure
    } else {
      console.error('Unexpected error:', error.message)
    }

    throw error // Re-throw if needed
  } finally {
    // Always cleanup resources
    if (timer) {
      clearTimeout(timer)
    }

    // Close connections, cleanup resources, etc.
    await cleanupResources()
  }
}

// ❌ INCORRECT: No error handling - can cause resource leaks
async function unsafeProcess(userId: string) {
  const transaction = await db.beginTransaction()

  await redlock.lock(`user-${userId}`, 5000, async () => {
    await updateUserData(userId, transaction)
    await transaction.commit()
  })
  // If lock fails, transaction is never rolled back!
}
```

### Essential Thread Safety Patterns

1. **Database Transactions**
   ```typescript
   const transaction = await db.beginTransaction()
   try {
     await redlock.lock('resource', 3000, async () => {
       await performDatabaseOperations(transaction)
       await transaction.commit()
     })
   } catch (error) {
     await transaction.rollback()
     throw error
   }
   ```

2. **Timeout Management**
   ```typescript
   const timer = setTimeout(() => controller.abort(), 30000)
   try {
     await redlock.lock('resource', 5000, async () => {
       await operationWithAbortSignal(controller.signal)
     })
   } finally {
     clearTimeout(timer)
   }
   ```

3. **Resource Cleanup**
   ```typescript
   let fileHandle = null
   try {
     fileHandle = await openFile('data.txt')
     await redlock.lock('file-processing', 3000, async () => {
       await processFile(fileHandle)
     })
   } catch (error) {
     // Handle errors appropriately
     await handleProcessingError(error)
   } finally {
     if (fileHandle) {
       await fileHandle.close()
     }
   }
   ```

### Lock-Specific Error Handling

```typescript
try {
  await redlock.autoExtendLock('critical-operation', 2000, async () => {
    await performCriticalTask()
  }, { maxExtensions: 3 })
} catch (error) {
  if (error instanceof LockTimeoutError) {
    // Operation exceeded maximum time (initial TTL + extensions)
    await rollbackOperations()
    await notifyTimeout()
  } else if (error instanceof LockAcquisitionError) {
    // Could not acquire lock after retries
    await handleAcquisitionFailure()
    await scheduleRetry()
  } else if (error instanceof LockExtensionError) {
    // Lock extension failed (Redis connection issues, etc.)
    await handleExtensionFailure()
    await emergencyCleanup()
  }
}
```

1. **Lock Duration & Extension Strategy**
   - Set appropriate initial TTL based on expected operation time
   - Use `maxExtensions` to control resource usage:
     - **Critical/Financial**: `maxExtensions: 1-2` for predictable timing
     - **Data Processing**: `maxExtensions: 5-10` for reasonable safety
     - **Background Tasks**: `maxExtensions: -1` for maximum reliability
   - Prefer shorter TTL with extensions over very long initial TTL
   - Include buffer for network latency

2. **Resource Keys**
   - Use descriptive, hierarchical keys
   - Include relevant identifiers (user ID, transaction ID, etc.)
   - Consider environment prefixes (`prod:payment:`, `dev:sync:`)

3. **Extension Configuration**
   - Set `extensionThreshold` based on operation criticality:
     - High-priority: 1000ms+ (extend early)
     - Normal operations: 500ms (default)
     - Quick tasks: 100-200ms (minimal extension window)
   - Monitor extension patterns to optimize thresholds

4. **Error Handling & Thread Safety**
   - **ALWAYS** wrap RedLock operations in try-catch blocks
   - Implement comprehensive error catching for all lock operations
   - Use proper cleanup in finally blocks for transactions, timers, and resources
   - Handle different error types appropriately (timeout, acquisition, extension failures)
   - Ensure database transactions are rolled back on lock failures
   - Clear timeouts and cleanup resources in finally blocks
   - Monitor and log lock failures, especially extension failures
   - Handle max extension limits gracefully

5. **Performance**
   - Keep lock durations minimal while allowing for extensions
   - Release locks as soon as possible
   - Use appropriate retry configurations
   - Monitor extension frequency to detect performance issues

## Contributing

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

### 💡 Feature Requests & Bug Reports

- **Request Features**: [Open an issue on GitHub](https://github.com/hunandika/utilary/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)
- **Report Bugs**: [Submit a bug report](https://github.com/hunandika/utilary/issues/new?assignees=&labels=bug&template=bug_report.md&title=)

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## Author

Developed by **Hunandika** - Building reliable utilities for modern applications.

_Utilary: Where utility meets reliability_
