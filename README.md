# Utilary - TypeScript Utility Library

A comprehensive TypeScript utility library designed for scalable applications. Currently featuring robust Redis distributed locking functionality with plans for expanded data management utilities.

## Overview

Utilary provides enterprise-grade utilities for modern applications requiring reliable concurrency control and distributed system management. The library implements industry-standard algorithms like RedLock for distributed locking across Redis instances.

## Features

- 🔒 **Distributed Locking**: Redis-based distributed locks with RedLock algorithm
- 🔄 **Automatic Extension**: Smart lock extension for long-running operations
- ⚡ **Timeout Management**: Configurable timeouts with graceful error handling
- 🚀 **TypeScript First**: Full type safety with comprehensive type definitions
- 🎯 **Error Resilience**: Advanced error handling with customizable callbacks
- 📦 **Zero Dependencies**: Lightweight with minimal external dependencies
- 🏢 **Enterprise Ready**: Production-tested for scalable applications

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

// Create RedLock instance
const redlock = new RedLock(client, {
  retryCount: 10,
  retryDelay: 200,
  retryJitter: 200,
})

// Execute critical section with automatic lock management
await redlock.lock('critical-resource', 5000, async () => {
  console.log('Executing critical section...')
  await performCriticalOperation()
  console.log('Critical section completed safely')
})
```

## API Documentation

### Configuration Options

```typescript
interface RedLockOptions {
  retryCount?: number // Retry attempts for lock acquisition (default: 10)
  retryDelay?: number // Base retry delay in milliseconds (default: 200)
  retryJitter?: number // Random jitter for retry timing (default: 200)
  driftFactor?: number // Clock drift compensation factor (default: 0.01)
  automaticExtensionThreshold?: number // Auto-extension threshold in ms (default: 500)
  onError?: (error: Error) => void // Custom error handler callback
}
```

### Core Methods

#### `acquire(key: string, ttl: number): Promise<Lock | null>`

Acquire a distributed lock for the specified resource.

```typescript
const lock = await redlock.acquire('payment-processing', 5000)
if (lock) {
  try {
    // Perform locked operations
    await processPayment()
  } finally {
    await redlock.release(lock)
  }
}
```

#### `release(lock: Lock): Promise<boolean>`

Release a previously acquired lock.

```typescript
const released = await redlock.release(lock)
console.log(`Lock released: ${released}`)
```

#### `extend(lock: Lock, ttl: number): Promise<boolean>`

Extend the duration of an active lock.

```typescript
const extended = await redlock.extend(lock, 5000)
if (extended) {
  console.log('Lock extended successfully')
}
```

#### `lock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>`

Execute a function with automatic lock lifecycle management.

```typescript
const result = await redlock.lock('user-update', 3000, async () => {
  const user = await database.getUser(userId)
  user.lastLogin = new Date()
  await database.saveUser(user)
  return user
})
```

#### `autoExtendLock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T>`

Execute long-running operations with intelligent lock extension.

```typescript
const report = await redlock.autoExtendLock('report-generation', 5000, async () => {
  // Long-running operation - lock automatically extends as needed
  return await generateComplexReport()
})
```

## Advanced Usage

### Error Handling Strategy

Implement comprehensive error handling for production environments:

```typescript
const redlock = new RedLock(client, {
  retryCount: 15,
  retryDelay: 100,
  retryJitter: 50,
  onError: error => {
    logger.error('Distributed lock error', {
      error: error.message,
      timestamp: new Date().toISOString(),
      service: 'utilary-redlock',
    })

    // Integration with monitoring systems
    metrics.incrementCounter('redlock.errors')
  },
})
```

### Concurrent Operations

Handle multiple lock operations efficiently:

```typescript
// Process multiple resources concurrently
const results = await Promise.allSettled([
  redlock.lock('resource-1', 5000, () => processResource1()),
  redlock.lock('resource-2', 5000, () => processResource2()),
  redlock.lock('resource-3', 5000, () => processResource3()),
])

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Resource ${index + 1} processed successfully`)
  } else {
    console.error(`Resource ${index + 1} failed:`, result.reason)
  }
})
```

## Best Practices

1. **Lock Duration**: Set appropriate TTL values based on operation duration
2. **Error Handling**: Always implement comprehensive error handling
3. **Resource Naming**: Use descriptive, hierarchical lock keys
4. **Monitoring**: Track lock acquisition patterns and failures
5. **Testing**: Test lock behavior under various failure scenarios

## Roadmap

Utilary is actively developed with planned expansions:

- **Cache Management**: Advanced caching utilities and strategies
- **Rate Limiting**: Distributed rate limiting with multiple algorithms
- **Data Validation**: Enterprise-grade validation utilities
- **Event Processing**: Utilities for event-driven architectures
- **Monitoring Integration**: Built-in metrics and observability tools

## Contributing

We welcome contributions to expand Utilary's capabilities. Please read our contribution guidelines and submit pull requests for review.

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.

## Author

Developed by **Hunandika** - Building reliable utilities for modern applications.

---

_Utilary: Where utility meets reliability_
