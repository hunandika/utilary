/**
 * Utilary - TypeScript Utility Library
 *
 * A comprehensive utility library featuring Redis distributed locking
 * and additional data management utilities for scalable applications.
 *
 * @packageDocumentation
 * @author Hunandika
 * @version 1.0.0
 */

// Type definitions and interfaces
export {
  Lock,
  RedLockOptions,
  RedLockError,
  RedLockAcquisitionError,
  RedLockReleaseError,
  RedLockExtendError,
  RedLockTimeoutError,
} from './types'

// Core RedLock implementation
export { RedLock } from './redlock'

// Default export for convenience
export { RedLock as default } from './redlock'
