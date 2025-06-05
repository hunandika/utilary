/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from 'vitest'

describe('Index Exports', () => {
  it('should export all types correctly', async () => {
    const module = await import('../src/index')

    // Test named exports
    expect(module.RedLock).toBeDefined()
    expect(module.RedLockError).toBeDefined()
    expect(module.RedLockAcquisitionError).toBeDefined()
    expect(module.RedLockReleaseError).toBeDefined()
    expect(module.RedLockExtendError).toBeDefined()
    expect(module.RedLockTimeoutError).toBeDefined()

    // Test that Lock and RedLockOptions types are exported (will be available in TypeScript)
    expect(typeof module.RedLock).toBe('function')
    expect(typeof module.RedLockError).toBe('function')
  })

  it('should export default RedLock class', async () => {
    const module = await import('../src/index')

    // Test default export
    expect(module.default).toBeDefined()
    expect(module.default).toBe(module.RedLock)
    expect(typeof module.default).toBe('function')
  })

  it('should allow creating RedLock instance from default export', async () => {
    const module = await import('../src/index')
    const RedLock = module.default

    const mockClient = {
      set: () => Promise.resolve('OK'),
      eval: () => Promise.resolve(1),
      isConnected: true,
      isReady: true,
    }

    const redlock = new RedLock(mockClient as any)
    expect(redlock).toBeInstanceOf(RedLock)
    expect(redlock.retryCount).toBe(10) // Default value
  })
})
