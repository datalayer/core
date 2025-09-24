#!/bin/bash

# List of all types/interfaces from src/api/types
types=(
  # iam.ts
  "User"
  "LoginRequest"
  "LoginResponse"
  "MeUser"
  "UserMeResponse"
  "WhoAmIProfile"
  "WhoAmIResponse"
  "HealthzPingResponse"

  # spacer.ts
  "Space"
  "Notebook"
  "NotebookContent"
  "Cell"
  "CellOutput"
  "NotebookMetadata"
  "KernelSpec"
  "LanguageInfo"
  "CreateSpaceRequest"
  "CreateNotebookRequest"
  "UpdateNotebookRequest"
  "CloneNotebookRequest"
  "SpacesListParams"
  "NotebooksListParams"
  "SpaceItem"
  "Lexical"
  "CreateLexicalRequest"
  "UpdateLexicalRequest"
  "CreateCellRequest"
  "UpdateCellRequest"
  "SpacesListResponse"
  "NotebooksListResponse"

  # runtimes.ts
  "EnvironmentSnippet"
  "EnvironmentContent"
  "ResourceConfig"
  "ResourceRanges"
  "Environment"
  "Runtime"
  "RuntimeStatus"
  "CreateRuntimeRequest"
  "RuntimeSnapshot"
  "RuntimeSnapshotFile"
  "CreateRuntimeSnapshotRequest"
  "SnapshotGetResponse"
  "SnapshotCreateResponse"
  "RuntimesListParams"
  "RuntimeSnapshotsListParams"
  "EnvironmentsListResponse"
  "CreateRuntimeResponse"
  "EnvironmentNotFoundResponse"
  "NoRuntimeAvailableResponse"
  "RuntimesListResponse"
  "SnapshotsListResponse"
)

echo "Checking usage of types in src/api/types..."
echo "============================================"

for type in "${types[@]}"; do
  # Search for imports and usage, excluding the type definition file itself
  # Look in src/api directory and tests
  count=$(grep -r "\b$type\b" src/api --include="*.ts" --include="*.tsx" --exclude-dir=types 2>/dev/null | grep -v "^Binary" | wc -l)

  if [ "$count" -eq 0 ]; then
    echo "❌ UNUSED: $type"
  else
    echo "✅ USED: $type (found $count references)"
  fi
done