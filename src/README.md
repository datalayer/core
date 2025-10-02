# Datalayer Core - TypeScript/React Components

This directory contains the comprehensive TypeScript/React frontend architecture for Datalayer Core. It provides a complete component library, state management, hooks, utilities, and API integration for building modern web applications on the Datalayer platform.

## 📁 Directory Structure

```
src/
├── api/                    # API layer and Jupyter integration
├── components/             # React component library (70+ components)
├── config/                 # Configuration utilities
├── examples/              # Usage examples
├── hooks/                 # Custom React hooks (25+ hooks)
├── i18n/                  # Internationalization
├── models/                # TypeScript type definitions (70+ models)
├── routes/                # Routing configuration
├── state/                 # Zustand state management
├── stories/               # Storybook stories
├── theme/                 # Theme and styling
├── utils/                 # Utility functions (20+ utilities)
└── mocks/                 # Testing mocks
```

## 🚀 Getting Started

### Installation

```bash
npm install
```

### Development

```bash
# Start development server
npm run dev

# Run Storybook for component development
npm run storybook

# Run tests
npm run test

# Build for production
npm run build
```

## 🧩 Components

### UI Components

#### Avatars

```tsx
import { BoringAvatar, UserProfileAvatar } from '@datalayer/core';

// Generate unique avatars
<BoringAvatar
  size={40}
  name="John Doe"
  variant="marble"
  colors={["#92A1C6", "#146A7C", "#F0AB3D"]}
/>

// User profile avatar with fallback
<UserProfileAvatar
  user={{ name: "John Doe", avatarUrl: "https://..." }}
  size="large"
/>
```

#### Buttons

```tsx
import {
  LongActionButton,
  DownloadCSVButton,
  UploadButton
} from '@datalayer/core';

// Long-running action with loading state
<LongActionButton
  onClick={async () => await longRunningTask()}
  loadingText="Processing..."
  variant="primary"
>
  Start Analysis
</LongActionButton>

// CSV download functionality
<DownloadCSVButton
  data={[
    { name: "John", age: 30 },
    { name: "Jane", age: 25 }
  ]}
  filename="users.csv"
/>

// File upload with validation
<UploadButton
  accept=".csv,.json"
  maxSize={10 * 1024 * 1024} // 10MB
  onUpload={(files) => handleFiles(files)}
  multiple
>
  Upload Files
</UploadButton>
```

#### Display Components

