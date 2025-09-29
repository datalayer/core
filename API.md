# Datalayer Core API Documentation

This document provides comprehensive examples for using both the raw API functions and the SDK client.

## Table of Contents

- [Raw API Usage](#raw-api-usage)
  - [IAM (Identity & Access Management)](#iam-identity--access-management)
  - [Runtimes](#runtimes)
  - [Spacer (Notebooks & Documents)](#spacer-notebooks--documents)
- [SDK Client Usage](#sdk-client-usage)
  - [Initialization](#initialization)
  - [Authentication](#authentication)
  - [Runtime Management](#runtime-management)
  - [Notebook & Document Management](#notebook--document-management)
  - [Model Classes](#model-classes)

## Raw API Usage

The raw API functions provide direct access to Datalayer services without the need for the SDK client.

### IAM (Identity & Access Management)

#### Authentication

```typescript
import { authentication } from '@datalayer/core/api/iam';

// Login with username and password
const loginResponse = await authentication.login(
  'user@example.com',
  'password123',
  'https://id.datalayer.run'
);
console.log('Token:', loginResponse.token);
console.log('User:', loginResponse.user);

// Logout
await authentication.logout(
  'bearer-token-123',
  'https://id.datalayer.run'
);
```

#### Profile Management

```typescript
import { profile } from '@datalayer/core/api/iam';

// Get user profile
const userProfile = await profile.getProfile(
  'bearer-token-123',
  'https://id.datalayer.run'
);
console.log('User ID:', userProfile.uid);
console.log('Email:', userProfile.email);
console.log('Roles:', userProfile.roles);

// Update profile
const updatedProfile = await profile.updateProfile(
  'bearer-token-123',
  {
    firstName: 'John',
    lastName: 'Doe',
    avatarUrl: 'https://example.com/avatar.jpg'
  },
  'https://id.datalayer.run'
);
```

#### Health Check

```typescript
import { healthz } from '@datalayer/core/api/iam';

// Check IAM service health
const health = await healthz.ping('https://id.datalayer.run');
console.log('Service status:', health.status);
console.log('Version:', health.version);
```

### Runtimes

#### Environment Management

```typescript
import { environments } from '@datalayer/core/api/runtimes';

// List available environments
const envList = await environments.listEnvironments(
  'bearer-token-123',
  'https://runtimes.datalayer.run'
);
console.log('Available environments:', envList.environments);

// Get environment details
const env = await environments.getEnvironment(
  'bearer-token-123',
  'python-cpu-env',
  'https://runtimes.datalayer.run'
);
console.log('Environment:', env.name);
console.log('Resources:', env.resources);
console.log('Packages:', env.packages);
```

#### Runtime Lifecycle

```typescript
import { runtimes } from '@datalayer/core/api/runtimes';

// Create a runtime
const createResponse = await runtimes.createRuntime(
  'bearer-token-123',
  {
    environment_name: 'python-cpu-env',
    type: 'notebook',
    given_name: 'my-analysis-runtime',
    credits_limit: 100
  },
  'https://runtimes.datalayer.run'
);
console.log('Runtime created:', createResponse.runtime.pod_name);

// List runtimes
const runtimeList = await runtimes.listRuntimes(
  'bearer-token-123',
  'https://runtimes.datalayer.run'
);
console.log('Active runtimes:', runtimeList.runtimes.length);

// Get runtime details
const runtime = await runtimes.getRuntime(
  'bearer-token-123',
  'runtime-abc123',
  'https://runtimes.datalayer.run'
);
console.log('State:', runtime.state);
console.log('Jupyter URL:', runtime.jupyter_url);

// Delete runtime
await runtimes.deleteRuntime(
  'bearer-token-123',
  'runtime-abc123',
  'https://runtimes.datalayer.run'
);
```

#### Snapshots

```typescript
import { snapshots } from '@datalayer/core/api/runtimes';

// Create a snapshot
const snapshot = await snapshots.createSnapshot(
  'bearer-token-123',
  {
    pod_name: 'runtime-abc123',
    name: 'checkpoint-1',
    description: 'Before major refactoring',
    stop: false
  },
  'https://runtimes.datalayer.run'
);
console.log('Snapshot created:', snapshot.snapshot.uid);

// List snapshots
const snapshotList = await snapshots.listSnapshots(
  'bearer-token-123',
  'https://runtimes.datalayer.run'
);
console.log('Total snapshots:', snapshotList.snapshots.length);

// Get snapshot details
const snapshotDetails = await snapshots.getSnapshot(
  'bearer-token-123',
  'snapshot-xyz789',
  'https://runtimes.datalayer.run'
);
console.log('Status:', snapshotDetails.snapshot.status);

// Delete snapshot
await snapshots.deleteSnapshot(
  'bearer-token-123',
  'snapshot-xyz789',
  'https://runtimes.datalayer.run'
);
```

### Spacer (Notebooks & Documents)

#### Space Management

```typescript
import { users, spaces } from '@datalayer/core/api/spacer';

// Get user's spaces
const userSpaces = await users.getMySpaces(
  'https://spacer.datalayer.run',
  'bearer-token-123'
);
console.log('Spaces:', userSpaces.spaces);

// Get space items
const spaceItems = await spaces.getSpaceItems(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'space-uid-123'
);
console.log('Items in space:', spaceItems.items);
```

#### Notebook Management

```typescript
import { notebooks } from '@datalayer/core/api/spacer';

// Create a notebook
const formData = new FormData();
formData.append('spaceId', 'space-uid-123');
formData.append('name', 'Data Analysis');
formData.append('notebookType', 'jupyter');
formData.append('description', 'Q4 data analysis');

const notebook = await notebooks.createNotebook(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  formData
);
console.log('Notebook created:', notebook.notebook.uid);

// Get notebook details
const notebookDetails = await notebooks.getNotebook(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'notebook-uid-456'
);
console.log('Name:', notebookDetails.notebook.name);
console.log('Content:', notebookDetails.notebook.content);

// Update notebook
const updated = await notebooks.updateNotebook(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'notebook-uid-456',
  {
    name: 'Updated Analysis',
    description: 'Q4 financial data analysis'
  }
);
```

#### Lexical Document Management

```typescript
import { lexicals } from '@datalayer/core/api/spacer';

// Create a lexical document
const lexicalFormData = new FormData();
lexicalFormData.append('spaceId', 'space-uid-123');
lexicalFormData.append('name', 'Project Documentation');
lexicalFormData.append('documentType', 'document');

const lexical = await lexicals.createLexical(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  lexicalFormData
);
console.log('Document created:', lexical.document.uid);

// Get document
const doc = await lexicals.getLexical(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'lexical-uid-789'
);
console.log('Content:', doc.document.content);

// Update document
const updatedDoc = await lexicals.updateLexical(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'lexical-uid-789',
  {
    name: 'Updated Documentation',
    content: { /* Lexical content */ }
  }
);
```

#### Item Deletion

```typescript
import { items } from '@datalayer/core/api/spacer';

// Delete any item (notebook or lexical document)
await items.deleteItem(
  'https://spacer.datalayer.run',
  'bearer-token-123',
  'item-uid-to-delete'
);
```

## SDK Client Usage

The SDK client provides a high-level, object-oriented interface for interacting with Datalayer services.

### Initialization

```typescript
import { DatalayerSDK } from '@datalayer/core/sdk';
import { DEFAULT_SERVICE_URLS } from '@datalayer/core/api/constants';

// Initialize with token
const sdk = new DatalayerSDK({
  token: 'bearer-token-123',
  iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
  runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
  spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER
});

// Initialize with external token
const sdkWithExternal = new DatalayerSDK({
  externalToken: 'github-token-123',
  iamRunUrl: 'https://id.datalayer.run',
  runtimesRunUrl: 'https://runtimes.datalayer.run',
  spacerRunUrl: 'https://spacer.datalayer.run'
});
```

### Authentication

```typescript
// Login with credentials
const loginResult = await sdk.login('user@example.com', 'password123');
console.log('Logged in as:', loginResult.user.email);

// Get current user profile
const profile = await sdk.getProfile();
console.log('User ID:', profile.uid);
console.log('Roles:', profile.roles);

// Update profile
const updated = await sdk.updateProfile({
  firstName: 'Jane',
  lastName: 'Smith'
});

// Logout
await sdk.logout();
```

### Runtime Management

```typescript
// List available environments
const environments = await sdk.listEnvironments();
environments.forEach(env => {
  console.log(`${env.name}: ${env.type}`);
  console.log('Resources:', env.resources);
});

// Create a runtime
const runtime = await sdk.createRuntime({
  environment_name: 'python-cpu-env',
  type: 'notebook',
  given_name: 'my-analysis',
  credits_limit: 50
});

console.log('Runtime created:', runtime.podName);
console.log('Jupyter URL:', runtime.jupyterUrl);

// Wait for runtime to be ready
await runtime.waitUntilReady(60000); // 60 seconds timeout
console.log('Runtime is ready!');

// Check runtime state
const state = await runtime.getState();
console.log('Current state:', state);

// Create a snapshot
const snapshot = await runtime.createSnapshot(
  'checkpoint-before-training',
  'Saving model state before training'
);
console.log('Snapshot created:', snapshot.uid);

// List all runtimes
const runtimes = await sdk.listRuntimes();
runtimes.forEach(r => {
  console.log(`${r.podName}: ${r.givenName} (${r.environmentName})`);
});

// Delete runtime
await sdk.deleteRuntime(runtime);
console.log('Runtime deleted');
```

### Notebook & Document Management

```typescript
// Get user's spaces
const spaces = await sdk.getMySpaces();
console.log('Available spaces:', spaces.length);

const mySpace = spaces[0];
console.log('Space:', mySpace.uid);

// Get items in space
const items = await mySpace.getItems();
console.log('Items in space:', items.length);

// Create a notebook
const notebook = await sdk.createNotebook({
  spaceId: mySpace.uid,
  notebookType: 'jupyter',
  name: 'Analysis Notebook',
  description: 'Data analysis for Q4'
});

console.log('Notebook created:', notebook.id);
console.log('Path:', notebook.path);

// Access notebook properties (static - no API call)
console.log('Notebook ID:', notebook.id);
console.log('UID:', notebook.uid);
console.log('Space ID:', notebook.spaceId);
console.log('Created:', notebook.createdAt);

// Get dynamic properties (fetches fresh data)
const name = await notebook.getName();
const content = await notebook.getContent();
const kernelSpec = await notebook.getKernelSpec();
const updatedAt = await notebook.getUpdatedAt();

console.log('Current name:', name);
console.log('Last updated:', updatedAt);

// Update notebook
const updatedNotebook = await notebook.update({
  name: 'Q4 Analysis - Final',
  description: 'Final analysis for Q4 2024'
});

// Create a lexical document
const document = await sdk.createLexical({
  spaceId: mySpace.uid,
  documentType: 'document',
  name: 'Project Notes',
  description: 'Implementation notes'
});

console.log('Document created:', document.id);

// Get document content
const docContent = await document.getContent();
console.log('Content:', docContent);

// Delete items
await notebook.delete();
await document.delete();
console.log('Items deleted');
```

### Model Classes

The SDK provides rich model classes that wrap API responses with convenient methods:

#### Runtime Model

```typescript
const runtime = await sdk.createRuntime({
  environment_name: 'python-gpu-env',
  type: 'notebook',
  given_name: 'ml-training'
});

// Static properties (no API calls)
console.log(runtime.podName);         // Unique pod identifier
console.log(runtime.environmentName); // Environment being used
console.log(runtime.jupyterUrl);      // Jupyter server URL
console.log(runtime.jupyterToken);    // Authentication token
console.log(runtime.burningRate);     // Credits per hour
console.log(runtime.givenName);       // User-friendly name
console.log(runtime.createdAt);       // Creation timestamp

// Dynamic methods (fetch fresh data)
const state = await runtime.getState();       // Current state
const isRunning = await runtime.isRunning();  // Check if running
const isStarting = await runtime.isStarting(); // Check if starting

// Actions
await runtime.waitUntilReady(30000);  // Wait for ready state
const snapshot = await runtime.createSnapshot('checkpoint', 'Before changes');
await runtime.delete();                // Delete runtime
```

#### Snapshot Model

```typescript
const snapshot = await runtime.createSnapshot('training-checkpoint', 'After epoch 10');

// Static properties
console.log(snapshot.uid);          // Unique identifier
console.log(snapshot.name);         // Snapshot name
console.log(snapshot.description);  // Description
console.log(snapshot.environment);  // Environment name
console.log(snapshot.format);       // Snapshot format
console.log(snapshot.metadata);     // Custom metadata
console.log(snapshot.updatedAt);    // Last update time

// Dynamic methods
const status = await snapshot.getStatus();     // Current status
const size = await snapshot.getSize();         // Size in bytes
const metadata = await snapshot.getLatestMetadata(); // Fresh metadata

// Actions
const newRuntime = await snapshot.restore({    // Create runtime from snapshot
  given_name: 'restored-runtime',
  credits_limit: 100
});
await snapshot.delete();                       // Delete snapshot
```

#### Notebook Model

```typescript
const notebook = await sdk.createNotebook({
  spaceId: 'space-uid',
  notebookType: 'jupyter',
  name: 'ML Experiments'
});

// Static properties (instant access, no API calls)
console.log(notebook.id);         // Notebook ID
console.log(notebook.uid);        // Unique identifier
console.log(notebook.path);       // File path
console.log(notebook.spaceId);    // Parent space
console.log(notebook.ownerId);    // Owner user ID
console.log(notebook.createdAt);  // Creation date
console.log(notebook.version);    // Version number
console.log(notebook.metadata);   // Metadata object

// Dynamic methods (fetch fresh data from API)
const name = await notebook.getName();           // Current name
const content = await notebook.getContent();     // Notebook content
const kernelSpec = await notebook.getKernelSpec(); // Kernel specification
const updatedAt = await notebook.getUpdatedAt(); // Last update time

// Actions
const updated = await notebook.update({
  name: 'ML Experiments - Final',
  description: 'Completed experiments'
});
await notebook.delete();  // Delete notebook

// After deletion, accessing properties will throw errors
try {
  await notebook.getName();
} catch (error) {
  console.log('Notebook has been deleted');
}
```

#### Lexical Model

```typescript
const document = await sdk.createLexical({
  spaceId: 'space-uid',
  documentType: 'document',
  name: 'Architecture Design'
});

// Static properties
console.log(document.id);        // Document ID
console.log(document.uid);       // Unique identifier
console.log(document.spaceId);   // Parent space
console.log(document.ownerId);   // Owner ID
console.log(document.createdAt); // Creation date

// Dynamic methods
const name = await document.getName();       // Current name
const content = await document.getContent(); // Document content
const updatedAt = await document.getUpdatedAt(); // Last update

// Actions
const updated = await document.update({
  name: 'Architecture Design v2',
  content: { /* Lexical content */ }
});
await document.delete();  // Delete document
```

#### Space Model

```typescript
const spaces = await sdk.getMySpaces();
const space = spaces[0];

// Static properties
console.log(space.uid);         // Space UID
console.log(space.handle);      // Space handle
console.log(space.variant);     // Space variant
console.log(space.visibility);  // Visibility setting
console.log(space.ownerId);     // Owner ID
console.log(space.createdAt);   // Creation date

// Dynamic methods
const name = await space.getName();               // Current name
const description = await space.getDescription(); // Description
const items = await space.getItems();            // Items in space
const updatedAt = await space.getUpdatedAt();    // Last update

// Get items with type checking
items.forEach(item => {
  if ('notebookType' in item) {
    console.log('Notebook:', item.name);
  } else if ('documentType' in item) {
    console.log('Document:', item.name);
  }
});
```

## Error Handling

Both the raw API and SDK client provide detailed error messages:

```typescript
// Raw API error handling
try {
  const runtime = await runtimes.createRuntime(token, config, url);
} catch (error) {
  if (error.message.includes('401')) {
    console.error('Authentication failed');
  } else if (error.message.includes('insufficient credits')) {
    console.error('Not enough credits');
  } else {
    console.error('Runtime creation failed:', error.message);
  }
}

// SDK error handling
try {
  const notebook = await sdk.createNotebook(config);
} catch (error) {
  console.error('Failed to create notebook:', error.message);
}

// Model deletion state
const runtime = await sdk.createRuntime(config);
await sdk.deleteRuntime(runtime);

// This will throw an error
try {
  await runtime.getState();
} catch (error) {
  console.log('Runtime has been deleted');
}
```

## Best Practices

1. **Use SDK for high-level operations**: The SDK provides better type safety and convenience methods.

2. **Use raw API for custom integrations**: When you need fine-grained control or are building your own abstraction.

3. **Handle deletion states**: Models track deletion state to prevent operations on deleted resources.

4. **Cache dynamic data**: The SDK models cache dynamic data for 5 seconds to reduce API calls.

5. **Wait for runtime readiness**: Always use `waitUntilReady()` after creating a runtime before performing operations.

6. **Clean up resources**: Always delete runtimes and snapshots when done to avoid charges.

7. **Use environment variables for configuration**:
   ```typescript
   const sdk = new DatalayerSDK({
     token: process.env.DATALAYER_API_KEY,
     iamRunUrl: process.env.DATALAYER_IAM_URL || DEFAULT_SERVICE_URLS.IAM,
     runtimesRunUrl: process.env.DATALAYER_RUNTIMES_URL || DEFAULT_SERVICE_URLS.RUNTIMES,
     spacerRunUrl: process.env.DATALAYER_SPACER_URL || DEFAULT_SERVICE_URLS.SPACER
   });
   ```

## Testing

For testing, you can use the provided test utilities:

```typescript
import { testConfig } from '@datalayer/core/__tests__/shared/test-config';
import { performCleanup } from '@datalayer/core/__tests__/shared/cleanup-shared';

// Check if tests should run
if (testConfig.hasToken()) {
  // Cleanup before tests
  await performCleanup('setup');

  // Run your tests
  const sdk = new DatalayerSDK({
    token: testConfig.getToken(),
    ...DEFAULT_SERVICE_URLS
  });

  // Cleanup after tests
  await performCleanup('teardown');
}

// Skip expensive tests if configured
if (!testConfig.shouldSkipExpensive()) {
  // Run expensive tests (runtime creation, etc.)
}
```
