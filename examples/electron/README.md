# Datalayer Electron Example

This example demonstrates how to integrate the Datalayer frontend SDK into an Electron desktop application. It showcases notebook editing, runtime management, and environment selection using Datalayer's cloud infrastructure.

## Features

- **Jupyter Notebook Integration**: Full notebook editing capabilities with kernel management
- **Datalayer Services**: Integration with DatalayerServiceManager for cloud-based compute
- **Real-time Collaboration**: Optional collaborative editing using DatalayerCollaborationProvider
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
npm run typecheck
```

### Build for development

```bash
npm run build
```

### Build and package for distribution

```bash
# For all platforms
npm run dist

# Platform-specific builds
npm run dist:mac    # macOS
npm run dist:win    # Windows
npm run dist:linux  # Linux
```

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
- `DatalayerCollaborationProvider` for real-time collaboration
- Full notebook editing capabilities with code execution

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

BSD-3-Clause
