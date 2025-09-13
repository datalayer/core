# Migration Guide: Barrel Exports to Subpath Imports

## Overview

We've removed barrel exports (`export *`) from `@datalayer/core` to improve bundle size, build performance, and tree-shaking effectiveness. This change requires updating how you import from the package.

## Why This Change?

Previously, importing anything from `@datalayer/core` would load the entire module tree, resulting in:
- Larger bundle sizes (everything gets included)
- Slower builds (all files must be processed)
- Poor tree-shaking (harder for bundlers to eliminate dead code)
- Slower HMR (hot module replacement affects more modules)

## Migration Steps

### 1. Update Your Imports

Replace barrel imports with specific subpath imports:

#### Hooks
```typescript
// OLD
import { useUser, useCache, useToast } from '@datalayer/core';

// NEW
import { useUser, useCache, useToast } from '@datalayer/core/hooks';
```

#### State Management
```typescript
// OLD
import { useCoreStore, useIAMStore, useRuntimesStore } from '@datalayer/core';

// NEW
import { useCoreStore, useIAMStore, useRuntimesStore } from '@datalayer/core/state';
```

#### Utilities
```typescript
// OLD
import { formatDate, downloadFile } from '@datalayer/core';

// NEW
import { formatDate, downloadFile } from '@datalayer/core/utils';
```

#### Models/Types
```typescript
// OLD
import { IUser, INotebook, IRuntimeModel } from '@datalayer/core';

// NEW
import { IUser, INotebook, IRuntimeModel } from '@datalayer/core/models';
```

### 2. Available Subpath Exports

The following subpaths are now available:

- `@datalayer/core/hooks` - React hooks (useUser, useCache, etc.)
- `@datalayer/core/state` - State management (stores)
- `@datalayer/core/utils` - Utility functions
- `@datalayer/core/models` - TypeScript types and interfaces
- `@datalayer/core/api` - API client and functions
- `@datalayer/core/api/runtimes` - Runtime-specific API functions
- `@datalayer/core/api/runtimes/actions` - Runtime action functions
- `@datalayer/core/services` - Service managers (includes createDatalayerServiceManager, reconnectToRuntime)
- `@datalayer/core/collaboration` - Collaboration providers (includes DatalayerCollaborationProvider)
- `@datalayer/core/navigation/nextjs` - Next.js navigation hooks
- `@datalayer/core/navigation/react-router` - React Router navigation hooks
- `@datalayer/core/navigation/native` - Native browser navigation utilities
- `@datalayer/core/navigation/components` - Navigation components (Link, NavLink)
- `@datalayer/core/theme` - Theme providers and utilities
- `@datalayer/core/config` - Configuration utilities
- `@datalayer/core/i18n` - Internationalization
- `@datalayer/core/routes` - Route definitions
- `@datalayer/core/mocks` - Testing mocks
- `@datalayer/core/components/*` - UI components (various subdirectories)

### 3. Common Import Patterns

Here are the most common imports and their new locations:

```typescript
// State stores
import { useCoreStore, useIAMStore, useRuntimesStore } from '@datalayer/core/state';

// Common hooks
import { useUser, useCache, useToast, useNavigate } from '@datalayer/core/hooks';

// API functions
import { deleteRuntime, getEnvironments } from '@datalayer/core/api/runtimes/actions';

// Services
import { createDatalayerServiceManager, reconnectToRuntime } from '@datalayer/core/services';

// Collaboration
import { DatalayerCollaborationProvider } from '@datalayer/core/collaboration';

// Navigation - Next.js specific
import { useRouter, useParams, usePathname, useSearchParams } from '@datalayer/core/navigation/nextjs';

// Navigation - React Router specific
import { useNavigate, useLocation, useParams } from '@datalayer/core/navigation/react-router';

// Navigation - Native browser
import { createAdapter, createNavigate } from '@datalayer/core/navigation/native';

// Navigation - Components
import { Link, NavLink, NavigationLink } from '@datalayer/core/navigation/components';

// Types/Models
import { IUser, INotebook, IRuntimeModel } from '@datalayer/core/models';
```

### 4. TypeScript Configuration

No changes to your `tsconfig.json` are required. The package includes proper TypeScript definitions for all subpath exports.

### 5. Benefits After Migration

After updating your imports, you'll see:
- **50-80% reduction in bundle size** for typical applications
- **Faster build times** as only required modules are processed
- **Better tree-shaking** with unused code properly eliminated
- **Faster HMR** as changes only affect specific modules

## Troubleshooting

### Import Not Found

If you get an error like `Module not found: Error: Can't resolve '@datalayer/core/...'`, check:

1. You're using the correct subpath (see list above)
2. You've updated to the latest version of `@datalayer/core`
3. Clear your node_modules and reinstall: `rm -rf node_modules && npm install`

### TypeScript Errors

If TypeScript can't find types:

1. Restart your TypeScript server (in VS Code: Cmd+Shift+P → "TypeScript: Restart TS Server")
2. Clear TypeScript cache: `rm -rf node_modules/.cache/typescript`

### Build Errors

If your build fails:

1. Clear build cache: `rm -rf .next` (for Next.js) or `rm -rf dist` (for Vite)
2. Ensure all imports have been updated (search for `from '@datalayer/core'` in your codebase)

## Need Help?

If you encounter issues during migration, please open an issue at: https://github.com/datalayer/core/issues