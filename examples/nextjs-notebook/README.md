[![Datalayer](https://assets.datalayer.tech/datalayer-25.svg)](https://datalayer.io)

[![Become a Sponsor](https://img.shields.io/static/v1?label=Become%20a%20Sponsor&message=%E2%9D%A4&logo=GitHub&style=flat&color=1ABC9C)](https://github.com/sponsors/datalayer)

# Next.js + Datalayer Notebook Example

This example demonstrates how to integrate Jupyter notebooks with Datalayer's platform in a modern Next.js application, enabling interactive notebook execution with cloud-based runtimes.

## Overview

This example showcases:

- **Next.js 14 App Router**: Modern React framework with server components and TypeScript
- **Datalayer Integration**: Connect to Datalayer runtimes for notebook execution
- **Jupyter Notebooks**: Interactive notebook display and execution using `@datalayer/jupyter-react`
- **Runtime Management**: Select and manage different compute environments
- **Workspace Integration**: Browse and open notebooks from your Datalayer workspace
- **State Management**: Zustand-based state management for runtime and notebook state
- **Framework-agnostic Navigation**: Works with Next.js routing without hard dependencies

## Features

- **Welcome Page**: Token-based authentication to access Datalayer platform
- **Notebooks Page**: Browse, create, and manage notebooks from your Datalayer workspace
- **Notebook Creation**: Create new notebooks directly from the UI using Datalayer SDK
- **Environments Page**: View available compute environments with their specifications
- **Notebook Viewer**: Execute notebooks with real-time outputs using cloud runtimes
- **Responsive Design**: Modern UI with GitHub Primer components
- **Light Mode**: Clean, consistent light theme throughout the application

## Prerequisites

- Node.js 18+
- npm
- Datalayer account and API token ([Create one here](https://datalayer.app/settings/iam/tokens))

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/datalayer/core.git
   cd core/examples/nextjs-notebook
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

## Quick Start

1. **Run the development server**:

   ```bash
   npm run dev
   ```

2. **Open the application**:

   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

3. **Authenticate**:
   - You'll be redirected to the welcome page
   - Enter your Datalayer API token
   - Click "Continue" to access the application

## Application Pages

### Welcome Page (`/welcome`)

- Initial landing page for authentication
- Enter your Datalayer API token
- Token is validated and stored locally
- Redirects to notebooks page upon successful authentication

### Notebooks Page (`/notebooks`)

- Browse notebooks from your Datalayer workspace
- Create new notebooks using integrated SDK functionality
- Real-time notebook listing with detailed metadata logging
- Select notebooks to open with a runtime
- Choose environment for notebook execution
- Grid layout with visual notebook cards
- Clean empty state UI with centered "Create New Notebook" button
- Mock data support for UI testing (set `setNotebooks([])` on line 129 to test empty state)

### Environments Page (`/environments`)

- View all available compute environments
- See environment specifications (language, description)
- Visual icons for each environment type

### Viewer Page (`/viewer`)

- Interactive notebook execution interface
- Real-time cell execution and outputs
- Notebook toolbar with execution controls
- Active runtime management

## Application Structure

```
nextjs-notebook/
├── src/
│   ├── app/                      # Next.js app router pages
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Home page (redirects based on auth)
│   │   ├── welcome/              # Welcome/login page
│   │   │   └── page.tsx
│   │   ├── notebooks/            # Notebooks listing page
│   │   │   └── page.tsx
│   │   ├── environments/         # Environments page
│   │   │   └── page.tsx
│   │   └── viewer/               # Notebook viewer page
│   │       └── page.tsx
│   ├── components/               # React components
│   │   ├── AnimatedSpinner.tsx  # Loading spinner
│   │   ├── AppNavBar.tsx        # Navigation bar
│   │   ├── Footer.tsx            # Footer component
│   │   ├── NotebookViewer.tsx   # Notebook execution component
│   │   └── Providers.tsx        # App providers (theme, navigation, etc.)
│   ├── contexts/                 # React contexts
│   │   └── ActiveNotebookContext.tsx
│   └── styles/                   # CSS styles
│       └── globals.css
├── public/                       # Static assets
│   └── favicon.png
├── next.config.mjs              # Next.js configuration
├── package.json                 # Dependencies
└── tsconfig.json               # TypeScript config
```

## Configuration

### Next.js Configuration

The `next.config.mjs` includes necessary webpack configurations for Jupyter components:

```javascript
export default {
  reactStrictMode: false, // Required for Jupyter components
  transpilePackages: [
    '@datalayer/core',
    '@datalayer/jupyter-react',
    // ... other packages
  ],
  webpack: config => {
    // Node.js polyfills for browser
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      // ...
    };
    return config;
  },
};
```

## Development

### Available Scripts

- **`npm run dev`**: Start development server at http://localhost:3000
- **`npm run build`**: Build for production
- **`npm run start`**: Start production server
- **`npm run lint`**: Run ESLint
- **`npm run type-check`**: Check TypeScript types

### Recent Updates

- ✅ **Enhanced Notebook Creation**: Integrated SDK-based notebook creation with proper error handling
- ✅ **Improved State Management**: Updated to use `createNotebook` from `@datalayer/core` SDK
- ✅ **Fixed TypeScript Issues**: Resolved all compilation errors and type safety issues
- ✅ **Theme Simplification**: Streamlined to light mode for consistent user experience
- ✅ **Better Logging**: Added comprehensive console logging for debugging notebook operations
- ✅ **Improved Empty State UI**: Centered "Create New Notebook" button with proper spacing for better visual hierarchy
- ✅ **UI Testing Support**: Added mock data capability for testing empty notebook states

### Key Dependencies

- **`@datalayer/core`**: Core SDK for Datalayer platform integration
- **`@datalayer/jupyter-react`**: React components for Jupyter notebooks
- **`@datalayer/primer-addons`**: Extended Primer components
- **`@jupyterlab/services`**: JupyterLab services for kernel management
- **`@primer/react`**: GitHub's design system components
- **`next`**: Next.js framework
- **`next-themes`**: Theme management for Next.js
- **`zustand`**: State management

## API Integration

### Authentication

The app uses token-based authentication with Datalayer's IAM service:

```typescript
import { useIAMStore } from '@datalayer/core';

const iamStore = useIAMStore();
await iamStore.login(token);
```

### Runtime Creation

Notebooks are executed using Datalayer runtimes:

```typescript
import { createDatalayerServiceManager } from '@datalayer/core';

const serviceManager = await createDatalayerServiceManager(
  environmentName,
  creditsLimit,
);
```

### Workspace Integration

Browse, create, and access notebooks from your Datalayer workspace:

```typescript
import { useCache } from '@datalayer/core';

const { getUserSpaces, getSpaceItems, createNotebook, refreshSpaceItems } =
  useCache();

// Get user spaces and notebooks
const spaces = getUserSpaces();
const notebooks = getSpaceItems();

// Create a new notebook
const result = await createNotebook(
  spaceId,
  notebookName,
  description,
  'notebook',
);
```

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, the dev server will automatically try port 3001:

```bash
⚠ Port 3000 is in use, trying 3001 instead.
```

### Connection Issues

If you're having trouble connecting to Datalayer:

1. Verify your API token is correct and not expired
2. Check your internet connection
3. Ensure the Datalayer platform is accessible

### Build Errors

For webpack-related errors:

1. Clear Next.js cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Rebuild: `npm run build`

### SSR Issues

The app handles server-side rendering (SSR) by:

- Using dynamic imports for client-only components
- Checking for browser environment before accessing `window` or `document`
- Using `'use client'` directive for client components

## License

This project is licensed under the Modified BSD License - see the [LICENSE](../../LICENSE) file for details.

## Support

- **Documentation**: [Datalayer Platform Documentation](https://docs.datalayer.app/)
- **Issues**: [GitHub Issues](https://github.com/datalayer/core/issues)
- **Community**: [Datalayer Platform](https://datalayer.app/)

---

<p align="center">
  <strong>🚀 AI Platform for Data Analysis</strong><br></br>
  <a href="https://datalayer.app/">Get started with Datalayer today!</a>
</p>
