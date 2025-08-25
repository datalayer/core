# Electron Security Notes

## Content Security Policy (CSP) Warning

During development, you'll see a warning about Content Security Policy:
```
Electron Security Warning (Insecure Content-Security-Policy)
```

This is **expected and normal** during development because:

1. **Development Mode**: Vite and other dev tools require `'unsafe-eval'` for hot module replacement (HMR) and dev features
2. **The warning only appears in development**: It won't show in packaged production apps
3. **Production builds have strict CSP**: The app applies a strict CSP policy in production mode

## Security Features Implemented

✅ **Context Isolation**: Enabled to isolate renderer process from Node.js
✅ **Node Integration**: Disabled in renderer for security
✅ **Web Security**: Enabled to enforce same-origin policy
✅ **Secure IPC**: All API calls go through a secure preload bridge
✅ **Domain Whitelisting**: Only allowed domains can be accessed
✅ **Encrypted Storage**: Credentials stored with encryption

## Production CSP Policy

In production, the app enforces:
- No `unsafe-eval` in scripts
- Only self-hosted scripts allowed
- API connections limited to Datalayer domains
- No inline scripts (except styles with `unsafe-inline` for UI libraries)

## Development vs Production

| Feature | Development | Production |
|---------|------------|------------|
| CSP Warning | Shows | Hidden |
| unsafe-eval | Allowed (for HMR) | Blocked |
| DevTools | Open | Closed |
| Debug Logs | Enabled | Disabled |

The security warning is a helpful reminder but doesn't indicate a problem during development.