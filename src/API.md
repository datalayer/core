# Datalayer Core SDK Documentation

## Overview

The Datalayer Core SDK provides a comprehensive TypeScript/JavaScript interface for interacting with the Datalayer platform services.

**Key Features:**

- **Type safety**: Full TypeScript support with comprehensive interfaces
- **Service flexibility**: Configure different URLs for each service
- **Mixin architecture**: Composable functionality through TypeScript mixins
- **Token management**: Built-in authentication token handling

## Installation

```bash
npm install @datalayer/core
```

## Quick Start

```typescript
import { DatalayerSDK } from '@datalayer/core';

// Initialize the SDK - uses default service URLs
const sdk = new DatalayerSDK({
  token: 'your-api-token',
});

// Or specify individual service URLs for advanced configurations
const sdkAdvanced = new DatalayerSDK({
  token: 'your-api-token',
  iamRunUrl: 'https://iam.company.com',
  runtimesRunUrl: 'https://runtimes.company.com',
  spacerRunUrl: 'https://spacer.company.com',
});

const user = await sdk.whoami();
const environments = await sdk.listEnvironments();
const notebook = await sdk.createNotebook({
  space_id: 'space-123',
  name: 'My Analysis',
});
```

## Service URLs Configuration

The Datalayer SDK supports configuring different URLs for each service, allowing for flexible deployment architectures:

### Default Configuration

By default, all services use `https://prod1.datalayer.run`:

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  // Uses defaults:
  // iamRunUrl: 'https://prod1.datalayer.run'
  // runtimesRunUrl: 'https://prod1.datalayer.run'
  // spacerRunUrl: 'https://prod1.datalayer.run'
});
```

### Custom Service URLs

For enterprise deployments or development environments, you can specify different URLs for each service:

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  iamRunUrl: 'https://auth.company.com', // Identity & Access Management
  runtimesRunUrl: 'https://compute.company.com', // Computational environments
  spacerRunUrl: 'https://workspace.company.com', // Workspaces & collaboration
});
```

### When to Use Custom URLs

- **Enterprise deployments**: When services are deployed separately
- **Development environments**: When testing against different service versions
- **Multi-region setups**: When services are distributed across regions
- **Security requirements**: When different services have different access controls

## API Reference

### Configuration Methods

```typescript
// Initialize SDK with default service URLs
const sdk = new DatalayerSDK({
  token: 'your-api-token',
});

// Initialize SDK with custom service URLs
const customSdk = new DatalayerSDK({
  token: 'your-api-token',
  iamRunUrl: 'https://auth-service.company.com',
  runtimesRunUrl: 'https://compute-service.company.com',
  spacerRunUrl: 'https://workspace-service.company.com',
});

// Get current configuration
const config = sdk.getConfig();
console.log('IAM URL:', config.iamRunUrl);
console.log('Runtimes URL:', config.runtimesRunUrl);
console.log('Spacer URL:', config.spacerRunUrl);

// Update token
sdk.updateToken('new-token-123');

// Update configuration (note: service URLs are immutable after initialization)
sdk.updateConfig({
  token: 'new-token',
});
```

### Authentication Methods

```typescript
// Get current user profile
const user = await sdk.whoami();
console.log('Logged in as:', user.email);

// Login with handle and password
const loginResponse = await sdk.login({
  handle: 'user@example.com',
  password: 'secure-password',
});

// Or login with token
const tokenResponse = await sdk.login({
  token: 'existing-auth-token',
});

// Update SDK with new token
sdk.updateToken(loginResponse.token);

// Logout current user
await sdk.logout();
```

### Environment Methods

```typescript
// List available compute environments
const environments = await sdk.listEnvironments();
```

### Runtime Methods

```typescript
// Create a new computational runtime
const runtime = await sdk.createRuntime({
  environment_name: 'python-cpu-small',
  credits_limit: 100,
});

// List all runtimes
const runtimes = await sdk.listRuntimes();

// Get specific runtime details
const runtimeDetails = await sdk.getRuntime(runtime.pod_name);

// Delete runtime
await sdk.deleteRuntime(runtime.pod_name);
```

### Workspace Methods

```typescript
// Create a new workspace
const space = await sdk.createSpace({
  name: 'ML Research',
  description: 'Machine learning research workspace',
  visibility: 'private',
});

// List all workspaces
const spaces = await sdk.listSpaces();

// Get workspace details
const spaceDetails = await sdk.getSpace(space.id);

// Delete workspace
await sdk.deleteSpace(space.id);
```

### Notebook Methods

