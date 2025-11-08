# Unified Authentication Implementation Plan

## Overview
Implementation of unified authentication across CLI, Python SDK, TypeScript SDK, and VS Code extension.
Related to:
- https://github.com/datalayer/vscode-datalayer/issues/42
- https://github.com/datalayer/core/issues/169

## Phase 1: Python SDK (Core) - IN PROGRESS ✅

### Completed
- ✅ Created `datalayer_core/auth/` module
- ✅ Created `AuthManager` class with methods:
  - `login_with_browser()` - Browser-based OAuth
  - `login_with_credentials()` - Username/password
  - `login_with_token()` - Direct token validation
  - `get_stored_token()` - Multi-source token discovery
  - `store_token()` / `delete_token()` - Keyring management
  - `logout()` - Clear all authentication

### Token Discovery Priority
1. `DATALAYER_API_KEY` environment variable
2. `DATALAYER_EXTERNAL_TOKEN` environment variable
3. System keyring/keychain (service = run_url, account = "access_token")

### Next Steps for Python SDK
1. Integrate AuthManager into DatalayerClient
   - Add `auto_discover` parameter to __init__
   - Add `auth` property
   - Add `login_browser()`, `login_password()`, `login_token()`, `logout()` methods
2. Update CLI commands to use SDK methods (refactor existing code)
3. Write tests
4. Update documentation

## Phase 2: TypeScript SDK

### To Implement
- Create `src/auth/IAuthStorage.ts` interface
- Create `src/auth/AuthManager.ts` class
- Integrate into DatalayerClient
- Add browser OAuth flow (for web/electron environments)
- Export new auth methods

## Phase 3: VS Code Extension

### To Implement
- Create `VSCodeAuthStorage` (implements IAuthStorage)
- Create `KeyringAuthStorage` (read-only, discovers CLI tokens)
- Create `MultiAuthStorage` (cascading storage)
- Update `SDKAuthProvider` with:
  - Multi-source token discovery
  - Browser-based login (using vscode:// URI handler)
  - Username/password login
  - Enhanced login command with method picker
- Register vscode:// URI handler for OAuth callbacks
- Add `authStatus` command (like CLI whoami)

## Security Features
- ✅ Tokens stored in OS-level encrypted storage (keyring/keychain)
- ✅ VS Code SecretStorage (encrypted, cross-platform)
- ✅ Multi-source discovery with clear priority
- ✅ No tokens in logs
- ✅ OAuth with state parameter (CSRF protection)

## Cross-Tool Authentication Flow

### Scenario 1: CLI → VS Code
1. User runs `datalayer login` (browser flow)
2. Token stored in system keyring
3. User opens VS Code
4. VS Code extension discovers token from keyring
5. Migrates to VS Code SecretStorage
6. User is authenticated

### Scenario 2: VS Code → CLI
1. User logs in via VS Code (browser flow)
2. Token stored in VS Code SecretStorage (isolated)
3. User runs `datalayer whoami` in terminal
4. CLI does NOT see VS Code token (by design - different storage)
5. User can run `datalayer login` to store in keyring

### Scenario 3: Token Migration
1. VS Code checks keyring first on startup
2. If found, migrates to SecretStorage
3. Future authentications use SecretStorage
4. Keyring token remains for CLI use

## Files Created/Modified

### Python (Core Repo)
- ✅ `datalayer_core/auth/__init__.py`
- ✅ `datalayer_core/auth/manager.py`
- ⏳ `datalayer_core/client/client.py` (to be modified)
- ⏳ `datalayer_core/cli/commands/authn.py` (to be refactored)

### TypeScript (Core Repo - TS Package)
- ⏳ `packages/core/src/auth/IAuthStorage.ts`
- ⏳ `packages/core/src/auth/AuthManager.ts`
- ⏳ `packages/core/src/client/client.ts` (to be modified)

### VS Code Extension
- ⏳ `src/services/core/vscodeAuthStorage.ts`
- ⏳ `src/services/core/keyringAuthStorage.ts`
- ⏳ `src/services/core/multiAuthStorage.ts`
- ⏳ `src/services/core/authProvider.ts` (to be modified)
- ⏳ `src/commands/auth.ts` (to be modified)
- ⏳ `src/extension.ts` (register URI handler)

## Testing Strategy
1. Unit tests for AuthManager (Python & TypeScript)
2. Integration tests for token discovery
3. E2E tests for browser OAuth flow
4. Manual testing for cross-tool scenarios

## Documentation
- API documentation for new methods
- User guide for authentication options
- Architecture diagram
- Troubleshooting guide
