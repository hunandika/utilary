import { RedisClientType } from 'redis'
import {
  Lock,
  RedLockOptions,
  RedLockError,
  RedLockAcquisitionError,
  RedLockReleaseError,
  RedLockExtendError,
  RedLockTimeoutError,
} from './types'

/**
 * RedLock implementation for distributed locking with Redis.
 *
 * This class provides a robust distributed locking mechanism using Redis,
 * implementing the RedLock algorithm for reliable lock management across
 * distributed systems.
 *
 * @example
 * ```typescript
 * const redlock = new RedLock(client, {
 *   retryCount: 10,
 *   retryDelay: 200,
 *   retryJitter: 200
 * })
 *
 * await redlock.lock('resource-key', 5000, async () => {
 *   // Critical section code
 * })
 * ```
 */
export class RedLock {
  /** Redis client instance for lock operations */
  client: RedisClientType

  /** Maximum number of retry attempts for lock acquisition */
  retryCount: number

  /** Base delay between retry attempts in milliseconds */
  retryDelay: number

  /** Random jitter range for retry delays in milliseconds */
  retryJitter: number

  /** Clock drift factor for lock validity calculations */
  driftFactor: number

  /** Threshold for automatic lock extension in milliseconds */
  automaticExtensionThreshold: number

  /** Optional timeout identifier for scheduled extensions */
  extendIntervalId?: NodeJS.Timeout

  /** Optional error handler callback */
  onError?: (error: RedLockError) => void

  /**
   * Creates a new RedLock instance.
   *
   * @param client - Redis client instance
   * @param opts - Configuration options for lock behavior
   */
  constructor(client: RedisClientType, opts: RedLockOptions = {}) {
    this.client = client
    this.retryCount = opts.retryCount ?? 10
    this.retryDelay = opts.retryDelay ?? 200
    this.retryJitter = opts.retryJitter ?? 200
    this.driftFactor = opts.driftFactor ?? 0.01
    this.automaticExtensionThreshold = opts.automaticExtensionThreshold ?? 500
    this.onError = opts.onError
  }

  /**
   * Generates a unique value for lock identification.
   *
   * @returns Unique string combining random value and timestamp
   */
  private generateValue(): string {
    return Math.random().toString(36).slice(2) + Date.now().toString(36)
  }

  /**
   * Asynchronous delay utility for retry mechanisms.
   *
   * @param ms - Delay duration in milliseconds
   * @returns Promise that resolves after the specified delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Creates a standardized RedLock error with context information.
   *
   * @param error - Original error object
   * @param ErrorClass - Error constructor class
   * @param key - Lock key associated with the error
   * @returns Formatted RedLock error instance
   */
  private createError(
    error: Error,
    ErrorClass: new (message: string, key: string, cause?: Error) => RedLockError,
    key: string
  ): RedLockError {
    return new ErrorClass(`${ErrorClass.name}: ${error.message}`, key, error)
  }

