# Utilary Testing Documentation

## Testing Framework Overview

Utilary employs **Vitest** as the primary testing framework, chosen for its modern architecture, superior performance, and excellent TypeScript integration compared to traditional testing frameworks.

## Testing Environment Setup

### Required Dependencies

```json
{
  "devDependencies": {
    "vitest": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8",
    "redis": "^5.5.5"
  }
}
```

### Redis Server Prerequisites

Integration tests require an active Redis server instance. The default configuration connects to `localhost:6379`.

### Installation

```bash
npm install
```

## Test Execution

### Prerequisites: Redis Server Setup

```bash
# Using Docker (Recommended)
docker run -d --name utilary-redis-test -p 6379:6379 redis:7-alpine

# Or using local Redis installation
redis-server
```

### Environment Configuration (Optional)

```bash
export REDIS_URL="redis://localhost:6379"
```

### Available Test Commands

#### 1. **Interactive Testing (Development)**

```bash
npm test
```

#### 2. **Single Run (CI/CD)**

```bash
npm run test:run
```

#### 3. **Coverage Analysis**

```bash
npm run test:coverage
```

#### 4. **Specific Test File**

```bash
npx vitest src/__tests__/redlock.test.ts
```

#### 5. **Watch Mode Development**

```bash
npx vitest --watch
```

## Test Architecture

```
src/
├── __tests__/
│   ├── redlock.test.ts       # Core RedLock functionality tests
│   ├── types.test.ts         # Type definitions and error handling tests
│   └── index.test.ts         # Module exports verification
└── ...
```

## Comprehensive Test Coverage

### 1. **Core Functionality Tests** (`redlock.test.ts`)

- ✅ **Configuration**: Constructor options and defaults
- ✅ **Lock Acquisition**: Distributed lock creation with retry mechanisms
- ✅ **Lock Release**: Atomic lock release with ownership verification
- ✅ **Lock Extension**: TTL extension for active locks
- ✅ **Auto-Extension**: Intelligent lock extension for long-running operations
- ✅ **Timeout Management**: Function execution timeout handling
- ✅ **Error Resilience**: Comprehensive error handling and recovery
- ✅ **Retry Strategy**: Exponential backoff with jitter
- ✅ **Concurrent Operations**: Multi-lock scenarios and contention handling

### 2. **Type System Tests** (`types.test.ts`)

- ✅ **Error Hierarchy**: Custom error class inheritance
- ✅ **Type Safety**: Interface compliance and type checking
- ✅ **Error Context**: Error metadata and cause propagation

### 3. **Module Integration Tests** (`index.test.ts`)

- ✅ **Export Verification**: Public API surface testing
- ✅ **Module Loading**: Import/export functionality
- ✅ **Default Exports**: Convenience export validation

## Testing Strategy

### Real Redis Integration Approach

Utilary employs a hybrid testing strategy combining unit tests with real Redis integration:

```typescript
describe('RedLock with Real Redis', () => {
  let redisClient: RedisClientType
  let isRedisAvailable = false

  const skipIfNoRedis = () => {
    if (!isRedisAvailable) {
      console.log('⏭️  Skipping test - Redis not available')
      return true
    }
    return false
  }

  beforeAll(async () => {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
      redisClient = createClient({ url: redisUrl })
      await redisClient.connect()
      isRedisAvailable = true
      console.log('✅ Connected to Redis for testing')
    } catch (error) {
      console.warn('⚠️  Redis not available, skipping Redis tests')
      isRedisAvailable = false
    }
  })
})
```

### Benefits of This Approach:

- 🎯 **Authentic Behavior**: Tests against actual Redis operations
- 🔄 **Graceful Degradation**: Automatic test skipping when Redis unavailable
- 🧹 **Clean Environment**: Automated test data cleanup
- 🐳 **Container Ready**: Seamless Docker integration
- ⚡ **CI/CD Friendly**: Works in automated deployment pipelines