```tsx
import {
  CenteredSpinner,
  DatalayerBox,
  CodePreview,
  Markdown
} from '@datalayer/core';

// Loading spinner
<CenteredSpinner size="large" />

// Branded container
<DatalayerBox variant="elevated">
  <h2>Dashboard Content</h2>
</DatalayerBox>

// Syntax-highlighted code
<CodePreview
  code={`
    const hello = (name: string) => {
      console.log(\`Hello, \${name}!\`);
    };
  `}
  language="typescript"
  showLineNumbers
/>

// Markdown rendering
<Markdown content="# Hello World\nThis is **bold** text." />
```

### Data Visualization

#### Charts (ECharts Integration)

```tsx
import { EChartsReact } from '@datalayer/core';

const chartOptions = {
  title: { text: 'Sample Chart' },
  xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed'] },
  yAxis: { type: 'value' },
  series: [
    {
      data: [120, 200, 150],
      type: 'line',
    },
  ],
};

<EChartsReact option={chartOptions} style={{ height: '400px' }} />;
```

#### Progress Components

```tsx
import {
  ProgressBar,
  ProgressRing,
  ConsumptionBar,
  CreditsIndicator
} from '@datalayer/core';

// Linear progress bar
<ProgressBar value={75} max={100} label="Upload Progress" />

// Circular progress ring
<ProgressRing
  value={60}
  size={80}
  strokeWidth={8}
  color="#0066CC"
/>

// Resource consumption
<ConsumptionBar
  used={750}
  total={1000}
  unit="MB"
  warningThreshold={0.8}
/>

// Credits display
<CreditsIndicator
  current={150}
  total={500}
  showUsage
/>
```

### Jupyter Integration

#### Notebook Components

```tsx
import {
  JupyterNotebook,
  JupyterNotebookToolbar,
  RuntimePickerNotebook
} from '@datalayer/core';

// Full notebook viewer
<JupyterNotebook
  notebookId="notebook-123"
  readonly={false}
  showLineNumbers
  theme="light"
/>

// Notebook toolbar
<JupyterNotebookToolbar
  notebook={notebookData}
  onSave={handleSave}
  onRun={handleRun}
  onExport={handleExport}
/>

// Runtime selection for notebooks
<RuntimePickerNotebook
  currentRuntime="python-runtime-1"
  onRuntimeChange={handleRuntimeChange}
  availableRuntimes={runtimes}
/>
```

#### Runtime Management

```tsx
import {
  RuntimePickerBase,
  RuntimeLauncherDialog,
  RuntimeVariables,
  RuntimeReservationControl
} from '@datalayer/core';

// Basic runtime picker
<RuntimePickerBase
  runtimes={availableRuntimes}
  selectedRuntime={currentRuntime}
  onSelect={setCurrentRuntime}
/>

// Runtime launcher modal
<RuntimeLauncherDialog
  isOpen={showLauncher}
  onClose={() => setShowLauncher(false)}
  onLaunch={handleRuntimeLaunch}
  environments={environments}
/>

// Runtime variables inspector
<RuntimeVariables
  runtimeId="runtime-123"
  variables={runtimeVariables}
  onVariableUpdate={handleVariableUpdate}
/>
```

### Navigation & Layout

#### Navigation Bar

```tsx
import { SubdomainNavBar } from '@datalayer/core';

<SubdomainNavBar
  user={currentUser}
  organization={currentOrg}
  navigation={[
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Notebooks', href: '/notebooks' },
    { label: 'Runtimes', href: '/runtimes' },
  ]}
  onSignOut={handleSignOut}
/>;
```

#### Sub Navigation

```tsx
import { SubNav } from '@datalayer/core';

<SubNav
  items={[
    { key: 'overview', label: 'Overview', href: '/overview' },
    { key: 'settings', label: 'Settings', href: '/settings' },
    { key: 'members', label: 'Members', href: '/members' },
  ]}
  activeKey="overview"
/>;
```

### Forms & Inputs

#### Context Selectors

```tsx
import { OrganizationSelect, SpaceSelect } from '@datalayer/core';

// Organization selector
<OrganizationSelect
  organizations={userOrganizations}
  selected={currentOrganization}
  onSelect={setCurrentOrganization}
/>

// Space selector
<SpaceSelect
  spaces={availableSpaces}
  selected={currentSpace}
  onSelect={setCurrentSpace}
  organization={currentOrganization}
/>
```

### Storage & File Management

```tsx
import { ContentsBrowser, ContentsItems } from '@datalayer/core';

// File browser component
<ContentsBrowser
  path="/notebooks"
  onNavigate={handlePathChange}
  onFileSelect={handleFileSelect}
  allowUpload
  allowNewFolder
/>

// File list component
<ContentsItems
  items={fileItems}
  selectedItems={selectedFiles}
  onSelectionChange={setSelectedFiles}
  onItemAction={handleItemAction}
/>
```

## 🎣 Custom Hooks

### Authentication Hooks

```tsx
import { useUser, useIAM, useAuthorization } from '@datalayer/core';

function UserProfile() {
  const { user, loading, error } = useUser();
  const { isAuthenticated, login, logout } = useIAM();
  const { hasPermission } = useAuthorization();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <button onClick={login}>Login</button>;

  return (
    <div>
      <h1>Welcome, {user?.name}</h1>
      {hasPermission('admin') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Platform Integration Hooks

```tsx
import { useDatalayer, useRuntimes, useNotebookAIAgent } from '@datalayer/core';

function RuntimeDashboard() {
  // Main Datalayer platform integration
  const { client, isConnected } = useDatalayer();

  // Runtime management
  const {
    runtimes,
    loading,
    createRuntime,
    deleteRuntime,
    startRuntime,
    stopRuntime,
  } = useRuntimes();

  // AI agent for notebooks
  const { agent, executeCode, getCompletion } = useNotebookAIAgent();

  const handleCreateRuntime = async () => {
    await createRuntime({
      name: 'new-runtime',
      environment: 'python-3.11',
    });
  };

  return (
    <div>
      <h2>Runtimes ({runtimes.length})</h2>
      <button onClick={handleCreateRuntime}>Create Runtime</button>
      {runtimes.map(runtime => (
        <div key={runtime.id}>
          <span>
            {runtime.name} - {runtime.status}
          </span>
          <button onClick={() => startRuntime(runtime.id)}>Start</button>
          <button onClick={() => stopRuntime(runtime.id)}>Stop</button>
        </div>
      ))}
    </div>
  );
}
```

### UI/UX Hooks

```tsx
import {
  useToast,
  useBackdrop,
  useScreenshot,
  useUpload,
  useVisibilityObserver,
} from '@datalayer/core';

function InteractiveComponent() {
  const { showToast } = useToast();
  const { showBackdrop, hideBackdrop } = useBackdrop();
  const { takeScreenshot } = useScreenshot();
  const { uploadFiles, uploading, progress } = useUpload();
  const { ref, isVisible } = useVisibilityObserver();

  const handleAction = async () => {
    showBackdrop('Processing...');
    try {
      await someAsyncAction();
      showToast('Success!', 'success');
    } catch (error) {
      showToast('Error occurred', 'error');
    } finally {
      hideBackdrop();
    }
  };

  const handleScreenshot = async () => {
    const screenshot = await takeScreenshot(ref.current);
    // Use screenshot data
  };

  return (
    <div ref={ref}>
      <button onClick={handleAction}>Perform Action</button>
      <button onClick={handleScreenshot}>Take Screenshot</button>
      {isVisible && <div>Component is visible!</div>}

      <input type="file" onChange={e => uploadFiles(e.target.files)} multiple />
      {uploading && <div>Upload progress: {progress}%</div>}
    </div>
  );
}
```

### Cache and Performance Hooks

```tsx
import { useCache, useWindowSize } from '@datalayer/core';

function CachedDataComponent() {
  const { width, height } = useWindowSize();

  const { data, loading, error, refresh } = useCache(
    'expensive-data',
    async () => {
      const response = await fetch('/api/expensive-data');
      return response.json();
    },
    { ttl: 5 * 60 * 1000 }, // 5 minutes cache
  );

  // Responsive behavior based on window size
  const isMobile = width < 768;

  return (
    <div className={isMobile ? 'mobile-layout' : 'desktop-layout'}>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div>Error: {error.message}</div>
      ) : (
        <div>
          <pre>{JSON.stringify(data, null, 2)}</pre>
          <button onClick={refresh}>Refresh</button>
        </div>
      )}
    </div>
  );
}
```

## 🗂️ State Management (Zustand)

### Core State

```tsx
import { useCoreState } from '@datalayer/core';

function AppHeader() {
  const {
    theme,
    setTheme,
    sidebarOpen,
    setSidebarOpen,
    notifications,
    addNotification,
  } = useCoreState();

  return (
    <header>
      <button onClick={() => setSidebarOpen(!sidebarOpen)}>
        Toggle Sidebar
      </button>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        Toggle Theme
      </button>
      <div className="notifications">
        {notifications.map(notification => (
          <div key={notification.id}>{notification.message}</div>
        ))}
      </div>
    </header>
  );
}
```

### Organization & Space State

```tsx
import { useOrganizationState, useSpaceState } from '@datalayer/core';

function OrganizationDashboard() {
  const {
    currentOrganization,
    setCurrentOrganization,
    organizations,
    fetchOrganizations,
  } = useOrganizationState();

  const { spaces, currentSpace, setCurrentSpace, createSpace, deleteSpace } =
    useSpaceState();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreateSpace = async () => {
    await createSpace({
      name: 'New Space',
      description: 'A new workspace',
      organizationId: currentOrganization?.id,
    });
  };

  return (
    <div>
      <h1>{currentOrganization?.name}</h1>
      <div>
        <h2>Spaces</h2>
        <button onClick={handleCreateSpace}>Create Space</button>
        {spaces.map(space => (
          <div key={space.id}>
            <span>{space.name}</span>
            <button onClick={() => setCurrentSpace(space)}>Select</button>
            <button onClick={() => deleteSpace(space.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Runtime State

```tsx
import { useRuntimesState } from '@datalayer/core';

function RuntimeManager() {
  const {
    runtimes,
    loading,
    error,
    selectedRuntime,
    setSelectedRuntime,
    createRuntime,
    updateRuntime,
    deleteRuntime,
    fetchRuntimes,
  } = useRuntimesState();

  const handleRuntimeAction = async (runtimeId: string, action: string) => {
    try {
      await updateRuntime(runtimeId, { action });
    } catch (error) {
      console.error('Runtime action failed:', error);
    }
  };

  return (
    <div>
      <h2>Runtime Management</h2>
      {loading && <div>Loading runtimes...</div>}
      {error && <div>Error: {error}</div>}

      {runtimes.map(runtime => (
        <div key={runtime.id} className="runtime-card">
          <h3>{runtime.name}</h3>
          <p>Status: {runtime.status}</p>
          <p>Environment: {runtime.environment}</p>

          <div className="runtime-actions">
            <button onClick={() => handleRuntimeAction(runtime.id, 'start')}>
              Start
            </button>
            <button onClick={() => handleRuntimeAction(runtime.id, 'stop')}>
              Stop
            </button>
            <button onClick={() => handleRuntimeAction(runtime.id, 'restart')}>
              Restart
            </button>
            <button onClick={() => deleteRuntime(runtime.id)}>Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
```

## 🛠️ Utilities

### Array Utilities

```tsx
import {
  uniqueBy,
  groupBy,
  sortBy,
  chunk,
  flatten,
} from '@datalayer/core/utils';

// Remove duplicates by property
const uniqueUsers = uniqueBy(users, 'id');

// Group items by property
const usersByRole = groupBy(users, 'role');

// Sort with multiple criteria
const sortedUsers = sortBy(users, ['lastName', 'firstName']);

// Split array into chunks
const batches = chunk(largeArray, 10);

// Flatten nested arrays
const flatList = flatten(nestedArrays);
```

### Date Utilities

```tsx
import {
  formatRelativeTime,
  formatDate,
  parseDate,
  addDays,
  isToday,
} from '@datalayer/core/utils';

// Relative time formatting
const relativeTime = formatRelativeTime(new Date('2023-01-01'));
// "2 months ago"

// Date formatting
const formattedDate = formatDate(new Date(), 'yyyy-MM-dd');
// "2023-03-15"

// Date parsing
const parsedDate = parseDate('2023-03-15');

// Date arithmetic
const futureDate = addDays(new Date(), 7);

// Date checks
const checkToday = isToday(someDate);
```

### File Utilities

```tsx
import {
  downloadFile,
  readFileAsText,
  validateFileType,
  formatFileSize,
  getFileExtension,
} from '@datalayer/core/utils';

// Download file
downloadFile(data, 'report.csv', 'text/csv');

// Read file content
const content = await readFileAsText(file);

// Validate file type
const isValidImage = validateFileType(file, ['image/png', 'image/jpeg']);

// Format file size
const sizeString = formatFileSize(file.size);
// "2.5 MB"

// Get file extension
const extension = getFileExtension(file.name);
// "png"
```

### String Utilities

```tsx
import {
  capitalize,
  camelCase,
  kebabCase,
  truncate,
  stripHtml,
  generateSlug,
} from '@datalayer/core/utils';

// String transformations
const title = capitalize('hello world');
// "Hello world"

const camelCased = camelCase('hello-world-test');
// "helloWorldTest"

const kebabCased = kebabCase('HelloWorldTest');
// "hello-world-test"

// String manipulation
const truncated = truncate('Long text here...', 10);
// "Long text..."

const plainText = stripHtml('<p>Hello <strong>world</strong></p>');
// "Hello world"

const slug = generateSlug('Hello World! 123');
// "hello-world-123"
```

### Number Utilities

```tsx
import {
  formatNumber,
  formatCurrency,
  formatPercentage,
  clamp,
  randomBetween,
} from '@datalayer/core/utils';

// Number formatting
const formattedNum = formatNumber(1234567);
// "1,234,567"

const currency = formatCurrency(99.99, 'USD');
// "$99.99"

const percentage = formatPercentage(0.756, 2);
// "75.60%"

// Number manipulation
const clamped = clamp(15, 0, 10);
// 10

const random = randomBetween(1, 100);
// Random number between 1 and 100
```

## 🎨 Theme & Styling

### Theme Provider

```tsx
import { DatalayerThemeProvider } from '@datalayer/core';

function App() {
  return (
    <DatalayerThemeProvider theme="light">
      <YourAppContent />
    </DatalayerThemeProvider>
  );
}
```

### Theme Configuration

```tsx
import { createDatalayerTheme } from '@datalayer/core';

const customTheme = createDatalayerTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#dc004e',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
  spacing: 8,
  breakpoints: {
    xs: 0,
    sm: 600,
    md: 960,
    lg: 1280,
    xl: 1920,
  },
});
```

## 🧪 Testing

### Component Testing

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

### Hook Testing

```tsx
import { renderHook, act } from '@testing-library/react';
import { useCounter } from './useCounter';

describe('useCounter', () => {
  it('increments counter', () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      result.current.increment();
    });

    expect(result.current.count).toBe(1);
  });
});
```

## 📚 Storybook

### Component Stories

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Components/Button',
  component: Button,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Button',
  },
};
```

## 🔧 Configuration

### Development Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## 📦 Building & Distribution

### Build Process

```bash
# Build library
npm run build:lib

# Build application
npm run build

# Generate TypeDoc documentation
npm run typedoc
```

### Package Exports

The package exports components, hooks, utilities, and types:

```typescript
import {
  // Components
  DatalayerBox,
  UserProfileAvatar,
  JupyterNotebook,

  // Hooks
  useUser,
  useRuntimes,
  useDatalayer,

  // Utilities
  formatDate,
  downloadFile,
  generateSlug,

  // Types
  User,
  Runtime,
  Organization,
} from '@datalayer/core';
```

## 🤝 Contributing

1. Follow the existing code structure and patterns
2. Add comprehensive TypeScript types
3. Include Storybook stories for new components
4. Write tests for all functionality
5. Update documentation as needed

## 📄 License

This project is licensed under the Modified BSD License.

---

Built with ❤️ using React, TypeScript, and modern web technologies.