  /**
   * Ensures the provided value is an Error instance.
   *
   * @param error - Unknown error value
   * @returns Error instance
   */
  private ensureError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error))
  }

  /**
   * Handles errors using the configured error handler.
   *
   * @param error - RedLock error to handle
   */
  private handleError(error: RedLockError): void {
    if (this.onError) {
      this.onError(error)
    }
  }

  /**
   * Attempts to acquire a distributed lock for the specified key.
   *
   * Uses an exponential backoff strategy with jitter for retry attempts.
   * The lock includes drift factor compensation for clock synchronization.
   *
   * @param key - Unique identifier for the resource to lock
   * @param ttl - Lock time-to-live in milliseconds
   * @returns Promise resolving to Lock object if successful, null if failed
   */
  async acquire(key: string, ttl: number): Promise<Lock | null> {
    const value = this.generateValue()

    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const result = await this.client.set(key, value, { NX: true, PX: ttl })
        if (result === 'OK') {
          const drift = Math.floor(ttl * this.driftFactor) + 2
          const validUntil = Date.now() + ttl - drift
          return { key, value, validUntil }
        }

        // Apply jittered delay before retry
        const delay = this.retryDelay + Math.floor(Math.random() * this.retryJitter)
        await this.sleep(delay)
      } catch (error) {
        this.handleError(this.createError(this.ensureError(error), RedLockAcquisitionError, key))
      }
    }
    return null
  }

  /**
   * Releases a previously acquired lock using atomic Lua script.
   *
   * Ensures the lock is only released by the owner using value comparison.
   *
   * @param lock - Lock object to release
   * @returns Promise resolving to true if released successfully, false otherwise
   */
  async release(lock: Lock): Promise<boolean> {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `
    try {
      const result = await this.client.eval(lua, {
        keys: [lock.key],
        arguments: [lock.value],
      })
      return result === 1
    } catch (error) {
      this.handleError(this.createError(this.ensureError(error), RedLockReleaseError, lock.key))
      return false
    }
  }

  /**
   * Extends the TTL of an existing lock using atomic Lua script.
   *
   * Updates both Redis TTL and local lock validity tracking.
   *
   * @param lock - Lock object to extend
   * @param ttl - New TTL duration in milliseconds
   * @returns Promise resolving to true if extended successfully, false otherwise
   */
  async extend(lock: Lock, ttl: number): Promise<boolean> {
    const lua = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("pexpire", KEYS[1], ARGV[2])
      else
        return 0
      end
    `
    try {
      const result = await this.client.eval(lua, {
        keys: [lock.key],
        arguments: [lock.value, ttl.toString()],
      })
      if (result === 1) {
        lock.validUntil = Date.now() + ttl - Math.floor(ttl * this.driftFactor) - 2
        return true
      }
      return false
    } catch (error) {
      this.handleError(this.createError(this.ensureError(error), RedLockExtendError, lock.key))
      return false
    }
  }

  /**
   * Executes a function with automatic lock extension for long-running operations.
   *
   * Monitors lock validity and automatically extends when approaching expiration.
   * Provides intelligent scheduling to minimize Redis operations.
   *
   * @param key - Unique identifier for the resource to lock
   * @param ttl - Initial lock time-to-live in milliseconds
   * @param fn - Function to execute with lock protection
   * @returns Promise resolving to the function's return value
   * @throws Error if lock acquisition fails
   */
  async autoExtendLock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquire(key, ttl)
    if (!lock) throw new Error('Failed to acquire lock')

    let isReleased = false

    const scheduleExtend = async (): Promise<void> => {
      if (isReleased) return

      const timeLeft = lock.validUntil - Date.now()
      if (timeLeft < this.automaticExtensionThreshold) {
        const extended = await this.extend(lock, ttl)
        if (!extended) {
          return
        }
      }

      const nextExtend = lock.validUntil - Date.now() - this.automaticExtensionThreshold
      setTimeout(scheduleExtend, Math.max(nextExtend, 0))
    }

    scheduleExtend()

    try {
      return await fn()
    } finally {
      isReleased = true
      await this.release(lock)
    }
  }

  /**
   * Creates a timeout wrapper for function execution.
   *
   * @param fn - Function to wrap with timeout
   * @param timeoutMs - Timeout duration in milliseconds
   * @returns Wrapped function with timeout behavior
   */
  private withTimeout<T>(fn: () => Promise<T>, timeoutMs: number): () => Promise<T> {
    return () =>
      new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new RedLockTimeoutError(`Function timed out`, timeoutMs))
        }, timeoutMs)

        fn()
          .then(res => {
            clearTimeout(timer)
            resolve(res)
          })
          .catch(err => {
            clearTimeout(timer)
            reject(err)
          })
      })
  }

  /**
   * Executes a function with automatic lock management and timeout protection.
   *
   * Acquires lock, executes function with timeout, and ensures lock release.
   * Provides a simple interface for protected critical sections.
   *
   * @param key - Unique identifier for the resource to lock
   * @param ttl - Lock time-to-live and timeout duration in milliseconds
   * @param fn - Function to execute with lock protection
   * @returns Promise resolving to the function's return value
   * @throws Error if lock acquisition fails or function times out
   */
  async lock<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
    const lock = await this.acquire(key, ttl)
    if (!lock) throw new Error('Failed to acquire lock')

    try {
      return await this.withTimeout(fn, ttl)()
    } finally {
      await this.release(lock)
    }
  }
}
