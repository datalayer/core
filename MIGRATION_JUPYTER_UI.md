# Migration of Datalayer-specific Code from @jupyter-ui to @core

## Migration Status: ✅ COMPLETED

This document tracks the migration of all Datalayer-specific functionality from the `@datalayer/jupyter-react` package to the `@datalayer/core` package. The goal was to make `jupyter-ui` completely generic without any hardcoded Datalayer-specific functionality.

## Overview

- **Date Completed**: January 2025
- **Packages Affected**:
  - `@datalayer/jupyter-react` (source)
  - `@datalayer/core` (destination)
- **Dependency Direction**: `@datalayer/core` depends on `@datalayer/jupyter-react` (one-way)

## What Was Migrated

### 1. State Management

**Migrated to**: `/core/src/state/`

- ✅ `DatalayerState.ts` - Separate Zustand store for Datalayer state

### 2. Configuration Files

**Location**: `/core/src/config/`

- ✅ `DatalayerRuntimeConfig.ts` (formerly `DatalayerConfig.ts`) - Runtime/platform connection settings

  - Contains `IDatalayerConfig` interface for Datalayer platform integration
  - Defines connection parameters: `runUrl`, `token`, `credits`, `cpuEnvironment`, `gpuEnvironment`
  - Used for connecting to Datalayer platform services

- ✅ `DatalayerAppConfig.ts` (formerly `Configuration.ts`) - Application-wide settings
  - Contains `IDatalayerCoreConfig` for app configuration
  - Defines API endpoints, feature flags, UI customization
  - Used for controlling application behavior and appearance

**Note**: Files were renamed for clarity:

- `DatalayerConfig.ts` → `DatalayerRuntimeConfig.ts` (runtime/connection settings)
- `Configuration.ts` → `DatalayerAppConfig.ts` (application settings)

### 3. Services

**Migrated to**: `/core/src/services/`

- ✅ `DatalayerServiceManager.ts` - Service manager for Datalayer platform
  - Moved from `/core/src/jupyter/services/` for better organization
  - Creates service managers connected to Datalayer infrastructure

### 4. Collaboration

**Migrated to**: `/core/src/collaboration/`

- ✅ `DatalayerCollaboration.ts` - Datalayer-specific collaboration session handling
  - Contains `requestDatalayerCollaborationSessionId` function
- ✅ `DatalayerCollaborationProvider.ts` - Collaboration provider implementation
  - Moved from nested structure for cleaner organization

### 5. Examples

**Migrated to**: `/core/src/examples/`

- ✅ `NotebookMutationsKernel.tsx` - Example using Datalayer kernels
- ✅ `NotebookMutationsServiceManager.tsx` - Example using Datalayer service manager
- ✅ Updated imports to use local Datalayer modules from core

## Changes in @jupyter-ui

### Components Renamed (Made Generic)

- `CodeMirrorDatalayerEditor` → `CodeMirrorEditor`
- `DatalayerNotebookExtension` → `NotebookExtension`
- `IDatalayerNotebookExtensionProps` → `INotebookExtensionProps`

### State Management Cleaned

- ✅ Removed `datalayerConfig` from `JupyterReactState`
- ✅ Removed `setDatalayerConfig` method
- ✅ Commented out Datalayer initialization code

### Collaboration Updated

- ✅ Made `ICollaborationProvider` type generic (`string | undefined`)
- ✅ Added error messages for Datalayer collaboration attempts
- ✅ Updated `Notebook.tsx` and `Notebook2Base.tsx` to throw errors when Datalayer collaboration is attempted

### Configuration Cleaned

- ✅ Deprecated `loadDatalayerConfig` function in `JupyterConfig.ts`
- ✅ Added migration comments pointing to `@datalayer/core`

### Exports Cleaned

- ✅ Removed export of `providers` module (now empty)
- ✅ Removed export of `kernels` module (migrated to core)

## Breaking Changes (Latest Updates - January 2025)

### Recent Changes from Refactoring

1. **Removed APIs from @jupyter-ui**:

   - `ICollaborationProviderConfig` interface no longer exists
   - `registerCollaborationProvider` function removed (factory pattern eliminated)
   - `CollaborationProviderFactory` class removed
   - Direct instantiation pattern now used for all providers

2. **Updated DatalayerCollaborationProvider**:
   - No longer extends `ICollaborationProviderConfig`
   - Removed `type` field from configuration
   - Direct instantiation only (no factory registration)

### For users upgrading from previous versions:

1. **Import Changes**: All Datalayer-specific imports must now come from `@datalayer/core`:

   ```typescript
   // Before
   import { createDatalayerServiceManager } from '@datalayer/jupyter-react';

   // After
   import { createDatalayerServiceManager } from '@datalayer/core';
   ```

2. **State Management**: Use separate stores for Datalayer state:

   ```typescript
   // Before
   import { useJupyterReactStore } from '@datalayer/jupyter-react';
   const datalayerConfig = useJupyterReactStore(state => state.datalayerConfig);

   // After
   import { useDatalayerStore } from '@datalayer/core';
   const datalayerConfig = useDatalayerStore(state => state.datalayerConfig);
   ```

3. **Collaboration**: Use the provider-based system with direct instantiation:

   ```typescript
   // Option 1: Use DatalayerNotebook from @core
   import { DatalayerNotebook } from '@datalayer/core';
   <DatalayerNotebook enableCollaboration={true} />

   // Option 2: Use base Notebook with explicit provider instance
   import { Notebook } from '@datalayer/jupyter-react';
   import { JupyterCollaborationProvider } from '@datalayer/jupyter-react';

   const provider = new JupyterCollaborationProvider({
     path: 'notebook.ipynb'
   });
   <Notebook collaborationProvider={provider} />

   // Option 3: For Datalayer collaboration
   import { DatalayerCollaborationProvider } from '@datalayer/core';

   const provider = new DatalayerCollaborationProvider();
   <Notebook collaborationProvider={provider} />
   ```

## New Collaboration Provider Architecture

The refactoring introduces a composable, plugin-based collaboration system with direct instantiation:

### Key Components

1. **ICollaborationProvider Interface**: Abstract interface for all providers
2. **Direct Instantiation**: Providers are instantiated directly
3. **Built-in Providers**:
   - `JupyterCollaborationProvider`: For Jupyter server collaboration
   - `NoOpCollaborationProvider`: For non-collaborative mode
   - `DatalayerCollaborationProvider`: In @core for Datalayer collaboration

### Usage Examples

```typescript
// Using DatalayerNotebook (composition pattern)
import { DatalayerNotebook } from '@datalayer/core';

<DatalayerNotebook
  id="my-notebook"
  enableCollaboration={true}
  path="/notebooks/example.ipynb"
/>

// Creating custom collaboration provider
class CustomCollaborationProvider extends CollaborationProviderBase {
  async connect(sharedModel, documentId, options) {
    // Custom connection logic
  }
}

// Using custom provider (direct instantiation)
const customProvider = new CustomCollaborationProvider({ /* config */ });
<Notebook collaborationProvider={customProvider} />

// Using built-in providers
const jupyterProvider = new JupyterCollaborationProvider();
const noOpProvider = new NoOpCollaborationProvider();

<Notebook collaborationProvider={jupyterProvider} path="notebook.ipynb" />
```

## Architecture Benefits

1. **Clean Separation**: Generic Jupyter functionality in `jupyter-ui`, platform-specific in `core`
2. **One-way Dependency**: Core depends on jupyter-ui, not vice versa
3. **Composition over Inheritance**: DatalayerNotebook wraps Notebook, doesn't extend it
4. **Direct Instantiation**: Simplified API with direct provider instantiation
5. **Type Safety**: Full TypeScript support for provider configuration
6. **Maintainability**: Easier to maintain and update each package independently
7. **Reusability**: Other platforms can use jupyter-ui without Datalayer dependencies
8. **Simplicity**: Clean, straightforward provider pattern

## Testing Checklist

- [x] Build passes for both packages
- [x] TypeScript compilation successful
- [x] Linting passes
- [x] Format check passes
- [x] Examples migrated and functional
- [x] No circular dependencies
- [x] Documentation updated

## Recent Reorganization (January 2025)

### Cleaner Structure at src/ Level

Since `@datalayer/core` is Datalayer-specific and won't support other platforms, the code has been reorganized with a flatter structure:

1. **Collaboration** (`/core/src/collaboration/`)

   - Moved from `src/jupyter/collaboration/` and `src/providers/collaboration/`
   - Contains all collaboration-related code in one place

2. **Services** (`/core/src/services/`)

   - Moved from `src/jupyter/services/`
   - Contains service managers and API integrations

3. **Configuration Naming**
   - `DatalayerConfig.ts` → `DatalayerRuntimeConfig.ts` (clearer purpose)
   - `Configuration.ts` → `DatalayerAppConfig.ts` (clearer scope)

This reorganization makes the codebase easier to navigate and maintain.

## Future Considerations

- Consider publishing `@datalayer/jupyter-react` as a truly generic package
- Document the composition pattern for other platforms to follow
- Create migration guide for external users
