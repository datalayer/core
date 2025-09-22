# API Testing Guide

## Overview

The Datalayer SDK includes comprehensive testing with both unit tests (mocked) and real integration tests (actual API calls).

## Test Types

### 1. Unit Tests (Mocked)
- **File**: `src/api/__tests__/sdk.test.ts`
- **Purpose**: Fast, isolated testing of SDK logic
- **Run**: `npm test`

### 2. Integration Tests (Optional Real API)
- **File**: `src/api/__tests__/integration.test.ts`
- **Purpose**: Tests with optional real API (requires token)
- **Run**: `DATALAYER_TEST_TOKEN=your-token npm test:integration`

### 3. Real Integration Tests (No Mocking!)
- **File**: `src/api/__tests__/real-integration.test.ts`
- **Purpose**: Comprehensive testing against actual API endpoints
- **Run**: `npm run test:real` or `npm run test:api`

## Setting Up Real Integration Tests

### Step 1: Configure Environment

Create a `.env.test` file in the project root:

```bash
cp .env.test.example .env.test
```

Edit `.env.test` and add your credentials:

```env
# Required
DATALAYER_TEST_TOKEN=your-actual-api-token

# Optional
DATALAYER_TEST_BASE_URL=https://prod1.datalayer.run
DATALAYER_TEST_SKIP_EXPENSIVE=true  # Skip tests that consume credits
```

### Step 2: Run Tests

```bash
# Run all real integration tests
npm run test:real

# Run with watch mode (interactive)
npm run test:real:watch

# Run using the test script (loads .env.test automatically)
npm run test:api

# Run specific test suites
npm run test:api "Authentication"
```

## Test Categories

### Read-Only Tests (Always Run)
- ✅ Authentication & user profile
- ✅ Credit balance check
- ✅ List organizations
- ✅ List environments
- ✅ List runtimes
- ✅ List spaces & notebooks
- ✅ Search functionality
- ✅ Pagination
- ✅ Error handling

### Write Tests (Skippable)
Set `DATALAYER_TEST_SKIP_EXPENSIVE=true` to skip:
- ⚠️ Space creation/deletion
- ⚠️ Notebook creation/deletion
- ⚠️ Runtime creation (uses credits!)

## Test Features

### Automatic Cleanup
All created resources are tracked and automatically cleaned up after tests, even if tests fail.

### Detailed Logging
Real integration tests provide detailed console output:
- 📍 Configuration details
- ✅ Success indicators
- ❌ Error messages
- 💰 Credit usage
- ⏱️ Performance metrics

### Rate Limiting Protection
Tests include delays between requests to avoid rate limiting.

### Concurrent Testing
Tests verify the SDK handles concurrent requests correctly.

## Best Practices

1. **Use `.env.test`**: Never commit tokens to the repository
2. **Monitor Credits**: Check credit balance before running expensive tests
3. **Clean Resources**: Always let tests complete cleanup
4. **Test Locally First**: Run unit tests before integration tests
5. **Check Service Health**: Use the health check tests to verify API status

## Troubleshooting

### Authentication Errors
```
❌ Authentication failed: 401 Unauthorized
```
**Solution**: Check your token in `.env.test`

### Rate Limiting
```
⚠️ Rate limit exceeded
```
**Solution**: Wait a few minutes and retry

### Insufficient Credits
```
⏭️ Insufficient credits for runtime creation
```
**Solution**: Add credits to your account or set `DATALAYER_TEST_SKIP_EXPENSIVE=true`

### Network Timeouts
```
Request timeout after 60000ms
```
**Solution**: Check your network connection or API status

## CI/CD Integration

For CI/CD pipelines:

```yaml
# GitHub Actions example
- name: Run API Tests
  env:
    DATALAYER_TEST_TOKEN: ${{ secrets.DATALAYER_TEST_TOKEN }}
    DATALAYER_TEST_SKIP_EXPENSIVE: true
  run: npm run test:real
```

## Test Coverage

The real integration tests cover:
- ✅ All three services (Runtimes, IAM, Spacer)
- ✅ CRUD operations
- ✅ Error scenarios
- ✅ Edge cases
- ✅ Performance testing
- ✅ Token management
- ✅ Resource cleanup

## Contributing

When adding new API endpoints:
1. Add unit tests with mocks in `sdk.test.ts`
2. Add integration tests in `integration.test.ts`
3. Add real API tests in `real-integration.test.ts`
4. Update resource cleanup in `ResourceTracker` class
5. Document any new environment variables