```typescript
// Create a new notebook
const notebook = await sdk.createNotebook({
  space_id: space.id,
  name: 'Data Analysis.ipynb',
});

// List notebooks (all or filtered by space)
const allNotebooks = await sdk.listNotebooks();
const spaceNotebooks = await sdk.listNotebooks(space.id);

// Get notebook details
const notebookDetails = await sdk.getNotebook(notebook.id);

// Get notebook by UID (useful for collaboration)
const notebookByUid = await sdk.getNotebookByUid(notebook.uid);

// Update notebook metadata
const updatedNotebook = await sdk.updateNotebook(notebook.id, {
  name: 'Updated Analysis.ipynb',
});

// Clone existing notebook
const clonedNotebook = await sdk.cloneNotebook({
  source_id: notebook.id,
  name: 'Analysis Copy.ipynb',
  space_id: space.id,
});

// Get notebook content (Jupyter format)
const content = await sdk.getNotebookContent(notebook.id);

// Update notebook content
await sdk.updateNotebookContent(notebook.id, {
  cells: [
    {
      cell_type: 'code',
      source: 'print("Hello, World!")',
      metadata: {},
    },
  ],
  metadata: {},
  nbformat: 4,
  nbformat_minor: 5,
});

// Delete notebook
await sdk.deleteNotebook(notebook.id);
```

### Cell Methods

```typescript
// Create a new cell
const cell = await sdk.createCell(notebook.id, {
  cell_type: 'code',
  source: 'import pandas as pd\ndf = pd.read_csv("data.csv")',
  metadata: {},
});

// Get cell details
const cellDetails = await sdk.getCell(notebook.id, cell.id);

// Delete cell
await sdk.deleteCell(notebook.id, cell.id);
```

## Complete Workflow Example

```typescript
import { DatalayerSDK } from '@datalayer/core';

async function createAnalysisWorkspace() {
  // Initialize SDK with default service URLs
  const sdk = new DatalayerSDK({
    token: process.env.DATALAYER_TOKEN,
  });

  try {
    // Authenticate and get user info
    const user = await sdk.whoami();
    console.log(`Setting up workspace for ${user.email}`);

    // Create workspace
    const space = await sdk.createSpace({
      name: 'Data Analysis Project',
      description: 'Customer behavior analysis workspace',
    });

    // Create notebook
    const notebook = await sdk.createNotebook({
      space_id: space.id,
      name: 'Customer Analysis.ipynb',
    });

    // Add initial cells
    await sdk.createCell(notebook.id, {
      cell_type: 'markdown',
      source:
        '# Customer Behavior Analysis\n\nThis notebook analyzes customer behavior patterns.',
    });

    await sdk.createCell(notebook.id, {
      cell_type: 'code',
      source:
        'import pandas as pd\nimport numpy as np\nimport matplotlib.pyplot as plt',
    });

    // Create runtime for execution
    const runtime = await sdk.createRuntime({
      environment_name: 'python-cpu-small',
      credits_limit: 100,
    });

    console.log('Workspace setup complete!');
    console.log('Space ID:', space.id);
    console.log('Notebook ID:', notebook.id);
    console.log('Runtime:', runtime.pod_name);

    return { space, notebook, runtime };
  } catch (error) {
    console.error('Setup failed:', error.message);
    throw error;
  }
}

// Usage
createAnalysisWorkspace()
  .then(({ space, notebook, runtime }) => {
    console.log('Ready to start analysis!');
  })
  .catch(console.error);
```

## Error Handling

```typescript
try {
  const user = await sdk.whoami();
  console.log('User:', user.email);
} catch (error) {
  if (error.message.includes('Authentication token required')) {
    console.error('Please provide a valid token');
  } else {
    console.error('API error:', error.message);
  }
}

// More comprehensive error handling
try {
  const runtime = await sdk.createRuntime({
    environment_name: 'python-cpu-small',
    credits_limit: 100,
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Authentication failed:', error.message);
  } else if (error.status === 403) {
    console.error('Permission denied:', error.message);
  } else if (error.status === 429) {
    console.error('Rate limited:', error.message);
  } else if (error.code === 'TIMEOUT') {
    console.error('Request timeout');
  } else {
    console.error('API error:', error);
  }
}
```

## TypeScript Support

The SDK provides comprehensive TypeScript support with full type definitions:

```typescript
import type {
  User,
  Space,
  Notebook,
  Runtime,
  Environment,
  DatalayerSDKConfig,
} from '@datalayer/core';

// Type-safe configuration with default URLs
const config: DatalayerSDKConfig = {
  token: 'your-token',
};

// Type-safe configuration with custom service URLs
const customConfig: DatalayerSDKConfig = {
  token: 'your-token',
  iamRunUrl: 'https://auth.company.com',
  runtimesRunUrl: 'https://compute.company.com',
  spacerRunUrl: 'https://workspace.company.com',
};

const sdk = new DatalayerSDK(config);

// All methods return properly typed responses
const user: User = await sdk.whoami();
const environments: Environment[] = await sdk.listEnvironments();
const runtime: Runtime = await sdk.createRuntime({
  environment_name: 'python-cpu-small',
  credits_limit: 100,
});
```

