[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# ⚡ Datalayer Desktop

A native desktop application showcasing the Datalayer frontend SDK with Jupyter notebook and document integration.

- **Use Case**: Desktop-based data science environment with cloud compute
- **Technologies**: Electron, React, TypeScript, Datalayer SDK, Jupyter
- **Features**: Jupyter notebooks, Lexical documents, runtime management, environment selection, real-time collaboration
- **Status**: ✅ Production builds working! Universal binaries for all Mac processors!

This application demonstrates how to integrate the Datalayer frontend SDK into an Electron desktop application. It showcases notebook editing, document creation, runtime management, and environment selection using Datalayer's cloud infrastructure.

## 🚀 Quick Start

```bash
# Clone and setup
git clone https://github.com/datalayer/core.git
cd core/examples/electron
npm install

# Run in development (recommended)
npm start

# Build and package for production
npm run build
npm run dist:mac           # For macOS (works on Intel & Apple Silicon)
npm run dist:win           # For Windows
npm run dist:linux         # For Linux
```

The packaged app will be in `dist-electron/` directory.

## ✨ Features

### Core Functionality
- **Jupyter Notebook Integration**: Full notebook editing capabilities with kernel management
- **Lexical Document Editor**: Rich text document editing with Jupyter code execution support
- **Datalayer Services**: Integration with DatalayerServiceManager for cloud-based compute
- **Real-time Collaboration**: Enabled by default! Collaborative editing using DatalayerCollaborationProvider
- **Environment Management**: Browse and select from available computing environments
- **Runtime Management**: Create, start, stop, and manage cloud runtimes with termination confirmation
- **Native Desktop Experience**: Menu bar integration, keyboard shortcuts, and native dialogs

### User Interface
- **Modern Light Theme**: Clean, professional light gray navigation with Datalayer green accents
- **Responsive Design**: Optimized for desktop with proper scrollbar management
- **Atomic Component Architecture**: Modular, reusable components following atomic design principles
- **Accessibility**: Full keyboard navigation, ARIA labels, and screen reader support
- **User Profile Integration**: GitHub user profile with avatar display

### Security & Performance
- **Production Security**: DevTools disabled in production builds with secure context isolation
- **Development Flexibility**: DevTools enabled in dev mode, optional in dev-prod builds for testing
- **WebSocket Cleanup**: Multi-layer cleanup system prevents connection errors after runtime termination
- **Optimized Data Fetching**: Hash-based change detection for efficient updates
- **Auto-refresh**: 60-second intervals with intelligent data synchronization

## 📋 Prerequisites

- Node.js 18+ and npm
- Datalayer account with API credentials (optional, for cloud features)
- The main Datalayer Core library built (`npm run build:lib` in the root directory)

## 🛠️ Setup

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

## 💻 Development

### Quick Start

```bash
npm start  # or npm run dev
```

This will:
- Start the Electron app with hot-reload enabled
- Open developer tools automatically
- Proxy API requests to Datalayer cloud services
- Handle CJS/ESM module resolution dynamically

> **Note**: Development mode (`npm start`) is recommended as it handles module resolution better than production builds.

### Available Scripts

```bash
# Development
npm start           # Start the app in development mode (DevTools enabled)
npm run dev         # Same as npm start

# Code Quality
npm run check       # Run all checks (format, lint, type-check)
npm run check:fix   # Fix all auto-fixable issues
npm run format      # Format code with Prettier
npm run format:check # Check code formatting
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint issues
npm run type-check  # Check TypeScript types

# Building
npm run build       # Build for production

# Production builds with DevTools control
npm run dist:mac             # Production build (DevTools disabled)
npm run dist:dev-prod:mac    # Dev-prod build (DevTools enabled for testing)
npm run dist:win             # Windows production build
npm run dist:linux           # Linux production build
```

### Code Quality Tools

The project uses `/run-checks` command to ensure code quality:
- **Prettier**: Automatic code formatting
- **ESLint**: Code linting with React/TypeScript rules
- **TypeScript**: Strict type checking
- **Build Verification**: Ensures the project builds successfully

## 📁 Project Structure

```
examples/electron/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── index.ts             # Main process entry, window management, IPC handlers
│   │   ├── about.html           # About dialog HTML
│   │   ├── about.js             # About dialog renderer script
│   │   └── services/            # Main process services
│   │       ├── api-service.ts   # API proxy service with GitHub integration
│   │       └── websocket-proxy.ts # WebSocket proxy for kernels with cleanup
│   │
│   ├── preload/                 # Preload scripts for security
│   │   ├── index.ts             # Main context bridge for IPC
│   │   └── about.js             # About dialog secure preload script
│   │
│   ├── renderer/                # React application (renderer process)
│   │   ├── index.html           # HTML entry point
│   │   ├── main.tsx             # React app bootstrap with polyfills
│   │   ├── App.tsx              # Main app component (refactored to atomic components)
│   │   ├── index.css            # Global styles with Datalayer theme
│   │   │
│   │   ├── components/          # Atomic React components
│   │   │   ├── app/             # Application-level components
│   │   │   │   ├── Header.tsx   # Main navigation header
│   │   │   │   ├── Layout.tsx   # App layout wrapper
│   │   │   │   ├── LoadingScreen.tsx # App loading state
│   │   │   │   ├── NavigationTab.tsx # Individual nav tab
│   │   │   │   ├── NavigationTabs.tsx # Navigation container
│   │   │   │   └── UserMenu.tsx # User profile dropdown
│   │   │   │
│   │   │   ├── document/        # Document editor components
│   │   │   │   ├── EditorInitPlugin.tsx # Lexical editor initialization
│   │   │   │   ├── Header.tsx   # Document header
│   │   │   │   ├── LexicalEditor.tsx # Main editor component
│   │   │   │   └── LoadingSpinner.tsx # Loading state
│   │   │   │
│   │   │   ├── environments/    # Environment management components
│   │   │   │   ├── AuthWarning.tsx # Authentication warning
│   │   │   │   ├── Card.tsx     # Environment card
│   │   │   │   ├── Description.tsx # Environment description
│   │   │   │   ├── EmptyState.tsx # No environments state
│   │   │   │   ├── ErrorState.tsx # Error display
│   │   │   │   ├── Icon.tsx     # Environment icon
│   │   │   │   ├── LoadingSpinner.tsx # Loading state
│   │   │   │   ├── Packages.tsx # Package list display
│   │   │   │   ├── Resources.tsx # Resource display
│   │   │   │   ├── SelectionSummary.tsx # Selected env summary
│   │   │   │   └── TypeLabel.tsx # Environment type label
│   │   │   │
│   │   │   ├── library/         # Library (documents list) components
│   │   │   │   ├── DeleteConfirmationDialog.tsx # Delete confirmation
│   │   │   │   ├── ErrorMessage.tsx # Error/warning display
│   │   │   │   ├── Header.tsx   # Library header with space selector
│   │   │   │   ├── LibraryItem.tsx # Individual library item
│   │   │   │   ├── LibrarySection.tsx # Section container
│   │   │   │   ├── LoadingSpinner.tsx # Loading state
│   │   │   │   └── SkeletonItem.tsx # Skeleton loading placeholder
│   │   │   │
│   │   │   ├── login/           # Login components
│   │   │   │   ├── Button.tsx   # Login button
│   │   │   │   ├── ErrorMessage.tsx # Error display
│   │   │   │   ├── Footer.tsx   # Login footer
│   │   │   │   ├── Form.tsx     # Login form
│   │   │   │   ├── Header.tsx   # Login header
│   │   │   │   └── Version.tsx  # Version display
│   │   │   │
│   │   │   ├── notebook/        # Notebook components
│   │   │   │   ├── Content.tsx  # Notebook content wrapper
│   │   │   │   ├── ErrorBoundary.tsx # Error handling
│   │   │   │   ├── Header.tsx   # Notebook header
│   │   │   │   └── LoadingSpinner.tsx # Loading state
│   │   │   │
│   │   │   ├── LoadingSpinner.tsx # Global loading spinner
│   │   │   └── TerminateRuntimeDialog.tsx # Runtime termination dialog
│   │   │
│   │   ├── hooks/               # Custom React hooks
│   │   │   ├── useCollaboration.ts # Collaboration hook
│   │   │   ├── useDatalayerAPI.ts # API integration hook
│   │   │   ├── useNotebookContent.ts # Notebook content hook
│   │   │   ├── usePreload.ts    # Preload bridge hook
│   │   │   └── useRuntimeManagement.ts # Runtime management hook
│   │   │
│   │   ├── pages/               # Page components (orchestrating logic)
│   │   │   ├── DocumentEditor.tsx # Document editing page
│   │   │   ├── Environments.tsx # Environment selection page
│   │   │   ├── Library.tsx      # Documents library page
│   │   │   ├── Login.tsx        # Authentication page
│   │   │   └── NotebookEditor.tsx # Notebook editing page
│   │   │
│   │   ├── polyfills/           # Critical polyfills for production
│   │   │   ├── index.ts         # Polyfill loader
│   │   │   ├── jupyterlab-proxy.js # JupyterLab services proxy
│   │   │   ├── lodash-globals.js # Lodash global assignments
│   │   │   ├── lodash-internals.js # Lodash internal structures
│   │   │   ├── lodash-numbered.js # Lodash numbered variations
│   │   │   ├── nodejs-builtins.js # Node.js built-in polyfills
│   │   │   ├── requirejs.js     # RequireJS shim
│   │   │   └── symbol.js        # Symbol polyfill
│   │   │
│   │   ├── services/            # Renderer services
│   │   │   ├── collaborationWebSocketAdapter.ts # WebSocket adapter
│   │   │   ├── electronCollaborationProvider.ts # Collaboration provider
│   │   │   ├── proxyServiceManager.ts # WebSocket proxy manager
│   │   │   └── serviceManagerLoader.ts # Dynamic ServiceManager loader
│   │   │
│   │   ├── stores/              # Zustand state management
│   │   │   ├── environmentStore.ts # Environment state & caching
│   │   │   └── runtimeStore.ts  # Runtime state with cleanup
│   │   │
│   │   └── utils/               # Utility functions
│   │       ├── app.ts           # App utilities (GitHub user processing)
│   │       ├── document.ts      # Document utilities
│   │       ├── environments.ts  # Environment utilities
│   │       ├── library.ts       # Library utilities (data hashing)
│   │       ├── logger.ts        # Logging utilities
│   │       ├── login.ts         # Login utilities
│   │       └── notebook.ts      # Notebook utilities
│   │
│   └── shared/                  # Shared types and constants
│       ├── constants/
│       │   └── colors.ts        # Datalayer brand colors
│       └── types/               # TypeScript interfaces
│           ├── app.types.ts     # App component types
│           ├── document.types.ts # Document types
│           ├── documents.types.ts # Library types
│           ├── environments.types.ts # Environment types
│           ├── index.ts         # Type exports
│           ├── login.types.ts   # Login types
│           └── notebook.types.ts # Notebook types
│
├── scripts/
│   └── fix-production-bundle.js # Production build fixes
│
├── electron.vite.config.ts      # Vite configuration with CJS/ESM fixes
├── tsconfig.json                # TypeScript configuration
├── package.json                 # Dependencies and scripts
├── CLAUDE.md                    # AI assistant documentation
└── README.md                    # This file
```

## 🎨 UI/UX Design

### Theme & Colors

The application uses Datalayer's brand colors:
- **Primary Green**: `#117964` (accessible, high contrast)
- **Light Gray Background**: `#F8F9FA` (navigation header)
- **White Background**: `#FFFFFF` (main content)
- **Gray Text**: `#59595C` (secondary text)

### Component Architecture

The app follows **Atomic Design Principles**:

1. **Atoms**: Basic UI components (buttons, inputs, labels)
2. **Molecules**: Simple component groups (navigation tabs, user menu)
3. **Organisms**: Complex components (headers, sections, dialogs)
4. **Templates**: Page layouts (app layout)
5. **Pages**: Complete views with business logic

### Recent UI Improvements

- **Light Navigation Header**: Changed from dark to light gray background for better theme support
- **Green Focus States**: All focus outlines use Datalayer green instead of default blue
- **Larger Action Buttons**: Library action icons (open, download, delete) are now more prominent
- **Skeleton Loading**: Proper loading placeholders that match actual content height
- **Scrollbar Consistency**: Fixed scrollbar space to prevent layout jumps

## 🔧 Key Components

### NotebookEditor
- Full Jupyter notebook integration with `@datalayer/jupyter-react`
- Real-time collaboration via `DatalayerCollaborationProvider`
- Kernel management with runtime-specific credentials
- Auto-save and runtime termination confirmation

### DocumentEditor
- Lexical-based rich text editor with `@datalayer/jupyter-lexical`
- Jupyter code cell execution within documents
- Runtime auto-creation and readiness polling
- ServiceManager with correct runtime-specific configuration

### Library
- Browse notebooks and documents from Datalayer workspace
- Space-based organization with selector dropdown
- Auto-refresh with hash-based change detection
- Delete confirmation with text verification
- Download functionality for local backup

### Environments
- Display available computing environments (Python, R, Julia)
- Package listings and resource specifications
- GPU/CPU environment detection
- Cached data for improved performance

## 🏗️ Architecture

### Security Best Practices

1. **Context Isolation**: Renderer process is isolated from Node.js
2. **Preload Scripts**: Secure bridge between main and renderer processes
3. **Content Security Policy**: Restricts script execution, external APIs routed through main process
4. **No Node Integration**: Renderer has no direct Node.js access
5. **Secure API Calls**: All external API requests use Electron's `net` module in main process
6. **Production DevTools Control**: Developer tools disabled in production builds
7. **Keyboard Shortcut Protection**: DevTools shortcuts disabled in production
8. **Context Menu Protection**: Right-click context menu disabled in production

### WebSocket Cleanup System

The app implements a comprehensive WebSocket cleanup system:

1. **Global Cleanup Registry**: Tracks terminated runtimes across processes
2. **Multi-Layer Protection**:
   - HTTP request blocking
   - Collaboration provider prevention
   - WebSocket proxy blocking
   - Service manager cleanup
3. **IPC Communication**: Synchronizes cleanup between renderer and main processes
4. **Connection Prevention**: Blocks new connections to terminated runtimes

### State Management

- **Zustand Stores**: Centralized state management
- **Environment Caching**: 5-minute cache for environment data
- **Runtime State**: Tracks active runtimes with cleanup on termination
- **Auto-refresh**: Intelligent data synchronization with change detection

## 📦 Packaging for Distribution

### Platform-Specific Builds

#### macOS (.dmg, .app)

**Universal Binary (Recommended)**
```bash
npm run dist:mac-universal  # Works on Intel & Apple Silicon
```

**Architecture-Specific**
```bash
npm run dist:mac-intel     # Intel-only build
npm run dist:mac-arm       # Apple Silicon only
```

#### Windows (.exe)
```bash
npm run dist:win
```

#### Linux (.AppImage)
```bash
npm run dist:linux
```

### Production Build Features

- ✅ **Working Production Builds**: All critical issues resolved
- ✅ **Universal macOS Binaries**: Single build for all Mac processors
- ✅ **Module Resolution**: Complex CJS/ESM handling fixed
- ✅ **Lodash Bundling**: Complete polyfills for production
- ✅ **Path Polyfills**: Full Node.js path API implementation
- ✅ **DevTools Security**: Disabled in production, enabled in development

## 🐛 Troubleshooting

### Common Issues

1. **App doesn't start**
   ```bash
   rm -rf dist dist-electron node_modules/.vite
   npm install
   npm start
   ```

2. **Module resolution errors**
   - Use development mode: `npm start`
   - Check polyfills in `src/renderer/polyfills/`

3. **WebSocket connection errors**
   - Verify runtime is not terminated
   - Check cleanup registry in console

4. **Build failures**
   ```bash
   npm run check:fix
   npm run build
   ```

## 📚 Resources

- [Datalayer Documentation](https://docs.datalayer.io)
- [Electron Documentation](https://www.electronjs.org/docs)
- [Datalayer Core Repository](https://github.com/datalayer/core)
- [CLAUDE.md](./CLAUDE.md) - Detailed technical documentation for AI assistants

## 📄 License

This project is licensed under the BSD-3-Clause License - see the [LICENSE](../../../../LICENSE) file for details.

## 🤝 Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Platform for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>