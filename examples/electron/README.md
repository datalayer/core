[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ⚡ Datalayer Electron Example

A native desktop application showcasing the Datalayer frontend SDK with Jupyter notebook integration.

- **Use Case**: Desktop-based data science environment with cloud compute
- **Technologies**: Electron, React, TypeScript, Datalayer SDK
- **Features**: Jupyter notebooks, runtime management, environment selection, real-time collaboration

This example demonstrates how to integrate the Datalayer frontend SDK into an Electron desktop application. It showcases notebook editing, runtime management, and environment selection using Datalayer's cloud infrastructure.

## Features

- **Jupyter Notebook Integration**: Full notebook editing capabilities with kernel management
- **Datalayer Services**: Integration with DatalayerServiceManager for cloud-based compute
- **Real-time Collaboration**: Enabled by default! Collaborative editing using DatalayerCollaborationProvider
- **Environment Management**: Browse and select from available computing environments
- **Runtime Management**: Create, start, stop, and manage cloud runtimes
- **Native Desktop Experience**: Menu bar integration, keyboard shortcuts, and native dialogs

## Prerequisites

- Node.js 18+ and npm
- Datalayer account with API credentials (optional, for cloud features)
- The main Datalayer Core library built (`npm run build:lib` in the root directory)

## Setup

1. **Install dependencies**:

   ```bash
   # From the electron example directory
   cd examples/electron
   npm install
   ```

2. **Configure environment variables** (optional, for Datalayer cloud features):

   ```bash
   # Copy the example environment file
   cp .env.example .env

   # Edit .env and add your Datalayer credentials:
   # DATALAYER_RUN_URL=https://prod1.datalayer.run
   # DATALAYER_TOKEN=your-api-token-here
   ```

3. **Build the main library** (if not already done):
   ```bash
   # From the root directory
   cd ../..
   npm run build:lib
   ```

## Development

Run the app in development mode with hot-reload:

```bash
npm run dev
```

This will:

- Start the Electron app with hot-reload enabled
- Open developer tools automatically
- Proxy API requests to Datalayer cloud services

## Building

### Type checking

```bash
npm run type-check
```

### Build for development

```bash
npm run build
```

## Packaging for Distribution

### Prerequisites for Packaging

1. **Build the application first**:

   ```bash
   npm run build
   ```

2. **Platform requirements**:
   - **macOS**: Xcode Command Line Tools
   - **Windows**: Windows build tools or Wine (if building from macOS/Linux)
   - **Linux**: dpkg, rpm, or snap (depending on target format)

### Platform-Specific Packaging

#### macOS (.dmg, .app)

```bash
npm run dist:mac
```

Creates:

- `.dmg` - Disk image installer (recommended for distribution)
- `.app` - Application bundle
- Output location: `dist-electron/`

#### Windows (.exe)

```bash
npm run dist:win
```

Creates:

- `.exe` - NSIS installer (recommended for distribution)
- Output location: `dist-electron/`

#### Linux (.AppImage)

```bash
npm run dist:linux
```

Creates:

- `.AppImage` - Universal Linux package (no installation required)
- Output location: `dist-electron/`

#### All Platforms (current platform only)

```bash
npm run dist
```

### Cross-Platform Building

**Building from macOS:**

- ✅ Can build: macOS, Linux
- ⚠️ Windows: Requires Wine (`brew install wine-stable`)

**Building from Windows:**

- ✅ Can build: Windows, Linux
- ❌ Cannot build: macOS (requires macOS hardware)

**Building from Linux:**

- ✅ Can build: Linux, Windows
- ❌ Cannot build: macOS (requires macOS hardware)

### Code Signing (Production)

For distributing outside of development:

#### macOS Code Signing

1. Get an Apple Developer Certificate
2. Set environment variables:
   ```bash
   export APPLE_ID="your-apple-id@email.com"
   export APPLE_ID_PASSWORD="your-app-specific-password"
   export APPLE_TEAM_ID="your-team-id"
   ```
3. The build process will automatically sign the app

#### Windows Code Signing

1. Get a code signing certificate
2. Configure in `package.json`:
   ```json
   "win": {
     "certificateFile": "path/to/certificate.pfx",
     "certificatePassword": "your-password"
   }
   ```

### Customizing the Build

Edit the `build` section in `package.json`:

```json
"build": {
  "appId": "io.datalayer.electron-example",
  "productName": "Datalayer Electron Example",
  "directories": {
    "output": "dist-electron"
  },
  "mac": {
    "category": "public.app-category.developer-tools"
  },
  "win": {
    "target": "nsis"  // or "portable" for no-install version
  },
  "linux": {
    "target": "AppImage"  // or "deb", "rpm", "snap"
  }
}
```

### Distribution Methods

1. **Direct Download**:
   - Upload to your website or GitHub Releases
   - Users download and install manually

2. **Auto-Updates** (add electron-updater):

   ```bash
   npm install electron-updater
   ```

   Configure auto-update server in your app

3. **App Stores**:
   - **Mac App Store**: Requires additional entitlements and sandbox configuration
   - **Microsoft Store**: Convert using Desktop Bridge
   - **Snap Store** (Linux): Build snap package

### Testing Packaged Applications

1. **Test the packaged app locally**:

   ```bash
   # macOS
   open dist-electron/*.app

   # Windows
   dist-electron\*.exe

   # Linux
   ./dist-electron/*.AppImage
   ```

2. **Verify all features work**:
   - Notebook loading and execution
   - Runtime management
   - Environment selection
   - Menu actions
   - Window management

The packaged applications will be in the `dist-electron` directory.

## Project Structure

```
examples/electron/
├── src/
│   ├── main/              # Electron main process
│   │   └── index.ts       # Main process entry, window management
│   ├── preload/           # Preload scripts for security
│   │   └── index.ts       # Context bridge for IPC
│   └── renderer/          # React application (renderer process)
│       ├── index.html     # HTML entry point
│       ├── main.tsx       # React app bootstrap
│       ├── App.tsx        # Main app component
│       ├── index.css      # Global styles
│       └── components/    # React components
│           ├── NotebookView.tsx      # Jupyter notebook interface
│           ├── EnvironmentsList.tsx  # Environment selection
│           └── RuntimeManager.tsx    # Runtime management UI
├── electron.vite.config.ts # Vite configuration for Electron
├── tsconfig.json          # TypeScript configuration
├── package.json           # Dependencies and scripts
└── README.md             # This file
```

## Key Components

### NotebookView

Demonstrates integration with Jupyter notebooks using:

- `DatalayerServiceManager` for kernel management
- `DatalayerCollaborationProvider` for real-time collaboration (enabled by default!)
- Full notebook editing capabilities with code execution
- **Important**: Uses notebook UIDs (not paths) for both collaboration and kernel sessions in Datalayer SaaS

### EnvironmentsList

Shows available computing environments:

- Python, R, Julia environments
- Package listings
- Environment activation

### RuntimeManager

Manages cloud compute runtimes:

- Create new runtimes with custom configurations
- Start, stop, restart, and delete runtimes
- Monitor resource usage

## Architecture

The application follows Electron's security best practices:

1. **Context Isolation**: Renderer process is isolated from Node.js
2. **Preload Scripts**: Secure bridge between main and renderer processes
3. **Content Security Policy**: Restricts script execution
4. **No Node Integration**: Renderer has no direct Node.js access

## API Integration

The app integrates with Datalayer's API for:

- Runtime creation and management (`/api/runtimes/v1/runtimes`)
- Kernel lifecycle management
- Real-time collaboration via WebSocket
- Collaboration session management (`/api/spacer/v1/documents/{notebook_uid}`)
  - Note: This endpoint works for notebooks, not just documents!
  - Uses notebook UIDs from the Datalayer workspace, not file paths

## Menu Actions

The app includes native menus for:

- **File**: New, Open, Save notebook
- **Edit**: Standard editing operations
- **Kernel**: Restart, Interrupt, Shutdown
- **View**: Zoom, Developer tools, Fullscreen
- **Help**: Documentation and links

## Troubleshooting

### App doesn't start

- Ensure all dependencies are installed: `npm install`
- Check Node.js version: `node --version` (should be 18+)
- Rebuild native modules: `npm run rebuild`

### Datalayer features not working

- Verify environment variables are set correctly
- Check network connectivity to Datalayer services
- Ensure your API token is valid

### Build failures

- Clear the build cache: `rm -rf dist dist-electron`
- Reinstall dependencies: `rm -rf node_modules && npm install`
- Check for TypeScript errors: `npm run typecheck`

## Resources

- [Datalayer Documentation](https://docs.datalayer.io)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Datalayer Core Repository](https://github.com/datalayer/core)

## License

This project is licensed under the BSD-3-Clause License - see the [LICENSE](../../../../LICENSE) file for details.

## Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Platform for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>
