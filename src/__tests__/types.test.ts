import { describe, it, expect } from 'vitest'
import {
  RedLockError,
  RedLockAcquisitionError,
  RedLockReleaseError,
  RedLockExtendError,
  RedLockTimeoutError,
} from '../types'

describe('Error Types', () => {
  describe('RedLockError', () => {
    it('should create error with correct properties', () => {
      const error = new RedLockError('Test message', 'test-operation', 'test-key')

      expect(error).toBeInstanceOf(Error)
      expect(error.name).toBe('RedLockError')
      expect(error.message).toBe('Test message')
      expect(error.operation).toBe('test-operation')
      expect(error.key).toBe('test-key')
    })

    it('should create error without key', () => {
      const error = new RedLockError('Test message', 'test-operation')

      expect(error.key).toBeUndefined()
    })

    it('should create error with cause', () => {
      const cause = new Error('Original error')
      const error = new RedLockError('Test message', 'test-operation', 'test-key', cause)

      expect(error.cause).toBe(cause)
    })
  })

  describe('RedLockAcquisitionError', () => {
    it('should create acquisition error', () => {
      const error = new RedLockAcquisitionError('Failed to acquire', 'test-key')

      expect(error).toBeInstanceOf(RedLockError)
      expect(error.name).toBe('RedLockAcquisitionError')
      expect(error.operation).toBe('acquisition')
      expect(error.key).toBe('test-key')
    })
  })

  describe('RedLockReleaseError', () => {
    it('should create release error', () => {
      const error = new RedLockReleaseError('Failed to release', 'test-key')

      expect(error).toBeInstanceOf(RedLockError)
      expect(error.name).toBe('RedLockReleaseError')
      expect(error.operation).toBe('release')
      expect(error.key).toBe('test-key')
    })
  })

  describe('RedLockExtendError', () => {
    it('should create extend error', () => {
      const error = new RedLockExtendError('Failed to extend', 'test-key')

      expect(error).toBeInstanceOf(RedLockError)
      expect(error.name).toBe('RedLockExtendError')
      expect(error.operation).toBe('extend')
      expect(error.key).toBe('test-key')
    })
  })

  describe('RedLockTimeoutError', () => {
    it('should create timeout error', () => {
      const error = new RedLockTimeoutError('Operation timed out', 5000, 'test-key')

      expect(error).toBeInstanceOf(RedLockError)
      expect(error.name).toBe('RedLockTimeoutError')
      expect(error.operation).toBe('timeout')
      expect(error.message).toBe('Operation timed out (timeout: 5000ms)')
      expect(error.key).toBe('test-key')
    })

    it('should create timeout error without key', () => {
      const error = new RedLockTimeoutError('Operation timed out', 3000)

      expect(error.key).toBeUndefined()
      expect(error.message).toBe('Operation timed out (timeout: 3000ms)')
    })
  })
})