## Quality Metrics & Coverage Goals

| Metric         | Target | Description                         |
| -------------- | ------ | ----------------------------------- |
| **Lines**      | > 98%  | Individual line execution coverage  |
| **Functions**  | > 98%  | Function/method invocation coverage |
| **Branches**   | > 95%  | Conditional logic path coverage     |
| **Statements** | > 98%  | Statement execution coverage        |

## Advanced Testing Patterns

### 1. **Concurrent Operation Testing**

```typescript
it('should handle burst operations with real Redis', async () => {
  const operations: Promise<any>[] = []

  // Create burst of different operations
  for (let i = 0; i < 5; i++) {
    operations.push(redlock.acquire(`burst-key-${i}`, 500))
  }

  const results = await Promise.all(operations)
  // Verify all operations complete successfully
})
```

### 2. **Error Resilience Testing**

```typescript
it('should handle connection errors gracefully', async () => {
  const onError = vi.fn()
  const errorRedlock = new RedLock(client, {
    retryCount: 3,
    onError,
  })

  // Test error scenarios and recovery
})
```

### 3. **Performance Characteristics**

```typescript
it('should maintain performance under load', async () => {
  const startTime = Date.now()
  const operations: Promise<boolean>[] = []

  for (let i = 0; i < 10; i++) {
    operations.push(
      redlock.acquire(`perf-test-${i}`, 1000).then(lock => (lock ? redlock.release(lock) : false))
    )
  }

  const results = await Promise.all(operations)
  const endTime = Date.now()

  expect(results.every(result => result === true)).toBe(true)
  expect(endTime - startTime).toBeLessThan(5000)
})
```

## Best Practices

### 1. **Test Organization Principles**

- **Descriptive Naming**: Test names clearly describe behavior and expected outcomes
- **Logical Grouping**: Related tests grouped using `describe` blocks
- **Setup Isolation**: Proper setup/teardown to ensure test independence
- **Edge Case Coverage**: Comprehensive testing of boundary conditions

### 2. **Assertion Strategy**

- **Positive Path Testing**: Verify expected behavior under normal conditions
- **Error Path Testing**: Validate error handling and recovery mechanisms
- **Side Effect Verification**: Confirm system state changes are as expected
- **Timing Verification**: Validate timeout and timing-sensitive operations

### 3. **Mock Management**

- **Strategic Mocking**: Mock external dependencies while preserving business logic
- **Call Verification**: Verify mock interactions and call patterns
- **State Reset**: Clean mock state between test runs
- **Real Integration**: Balance mocking with real system integration where valuable

## Continuous Integration Setup

### GitHub Actions Configuration

```yaml
name: Utilary Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage
        env:
          REDIS_URL: redis://localhost:6379

      - name: Upload coverage reports
        uses: codecov/codecov-action@v3
```

### Local Development Workflow

```bash
# 1. Start Redis for testing
docker run -d --name utilary-test-redis -p 6379:6379 redis:7-alpine

# 2. Run tests in watch mode during development
npm test

# 3. Run full test suite before committing
npm run test:coverage

# 4. Clean up test environment
docker stop utilary-test-redis && docker rm utilary-test-redis
```

## Troubleshooting

### Common Issues and Solutions

#### Redis Connection Failures

```bash
# Verify Redis is running
redis-cli ping
# Expected output: PONG

# Check port availability
netstat -an | grep 6379

# Docker Redis logs
docker logs utilary-test-redis
```

#### Test Coverage Issues

```bash
# Generate detailed coverage report
npm run test:coverage -- --reporter=verbose

# Identify uncovered lines
npm run test:coverage -- --reporter=html
```

#### Performance Test Failures

```bash
# Run tests with increased timeout
npx vitest --testTimeout=10000

# Profile test execution
npm run test:coverage -- --reporter=verbose --logHeapUsage
```

---

**Utilary Testing Framework** - Ensuring reliability through comprehensive test coverage and real-world validation.
