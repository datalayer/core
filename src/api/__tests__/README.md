# Datalayer API Tests

## Running Tests

### Basic Tests (Default)

Run all unit and integration tests that don't create expensive resources:

```bash
npm run test
```

### Sequential Runtime Lifecycle Tests (Expensive)

These tests create real runtime instances and incur costs. They test the complete lifecycle:

1. Creating two runtimes (python-cpu-env and ai-env)
2. Listing and finding both runtimes
3. Getting details of each runtime
4. Updating runtimes (currently commented - needs clarification on 'from' parameter)
5. Deleting runtimes one by one
6. Verifying proper cleanup

To run expensive tests:

```bash
# Enable expensive tests
DATALAYER_TEST_RUN_EXPENSIVE=true npm run test -- --run src/api/__tests__/runtimes.runtimes.integration.test.ts

# With custom environments (optional)
DATALAYER_TEST_RUN_EXPENSIVE=true \
DATALAYER_TEST_PYTHON_ENV=python-cpu-env \
DATALAYER_TEST_AI_ENV=ai-env \
npm run test -- --run src/api/__tests__/runtimes.runtimes.integration.test.ts
```

## Test Configuration

The test suite uses environment variables configured in `.env.test`:

- `DATALAYER_API_TOKEN` or `DATALAYER_TEST_TOKEN` - Required for API authentication
- `DATALAYER_TEST_RUN_EXPENSIVE` - Set to `true` to run expensive tests
- `DATALAYER_TEST_SKIP_EXPENSIVE` - Set to `true` to skip expensive tests (deprecated)
- `DATALAYER_TEST_PYTHON_ENV` - Python environment name (default: python-cpu-env)
- `DATALAYER_TEST_AI_ENV` - AI environment name (default: ai-env)
- `DATALAYER_TEST_DEBUG` - Set to `true` for debug output
- `DATALAYER_TEST_BASE_URL` - Override base URL (optional)

## Test Structure

### Unit Tests

- Located in `*.unit.test.ts` files
- Test parameter validation and error handling
- Don't make real API calls

### Integration Tests

- Located in `*.integration.test.ts` files
- Make real API calls to test endpoints
- Include both simple tests (read-only) and expensive tests (create/delete resources)

### Sequential Tests

Tests that need to run in order use `describe.sequential()`:

- Ensures tests run one after another
- Allows sharing state between tests (like created resource IDs)
- Essential for testing full resource lifecycles

## Important Notes

1. **Cleanup**: The sequential tests include `afterAll` hooks to clean up created resources even if tests fail
2. **Timeouts**: Runtime creation has a 60-second timeout as it can take time to provision
3. **Error Handling**: Tests verify proper error messages for 404 and 503 status codes
4. **State Management**: Created pod names are stored in variables and cleared after deletion to prevent double cleanup
