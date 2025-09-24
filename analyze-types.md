# Type Usage Analysis for src/api/types

## Summary
After analyzing the types in `/src/api/types`, here are the findings:

## ✅ USED Types (directly imported or used in API functions)

### iam.ts
- `User` - Used in SDK mixin
- `LoginRequest` - Used in authentication.ts
- `LoginResponse` - Used in authentication.ts
- `UserMeResponse` - Used in profile.ts
- `WhoAmIResponse` - Used in profile.ts
- `HealthzPingResponse` - Used in healthz.ts

### spacer.ts
- `Space` - Used in SDK mixin
- `Notebook` - Used in SDK mixin
- `Cell` - Used in cells.ts
- `Lexical` - Used in SDK mixin
- `CreateSpaceRequest` - Used in SDK mixin
- `CreateNotebookRequest` - Used in SDK mixin
- `UpdateNotebookRequest` - Used in SDK mixin
- `CloneNotebookRequest` - Used in SDK mixin
- `SpacesListParams` - Used in SDK mixin
- `NotebooksListParams` - Used in SDK mixin
- `SpacesListResponse` - Used in SDK mixin
- `NotebooksListResponse` - Used in SDK mixin

### runtimes.ts
- `Environment` - Used in SDK mixin
- `Runtime` - Used in runtimes.ts and SDK mixin
- `CreateRuntimeRequest` - Used in runtimes.ts
- `CreateRuntimeResponse` - Used in runtimes.ts
- `CreateRuntimeSnapshotRequest` - Used in snapshots.ts
- `SnapshotGetResponse` - Used in snapshots.ts
- `SnapshotCreateResponse` - Used in snapshots.ts
- `EnvironmentsListResponse` - Used in environments.ts
- `RuntimesListResponse` - Used in runtimes.ts
- `SnapshotsListResponse` - Used in snapshots.ts

## ❌ POTENTIALLY UNUSED Types (need careful review)

### iam.ts
- `MeUser` - Component of UserMeResponse, but not directly used
- `WhoAmIProfile` - Component of WhoAmIResponse, but not directly used

### spacer.ts
- `NotebookContent` - May be part of Notebook structure
- `CellOutput` - May be part of Cell structure
- `NotebookMetadata` - May be part of Notebook structure
- `KernelSpec` - May be part of NotebookMetadata
- `LanguageInfo` - May be part of NotebookMetadata
- `SpaceItem` - May be used in list responses
- `CreateLexicalRequest` - Not found in current API implementations
- `UpdateLexicalRequest` - Not found in current API implementations
- `CreateCellRequest` - Not found in current API implementations
- `UpdateCellRequest` - Not found in current API implementations

### runtimes.ts
- `EnvironmentSnippet` - Component of Environment
- `EnvironmentContent` - Component of Environment
- `ResourceConfig` - Component of Environment
- `ResourceRanges` - Component of Environment
- `RuntimeStatus` - Component of Runtime
- `RuntimeSnapshot` - Used in response types (SnapshotGetResponse, SnapshotCreateResponse, SnapshotsListResponse)
- `RuntimeSnapshotFile` - Component of RuntimeSnapshot
- `RuntimesListParams` - Query params type (not found in implementations)
- `RuntimeSnapshotsListParams` - Query params type (not found in implementations)
- `EnvironmentNotFoundResponse` - Error response type (may be needed for error handling)
- `NoRuntimeAvailableResponse` - Error response type (may be needed for error handling)

## 🔍 Types that are dependencies of used types (KEEP)

These types are not directly imported but are used as components of other types:
- `MeUser` → used in `UserMeResponse`
- `WhoAmIProfile` → used in `WhoAmIResponse`
- `RuntimeSnapshot` → used in `SnapshotGetResponse`, `SnapshotCreateResponse`, `SnapshotsListResponse`
- `RuntimeSnapshotFile` → used in `RuntimeSnapshot`
- `EnvironmentSnippet`, `EnvironmentContent`, `ResourceConfig`, `ResourceRanges` → used in `Environment`
- `RuntimeStatus` → used in `Runtime`

## 🗑️ Candidates for REMOVAL

These types appear to be truly unused and not referenced anywhere:

### spacer.ts
1. **`CreateLexicalRequest`** - No implementation found
2. **`UpdateLexicalRequest`** - No implementation found
3. **`CreateCellRequest`** - No implementation found
4. **`UpdateCellRequest`** - No implementation found
5. **`SpaceItem`** - Not referenced in any response types

### runtimes.ts
6. **`RuntimesListParams`** - Query params not used (list function doesn't take params)
7. **`RuntimeSnapshotsListParams`** - Query params not used (list function doesn't take params)
8. **`EnvironmentNotFoundResponse`** - Error response type not used (generic error handling is used)
9. **`NoRuntimeAvailableResponse`** - Error response type not used (generic error handling is used)

### spacer.ts (need verification)
10. **`NotebookContent`** - May not be needed if Notebook type doesn't reference it
11. **`CellOutput`** - May not be needed if Cell type doesn't reference it
12. **`NotebookMetadata`** - May not be needed if Notebook type doesn't reference it
13. **`KernelSpec`** - May not be needed if NotebookMetadata doesn't reference it
14. **`LanguageInfo`** - May not be needed if NotebookMetadata doesn't reference it

## Recommendation

1. **Immediately remove** types 1-9 as they are clearly unused
2. **Investigate** types 10-14 to see if they're actually used within the Notebook/Cell structures
3. **Keep all other types** as they're either directly used or serve as components of used types