## Architecture

### Design Principles

1. **Flat API**: All methods directly accessible for maximum discoverability
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Intuitive Naming**: Descriptive method names that clearly indicate their purpose
4. **Consistent**: Uniform patterns across all APIs
5. **Mixin Architecture**: Composable functionality through TypeScript mixins
6. **Single Import**: Everything available from one import statement

### Directory Structure

```
src/sdk/
├── client/
│   ├── base.ts                 # Base SDK class with core functionality
│   ├── index.ts                # Main flat SDK export
│   ├── mixins/
│   │   ├── IAMMixin.ts         # Authentication & user management
│   │   ├── RuntimesMixin.ts    # Environments & runtimes
│   │   └── SpacerMixin.ts      # Workspaces, notebooks & cells
│   └── utils/
│       └── mixins.ts           # TypeScript mixin utilities
├── stateful/                   # Stateful components (advanced)
└── index.ts                    # SDK module entry point
```

### Mixin Architecture

The SDK uses TypeScript mixins to compose functionality:

```typescript
// Base class provides core functionality
class DatalayerSDKBase {
  constructor(config: DatalayerSDKConfig) {
    /* ... */
  }
  getConfig() {
    /* ... */
  }
  updateToken(token: string) {
    /* ... */
  }
}

// Mixins add domain-specific methods
const IAMMixin = Base =>
  class extends Base {
    async whoami() {
      /* ... */
    }
    async login(credentials) {
      /* ... */
    }
    async logout() {
      /* ... */
    }
  };

const RuntimesMixin = Base =>
  class extends Base {
    async listEnvironments() {
      /* ... */
    }
    async createRuntime(config) {
      /* ... */
    }
    // ...
  };

const SpacerMixin = Base =>
  class extends Base {
    async createSpace(data) {
      /* ... */
    }
    async createNotebook(data) {
      /* ... */
    }
    // ...
  };

// Final SDK class combines all mixins
const DatalayerSDKWithMixins = SpacerMixin(
  RuntimesMixin(IAMMixin(DatalayerSDKBase)),
);

export class DatalayerSDK extends DatalayerSDKWithMixins {
  constructor(config: DatalayerSDKConfig) {
    super(config);
  }
}
```

## Authentication

### Bearer Token

```typescript
import { DatalayerSDK } from '@datalayer/core';

// Using default service URLs
const sdk = new DatalayerSDK({
  token: 'your-bearer-token',
});

// Using custom service URLs
const customSdk = new DatalayerSDK({
  token: 'your-bearer-token',
  iamRunUrl: 'https://auth.company.com',
  runtimesRunUrl: 'https://compute.company.com',
  spacerRunUrl: 'https://workspace.company.com',
});
```

### Username/Password Login

```typescript
// Initialize without token for login
const sdk = new DatalayerSDK({});

const loginResponse = await sdk.login({
  email: 'user@example.com',
  password: 'password',
});

// Update SDK with new token
sdk.updateToken(loginResponse.token);
```

### Environment Variables

```typescript
// Using environment variables for configuration
const sdk = new DatalayerSDK({
  token: process.env.DATALAYER_TOKEN,
  iamRunUrl: process.env.DATALAYER_IAM_URL,
  runtimesRunUrl: process.env.DATALAYER_RUNTIMES_URL,
  spacerRunUrl: process.env.DATALAYER_SPACER_URL,
});

// Or just token with default URLs
const simpleSDK = new DatalayerSDK({
  token: process.env.DATALAYER_TOKEN,
});
```

## Request Configuration

### Timeouts

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  timeout: 60000, // 60 seconds
});
```

### Custom Headers

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

## Advanced Usage

### Batch Operations

```typescript
// Create multiple notebooks in parallel
async function createMultipleNotebooks(sdk, spaceId, names) {
  const notebooks = await Promise.all(
    names.map(name =>
      sdk.createNotebook({
        space_id: spaceId,
        name: `${name}.ipynb`,
      }),
    ),
  );
  return notebooks;
}

// Clean up all runtimes
async function cleanupRuntimes(sdk) {
  const runtimes = await sdk.listRuntimes();
  await Promise.all(
    runtimes.map(runtime => sdk.deleteRuntime(runtime.pod_name)),
  );
}
```

### Configuration Management

```typescript
class DatalayerManager {
  private sdk: DatalayerSDK;

