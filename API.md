# Datalayer Core - DatalayerClient Documentation

This document provides comprehensive examples for using the DatalayerClient SDK.

## Table of Contents

- [Getting Started](#getting-started)
  - [Installation](#installation)
  - [Initialization](#initialization)
  - [Handlers Pattern](#handlers-pattern)
- [Authentication](#authentication)
- [Runtime Management](#runtime-management)
- [Notebook & Document Management](#notebook--document-management)
- [Model Classes](#model-classes)
  - [Runtime Model](#runtime-model)
  - [Snapshot Model](#snapshot-model)
  - [Notebook Model](#notebook-model)
  - [Lexical Model](#lexical-model)
  - [Space Model](#space-model)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Testing](#testing)

## Getting Started

### Installation

```bash
npm install @datalayer/core
```

### Initialization

The DatalayerClient provides a high-level, object-oriented interface for interacting with Datalayer services.

#### Key Features

- **Flat API**: All methods directly on `client.` (e.g., `client.createNotebook()`)
- **Handlers Pattern**: Inject platform-specific behavior without wrapping SDK methods
- **Rich Models**: Returns model instances with methods, not just plain objects
- **Type Safety**: Full TypeScript support with proper interfaces

#### Basic Initialization

```typescript
import { DatalayerClient } from '@datalayer/core/client';
import { DEFAULT_SERVICE_URLS } from '@datalayer/core/api/constants';

// Basic initialization with token
const client = new DatalayerClient({
  token: 'bearer-token-123',
  iamRunUrl: DEFAULT_SERVICE_URLS.IAM,
  runtimesRunUrl: DEFAULT_SERVICE_URLS.RUNTIMES,
  spacerRunUrl: DEFAULT_SERVICE_URLS.SPACER
});

// Quick initialization with defaults
const client = new DatalayerClient({
  token: 'bearer-token-123'
});
```

### Handlers Pattern

Initialize with lifecycle handlers for cross-cutting concerns:

```typescript
// Initialize with handlers for logging and error handling
const client = new DatalayerClient({
  token: 'bearer-token-123',
  iamRunUrl: 'https://prod1.datalayer.run',
  handlers: {
    // Called before every SDK method
    beforeCall: async (methodName, args) => {
      console.log(`[Client] Calling ${methodName}`, args);
    },
    // Called after successful method execution
    afterCall: async (methodName, result) => {
      console.log(`[Client] ${methodName} completed`);
      // Track analytics, update UI, etc.
    },
    // Called when a method throws an error
    onError: async (methodName, error) => {
      console.error(`[Client] ${methodName} failed:`, error);

      // Platform-specific error handling
      if (error.message.includes('Not authenticated')) {
        // Show login prompt in your platform's UI
        // e.g., vscode.window.showErrorMessage(...)
        // or showAuthModal() in React
      }
    }
  }
});

// Initialize for VS Code extension with platform-specific handlers
const vscodeClient = new DatalayerClient({
  token: 'bearer-token-123',
  handlers: {
    onError: async (methodName, error) => {
      // VS Code specific error handling
      const vscode = require('vscode');
      vscode.window.showErrorMessage(`Datalayer: ${error.message}`);
    }
  }
});

// Initialize for React app with UI handlers
const reactClient = new DatalayerClient({
  token: 'bearer-token-123',
  handlers: {
    onError: async (methodName, error) => {
      // React specific error handling
      toast.error(`Error: ${error.message}`);
    },
    beforeCall: async (methodName, args) => {
      setLoading(true);
    },
    afterCall: async (methodName, result) => {
      setLoading(false);
    }
  }
});
```

## Authentication

```typescript
// Get current user profile (whoami)
const user = await client.whoami();
console.log('User ID:', user.uid);
console.log('Email:', user.email);
console.log('Roles:', user.roles);

// Login with token
await client.login('new-bearer-token');

// Get credits information
const credits = await client.getCredits();
console.log('Available credits:', credits.balance);

// Check IAM service health
const health = await client.checkIAMHealth();
console.log('IAM service status:', health.status);

// Logout
await client.logout();
```

## Runtime Management

```typescript
// List available environments
const environments = await client.listEnvironments();
environments.forEach(env => {
  console.log(`${env.name}: ${env.type}`);
  console.log('Resources:', env.resources);
});

// Ensure runtime (creates or reuses existing)
const runtime = await client.ensureRuntime(
  'python-cpu-env',  // environment name
  50,                // credits limit
  true,              // wait for ready
  60000,             // max wait time (ms)
  true,              // reuse existing
  'snapshot-id'      // optional snapshot to restore from
);

console.log('Runtime ready:', runtime.podName);
console.log('Jupyter URL:', runtime.jupyterUrl);

// Create a specific runtime
const newRuntime = await client.createRuntime(
  'python-gpu-env',     // environment name
  'notebook',           // type
  'ml-training-gpu',    // given name
  100                   // credits limit
);

// Wait for runtime to be ready
await newRuntime.waitUntilReady(60000); // 60 seconds timeout
console.log('Runtime is ready!');

// Check runtime state
const state = await newRuntime.getState();
console.log('Current state:', state);

// Create a snapshot
const snapshot = await client.createSnapshot(
  newRuntime.podName,
  'checkpoint-before-training',
  'Saving model state before training',
  false  // don't stop runtime after snapshot
);
console.log('Snapshot created:', snapshot.uid);

// List all runtimes
const runtimes = await client.listRuntimes();
runtimes.forEach(r => {
  console.log(`${r.podName}: ${r.givenName} (${r.environmentName})`);
});

// Get specific runtime
const specificRuntime = await client.getRuntime('pod-name-123');
console.log('Runtime details:', specificRuntime.givenName);

// List snapshots
const snapshots = await client.listSnapshots();
snapshots.forEach(s => {
  console.log(`${s.name}: ${s.description} (${s.status})`);
});

// Get specific snapshot
const specificSnapshot = await client.getSnapshot('snapshot-id-123');
console.log('Snapshot size:', await specificSnapshot.getSize());

// Delete resources
await client.deleteRuntime(runtime.podName);
await client.deleteSnapshot(snapshot.uid);
console.log('Resources cleaned up');

// Check runtimes service health
const runtimesHealth = await client.checkRuntimesHealth();
console.log('Runtimes service status:', runtimesHealth.status);
```

## Notebook & Document Management

```typescript
// Get user's spaces
const spaces = await client.getMySpaces();
console.log('Available spaces:', spaces.length);

const mySpace = spaces[0];
console.log('Space:', mySpace.uid);

// Get items in space
const items = await client.getSpaceItems(mySpace.uid);
console.log('Items in space:', items.length);

// Create a space
const newSpace = await client.createSpace(
  'Analysis Workspace',    // name
  'Data analysis workspace', // description
  'workspace',             // variant
  'analysis-ws',           // space handle
  'org-id-123',           // organization ID
  '',                     // seed space ID
  false                   // is public
);

// Create a notebook
const notebook = await client.createNotebook(
  mySpace.uid,              // space ID
  'Analysis Notebook',      // name
  'Data analysis for Q4'    // description
  // optional: file (File | Blob)
);

console.log('Notebook created:', notebook.id);
console.log('Path:', notebook.path);

// Get notebook details
const notebookDetails = await client.getNotebook(notebook.id);
console.log('Notebook UID:', notebookDetails.uid);

// Update notebook
const updatedNotebook = await client.updateNotebook(
  notebook.id,
  'Q4 Analysis - Final',           // new name
  'Final analysis for Q4 2024'     // new description
);

// Get notebook content
const content = await client.getNotebookContent(notebook.id, {
  includeOutputs: true,
  format: 'json'
});
console.log('Notebook cells:', content.cells.length);

// Create a lexical document
const document = await client.createLexical(
  mySpace.uid,            // space ID
  'Project Notes',        // name
  'Implementation notes'  // description
  // optional: file (File | Blob)
);

console.log('Document created:', document.id);

// Get lexical document
const lexicalDetails = await client.getLexical(document.id);

// Update lexical document
const updatedDocument = await client.updateLexical(
  document.id,
  'Project Notes v2',     // new name
  'Updated notes'         // new description
);

// Get lexical content
const lexicalContent = await client.getLexicalContent(document.id, {
  format: 'json'
});
console.log('Document content:', lexicalContent);

// Prefetch content for multiple items (caching)
const itemIds = [notebook.id, document.id];
await client.prefetchContent(itemIds, 'notebook');
await client.prefetchContent([document.id], 'lexical');

// Clear content cache
await client.clearContentCache(notebook.id, 'notebook');
await client.clearContentCache(); // clear all cache

// Delete items
await client.deleteSpaceItem(notebook.id);
await client.deleteSpaceItem(document.id);
console.log('Items deleted');

// Check spacer service health
const spacerHealth = await client.checkSpacerHealth();
console.log('Spacer service status:', spacerHealth.status);
```

## Model Classes

The DatalayerClient provides rich model classes that wrap API responses with convenient methods:

### Runtime Model

```typescript
const runtime = await client.createRuntime(
  'python-gpu-env',
  'notebook',
  'ml-training',
  100
);

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

### Snapshot Model

```typescript
const snapshot = await client.createSnapshot(
  runtime.podName,
  'training-checkpoint',
  'After epoch 10'
);

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

### Notebook Model

```typescript
const notebook = await client.createNotebook(
  'space-uid',
  'ML Experiments',
  'Machine learning experiments notebook'
);

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

### Lexical Model

```typescript
const document = await client.createLexical(
  'space-uid',
  'Architecture Design',
  'System architecture documentation'
);

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

### Space Model

```typescript
const spaces = await client.getMySpaces();
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

The DatalayerClient provides detailed error messages with proper error handling:

```typescript
// Basic error handling
try {
  const notebook = await client.createNotebook(
    'space-id',
    'My Notebook',
    'Description'
  );
} catch (error) {
  console.error('Failed to create notebook:', error.message);
}

// Handle authentication errors
try {
  const user = await client.whoami();
} catch (error) {
  if (error.message.includes('401') || error.message.includes('Not authenticated')) {
    console.error('Authentication failed - please check your token');
    // Trigger re-authentication in your app
  } else {
    console.error('API error:', error.message);
  }
}

// Handle insufficient credits
try {
  const runtime = await client.createRuntime('python-gpu-env', 'notebook', 'test', 1000);
} catch (error) {
  if (error.message.includes('insufficient credits')) {
    console.error('Not enough credits to create runtime');
  } else if (error.message.includes('quota exceeded')) {
    console.error('Runtime quota exceeded');
  } else {
    console.error('Runtime creation failed:', error.message);
  }
}

// Model deletion state
const runtime = await client.createRuntime('python-cpu-env', 'notebook', 'test', 10);
await client.deleteRuntime(runtime.podName);

// This will throw an error
try {
  await runtime.getState();
} catch (error) {
  console.log('Runtime has been deleted');
}

// Using handlers for global error handling
const client = new DatalayerClient({
  token: 'your-token',
  handlers: {
    onError: async (methodName, error) => {
      // Global error handling
      if (error.message.includes('401')) {
        console.log('Authentication required');
        // Handle auth globally
      } else if (error.message.includes('429')) {
        console.log('Rate limited - retrying...');
        // Handle rate limiting
      } else {
        console.error(`Global error in ${methodName}:`, error.message);
      }
    }
  }
});
```

## Best Practices

1. **Use handlers for cross-cutting concerns**: Implement logging, error handling, and UI updates through the handlers pattern rather than wrapping SDK methods.

2. **Handle deletion states**: Models track deletion state to prevent operations on deleted resources.

3. **Cache dynamic data**: The SDK models cache dynamic data for 5 seconds to reduce API calls.

4. **Wait for runtime readiness**: Always use `waitUntilReady()` after creating a runtime before performing operations:
   ```typescript
   const runtime = await client.createRuntime('python-cpu-env', 'notebook', 'analysis', 50);
   await runtime.waitUntilReady(60000); // Wait up to 60 seconds
   // Now safe to use runtime
   ```

5. **Reuse runtimes when possible**: Use `ensureRuntime()` instead of `createRuntime()` to reuse existing runtimes and save credits:
   ```typescript
   const runtime = await client.ensureRuntime(
     'python-cpu-env',
     50,    // credits limit
     true,  // wait for ready
     60000, // max wait time
     true   // reuse existing
   );
   ```

6. **Clean up resources**: Always delete runtimes and snapshots when done to avoid charges:
   ```typescript
   try {
     // Use runtime for work
     const runtime = await client.createRuntime(...);
     // ... do work ...
   } finally {
     // Always clean up
     await client.deleteRuntime(runtime.podName);
   }
   ```

7. **Use environment variables for configuration**:
   ```typescript
   const client = new DatalayerClient({
     token: process.env.DATALAYER_TOKEN,
     iamRunUrl: process.env.DATALAYER_IAM_URL || DEFAULT_SERVICE_URLS.IAM,
     runtimesRunUrl: process.env.DATALAYER_RUNTIMES_URL || DEFAULT_SERVICE_URLS.RUNTIMES,
     spacerRunUrl: process.env.DATALAYER_SPACER_URL || DEFAULT_SERVICE_URLS.SPACER
   });
   ```

8. **Prefetch content for better performance**:
   ```typescript
   // Prefetch multiple items to reduce individual API calls
   const notebookIds = ['nb1', 'nb2', 'nb3'];
   await client.prefetchContent(notebookIds, 'notebook');

   // Now accessing content is much faster
   for (const id of notebookIds) {
     const content = await client.getNotebookContent(id);
   }
   ```

9. **Use appropriate service health checks**:
   ```typescript
   // Check service health before critical operations
   const iamHealth = await client.checkIAMHealth();
   const runtimesHealth = await client.checkRuntimesHealth();
   const spacerHealth = await client.checkSpacerHealth();

   if (iamHealth.status === 'healthy' && runtimesHealth.status === 'healthy') {
     // Safe to proceed with runtime operations
   }
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
  const client = new DatalayerClient({
    token: testConfig.getToken(),
    ...DEFAULT_SERVICE_URLS
  });

  // Your test code here
  const user = await client.whoami();
  expect(user.uid).toBeDefined();

  // Cleanup after tests
  await performCleanup('teardown');
}

// Skip expensive tests if configured
if (!testConfig.shouldSkipExpensive()) {
  // Run expensive tests (runtime creation, etc.)
  const runtime = await client.createRuntime('python-cpu-env', 'notebook', 'test', 10);
  await client.deleteRuntime(runtime.podName);
}
```

## Configuration Options

The DatalayerClient accepts these configuration options:

```typescript
export interface DatalayerClientConfig {
  /** Authentication token for API requests */
  token?: string;
  /** URL for the IAM service */
  iamRunUrl?: string;
  /** URL for the Runtimes service */
  runtimesRunUrl?: string;
  /** URL for the Spacer service */
  spacerRunUrl?: string;
  /** Platform-specific storage implementation */
  storage?: PlatformStorage;
  /** Enable caching for API responses */
  cacheEnabled?: boolean;
  /** Enable offline mode */
  offlineMode?: boolean;
  /** Handlers for intercepting SDK method calls */
  handlers?: SDKHandlers;
}
```

Example with all options:

```typescript
import { BrowserStorage } from '@datalayer/core/client/storage';

const client = new DatalayerClient({
  token: 'your-token',
  iamRunUrl: 'https://custom-iam.example.com',
  runtimesRunUrl: 'https://custom-runtimes.example.com',
  spacerRunUrl: 'https://custom-spacer.example.com',
  storage: new BrowserStorage(),
  cacheEnabled: true,
  offlineMode: false,
  handlers: {
    beforeCall: async (methodName, args) => {
      console.log(`Calling ${methodName}`, args);
    },
    afterCall: async (methodName, result) => {
      console.log(`${methodName} completed`);
    },
    onError: async (methodName, error) => {
      console.error(`${methodName} failed:`, error);
    }
  }
});
```
