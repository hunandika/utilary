/**
 * Represents an active distributed lock with ownership information.
 */
export type Lock = {
  /** Unique identifier for the locked resource */
  key: string
  /** Unique value for lock ownership verification */
  value: string
  /** Timestamp when the lock expires (milliseconds since epoch) */
  validUntil: number
}

/**
 * Configuration options for RedLock behavior and retry strategies.
 */
export type RedLockOptions = {
  /** Maximum number of retry attempts for lock acquisition (default: 10) */
  retryCount?: number
  /** Base delay between retry attempts in milliseconds (default: 200) */
  retryDelay?: number
  /** Random jitter range for retry delays in milliseconds (default: 200) */
  retryJitter?: number
  /** Clock drift factor for lock validity calculations (default: 0.01) */
  driftFactor?: number
  /** Threshold for automatic lock extension in milliseconds (default: 500) */
  automaticExtensionThreshold?: number
  /** Optional callback for handling lock operation errors */
  onError?: (error: RedLockError) => void
}

/**
 * Configuration options for auto-extending lock behavior.
 */
export type AutoExtendLockOptions = {
  /**
   * Maximum number of extensions allowed.
   * - `undefined` or omitted: unlimited extensions (default behavior)
   * - `-1`: unlimited extensions (explicit)
   * - `0`: no extensions allowed
   * - `>0`: maximum number of extensions
   */
  maxExtensions?: number
  /**
   * Time remaining (in milliseconds) when extension should be triggered.
   * Overrides the global automaticExtensionThreshold for this operation.
   * Default: uses RedLock instance's automaticExtensionThreshold (500ms)
   */
  extensionThreshold?: number
}

/**
 * Base error class for all RedLock-related errors.
 *
 * Provides context information including the operation type,
 * resource key, and underlying cause when available.
 */
export class RedLockError extends Error {
  /**
   * Creates a new RedLock error.
   *
   * @param message - Error description
   * @param operation - Type of operation that failed
   * @param key - Resource key associated with the error
   * @param cause - Underlying error that triggered this error
   */
  constructor(
    message: string,
    public readonly operation: string,
    public readonly key?: string,
    public readonly cause?: Error
  ) {
    super(message)
    this.name = 'RedLockError'
  }
}

/**
 * Error thrown when lock acquisition fails.
 *
 * This can occur due to network issues, Redis unavailability,
 * or lock contention after retry exhaustion.
 */
export class RedLockAcquisitionError extends RedLockError {
  /**
   * Creates a new lock acquisition error.
   *
   * @param message - Error description
   * @param key - Resource key that failed to be locked
   * @param cause - Underlying error that caused the failure
   */
  constructor(message: string, key: string, cause?: Error) {
    super(message, 'acquisition', key, cause)
    this.name = 'RedLockAcquisitionError'
  }
}

/**
 * Error thrown when lock release fails.
 *
 * This can occur due to network issues, Redis unavailability,
 * or attempting to release an already expired lock.
 */
export class RedLockReleaseError extends RedLockError {
  /**
   * Creates a new lock release error.
   *
   * @param message - Error description
   * @param key - Resource key that failed to be released
   * @param cause - Underlying error that caused the failure
   */
  constructor(message: string, key: string, cause?: Error) {
    super(message, 'release', key, cause)
    this.name = 'RedLockReleaseError'
  }
}

/**
 * Error thrown when lock extension fails.
 *
 * This can occur due to network issues, Redis unavailability,
 * or attempting to extend an expired or invalid lock.
 */
export class RedLockExtendError extends RedLockError {
  /**
   * Creates a new lock extension error.
   *
   * @param message - Error description
   * @param key - Resource key that failed to be extended
   * @param cause - Underlying error that caused the failure
   */
  constructor(message: string, key: string, cause?: Error) {
    super(message, 'extend', key, cause)
    this.name = 'RedLockExtendError'
  }
}

/**
 * Error thrown when a function execution exceeds the specified timeout.
 *
 * This error is used by the lock() method when the protected function
 * takes longer than the lock TTL to complete.
 */
export class RedLockTimeoutError extends RedLockError {
  /**
   * Creates a new timeout error.
   *
   * @param message - Error description
   * @param timeoutMs - Timeout duration that was exceeded
   * @param key - Resource key associated with the timeout
   */
  constructor(message: string, timeoutMs: number, key?: string) {
    super(`${message} (timeout: ${timeoutMs}ms)`, 'timeout', key)
    this.name = 'RedLockTimeoutError'
  }
}