  constructor(environment: 'production' | 'staging' = 'production') {
    const config = {
      production: {
        baseUrl: 'https://prod1.datalayer.run',
        token: process.env.DATALAYER_PROD_TOKEN,
      },
      staging: {
        baseUrl: 'https://staging.datalayer.run',
        token: process.env.DATALAYER_STAGING_TOKEN,
      },
    };

    this.sdk = new DatalayerSDK(config[environment]);
  }

  async createWorkspace(name: string) {
    // Authenticate first
    const user = await this.sdk.whoami();

    // Create space
    const space = await this.sdk.createSpace({
      name: `${user.username}-${name}`,
      description: `Workspace for ${user.email}`,
    });

    return space;
  }
}

// Usage
const manager = new DatalayerManager('production');
const workspace = await manager.createWorkspace('ml-experiments');
```

## API Endpoints Reference

### Base URLs

- Production: `https://prod1.datalayer.run`

### Service Endpoints

The SDK abstracts the following REST API endpoints:

#### IAM Service (`/api/iam/v1`)

- `GET /me` - Get current user (`sdk.whoami()`)
- `POST /login` - User login (`sdk.login()`)
- `POST /logout` - User logout (`sdk.logout()`)

#### Runtimes Service (`/api/runtimes/v1`)

- `GET /environments` - List environments (`sdk.listEnvironments()`)
- `GET /environments/{name}` - Get environment (`sdk.getEnvironment()`)
- `POST /runtimes` - Create runtime (`sdk.createRuntime()`)
- `GET /runtimes` - List runtimes (`sdk.listRuntimes()`)
- `GET /runtimes/{pod_name}` - Get runtime (`sdk.getRuntime()`)
- `DELETE /runtimes/{pod_name}` - Delete runtime (`sdk.deleteRuntime()`)

#### Spacer Service (`/api/spacer/v1`)

- `GET /spaces` - List spaces (`sdk.listSpaces()`)
- `POST /spaces` - Create space (`sdk.createSpace()`)
- `GET /spaces/{id}` - Get space (`sdk.getSpace()`)
- `DELETE /spaces/{id}` - Delete space (`sdk.deleteSpace()`)
- `GET /notebooks` - List notebooks (`sdk.listNotebooks()`)
- `POST /notebooks` - Create notebook (`sdk.createNotebook()`)
- `GET /notebooks/{id}` - Get notebook (`sdk.getNotebook()`)
- `GET /notebooks/uid/{uid}` - Get notebook by UID (`sdk.getNotebookByUid()`)
- `PUT /notebooks/{id}` - Update notebook (`sdk.updateNotebook()`)
- `POST /notebooks/clone` - Clone notebook (`sdk.cloneNotebook()`)
- `GET /notebooks/{id}/content` - Get content (`sdk.getNotebookContent()`)
- `PUT /notebooks/{id}/content` - Update content (`sdk.updateNotebookContent()`)
- `DELETE /notebooks/{id}` - Delete notebook (`sdk.deleteNotebook()`)
- `POST /notebooks/{id}/cells` - Create cell (`sdk.createCell()`)
- `GET /notebooks/{id}/cells/{cell_id}` - Get cell (`sdk.getCell()`)
- `DELETE /notebooks/{id}/cells/{cell_id}` - Delete cell (`sdk.deleteCell()`)

## Best Practices

### Resource Management

```typescript
// Always clean up resources
async function runAnalysis() {
  const sdk = new DatalayerSDK({ token: process.env.DATALAYER_TOKEN });

  let runtime;
  try {
    // Create runtime
    runtime = await sdk.createRuntime({
      environment_name: 'python-cpu-small',
      credits_limit: 100,
    });

    // Do analysis work...
  } finally {
    // Always clean up
    if (runtime) {
      await sdk.deleteRuntime(runtime.pod_name);
    }
  }
}
```

### Error Resilience

```typescript
async function robustOperation(sdk, operation, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      console.log(`Attempt ${attempt} failed, retrying...`);
    }
  }
}

// Usage
const runtime = await robustOperation(sdk, () =>
  sdk.createRuntime({
    environment_name: 'python-cpu-small',
    credits_limit: 100,
  }),
);
```

### Type Guards

```typescript
import type { User, Space, Notebook } from '@datalayer/core';

function isUser(obj: any): obj is User {
  return obj && typeof obj.email === 'string';
}

function isSpace(obj: any): obj is Space {
  return obj && typeof obj.id === 'string' && typeof obj.name === 'string';
}

// Usage with type safety
const response = await sdk.whoami();
if (isUser(response)) {
  console.log('User email:', response.email); // TypeScript knows this is a User
}
```
