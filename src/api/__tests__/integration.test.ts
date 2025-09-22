/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Integration tests for the Datalayer API SDK
 *
 * These tests hit REAL API endpoints when a token is provided.
 * Set DATALAYER_TEST_TOKEN in .env.test or environment to run against real API.
 * Without a token, tests are skipped.
 *
 * Configuration:
 * - DATALAYER_TEST_TOKEN: Your API token (required for real tests)
 * - DATALAYER_TEST_BASE_URL: API base URL (default: https://prod1.datalayer.run)
 * - DATALAYER_TEST_SKIP_EXPENSIVE: Skip tests that create resources/use credits
 *
 * Run:
 * npm run test:integration
 */

// Import all integration test suites
import './integration/iam.test';
import './integration/runtimes.test';
import './integration/spacer.test';
import './integration/common.test';
