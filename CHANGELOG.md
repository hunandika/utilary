# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-28

### 🎉 Added
- **Redis Distributed Locking**: Complete RedLock implementation for distributed systems
- **Lock Management**: Acquire, release, extend, and auto-extend locks with Redis
- **Error Handling**: Custom error types (`RedLockError`, `RedLockTimeoutError`, `RedLockAcquisitionError`)
- **TypeScript Support**: Full type definitions and intellisense
- **Retry Strategy**: Exponential backoff with jitter for lock acquisition

### 🧪 Testing
- **100% Test Coverage**: Lines, functions, branches, and statements all covered
- **77 Test Cases**: Comprehensive test suite including error scenarios
- **Real Redis Integration**: Tests against actual Redis instances

### 🔧 Updated
- **Vitest**: Upgraded to `^3.2.1` for better performance
- **ESLint**: Updated to `^9.0.0` with latest rules
- **Dependencies**: Removed deprecated packages and fixed vulnerabilities
- **CI/CD**: Updated GitHub Actions to latest versions (checkout@v5, setup-node@v5)
- **Node.js**: Support for versions 20.x, 22.x, and latest

### 📁 Changed
- **Test Structure**: Moved all tests from `src/__tests__/` to `tests/` folder
- **Project Organization**: Cleaner separation between source and test files
- **Documentation**: Updated README and testing documentation

### 🐛 Fixed
- **npm audit**: Resolved all security vulnerabilities
- **ESLint warnings**: Clean linting with 0 errors/warnings
- **Deprecated dependencies**: Replaced outdated packages

### 🚀 Features
```typescript
// Basic usage
const redlock = new RedLock(redisClient)
const lock = await redlock.acquire('my-key', 5000) // 5 second TTL
if (lock) {
  // Do work
  await redlock.release(lock)
}

// Auto-extending lock for long operations
await redlock.using('long-task', 10000, async () => {
  // Long running task - lock auto-extends
})
```

### 📦 Installation
```bash
npm install utilary
```