/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState, useRef } from 'react';

import { SubdomainNavBar } from './SubdomainNavBar';

const meta = {
  title: 'Datalayer/NavBar/SubdomainNavBar',
  component: SubdomainNavBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: {
                brand: {
                  logoUrl: 'https://datalayer.io/favicon.ico',
                },
              },
            }),
            useRunStore: () => ({
              isDev: false,
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useOnClickOutside: () => {},
            useFocusTrap: () => {},
            useKeyboardEscape: () => {},
            useWindowSize: () => ({ isMedium: true }),
            useNavigate: () => (path: string, e?: Event) => {
              if (e) e.preventDefault();
              console.log('Navigate to:', path);
            },
            useId: (prefix: string) =>
              `${prefix}-${Math.random().toString(36).slice(2)}`,
          },
        },
      ],
    },
  },
  argTypes: {
    title: {
      control: 'text',
      description: 'The title or name of the subdomain',
    },
    fixed: {
      control: 'boolean',
      description: 'Fixes the navigation bar to the top of the viewport',
    },
    fullWidth: {
      control: 'boolean',
      description: 'Fill the maximum width of the parent container',
    },
    titleHref: {
      control: 'text',
      description: 'The URL for the site title',
    },
    logoHref: {
      control: 'text',
      description: 'The URL for the logo',
    },
  },
} satisfies Meta<typeof SubdomainNavBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: true,
    fullWidth: false,
  },
};

export const WithLinks: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: true,
    fullWidth: false,
  },
  render: args => (
    <SubdomainNavBar {...args}>
      <SubdomainNavBar.Link href="/dashboard">Dashboard</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/notebooks">Notebooks</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/environments">
        Environments
      </SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/docs" isExternal target="_blank">
        Documentation
      </SubdomainNavBar.Link>
    </SubdomainNavBar>
  ),
};

export const WithActions: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: true,
    fullWidth: false,
  },
  render: args => (
    <SubdomainNavBar {...args}>
      <SubdomainNavBar.Link href="/dashboard">Dashboard</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/notebooks">Notebooks</SubdomainNavBar.Link>
      <SubdomainNavBar.PrimaryAction
        onClick={() => console.log('Primary action clicked')}
      >
        Get Started
      </SubdomainNavBar.PrimaryAction>
      <SubdomainNavBar.SecondaryAction
        onClick={() => console.log('Secondary action clicked')}
      >
        Learn More
      </SubdomainNavBar.SecondaryAction>
    </SubdomainNavBar>
  ),
};

const SearchExample = args => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const searchInputRef = useRef(null);

  const handleSearchSubmit = e => {
    e.preventDefault();
    // Simulate search results
    const mockResults = [
      {
        title: 'Getting Started with Notebooks',
        description: 'Learn how to create and run your first notebook',
        url: '/docs/notebooks',
        date: '2024-01-15',
        category: 'Documentation',
      },
      {
        title: 'Environment Setup Guide',
        description: 'Configure your development environment',
        url: '/docs/environments',
        date: '2024-01-10',
        category: 'Guides',
      },
    ];
    setSearchResults(searchTerm ? mockResults : []);
  };

  const handleSearchChange = e => {
    const value = e.target.value;
    setSearchTerm(value);
    // Simulate real-time search
    if (value.length > 2) {
      setSearchResults([
        {
          title: `Results for "${value}"`,
          description: 'Sample search result description',
          url: `/search?q=${value}`,
          date: '2024-01-20',
          category: 'Search',
        },
      ]);
    } else {
      setSearchResults([]);
    }
  };

  return (
    <SubdomainNavBar {...args}>
      <SubdomainNavBar.Link href="/dashboard">Dashboard</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/notebooks">Notebooks</SubdomainNavBar.Link>
      <SubdomainNavBar.Search
        ref={searchInputRef}
        onSubmit={handleSearchSubmit}
        onChange={handleSearchChange}
        searchResults={searchResults}
        searchTerm={searchTerm}
      />
      <SubdomainNavBar.PrimaryAction>Sign In</SubdomainNavBar.PrimaryAction>
    </SubdomainNavBar>
  );
};

export const WithSearch: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: true,
    fullWidth: false,
  },
  render: SearchExample,
};

export const DevMode: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: true,
    fullWidth: false,
  },
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../state',
          default: {
            useCoreStore: () => ({
              configuration: {
                brand: {
                  logoUrl: 'https://datalayer.io/favicon.ico',
                },
              },
            }),
            useRunStore: () => ({
              isDev: true, // Enable dev mode
            }),
          },
        },
        {
          path: '../../hooks',
          default: {
            useOnClickOutside: () => {},
            useFocusTrap: () => {},
            useKeyboardEscape: () => {},
            useWindowSize: () => ({ isMedium: true }),
            useNavigate: () => (path: string, e?: Event) => {
              if (e) e.preventDefault();
              console.log('Navigate to:', path);
            },
            useId: (prefix: string) =>
              `${prefix}-${Math.random().toString(36).slice(2)}`,
          },
        },
      ],
    },
  },
  render: args => (
    <SubdomainNavBar {...args}>
      <SubdomainNavBar.Link href="/dashboard">Dashboard</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/notebooks">Notebooks</SubdomainNavBar.Link>
    </SubdomainNavBar>
  ),
};

export const FullWidth: Story = {
  args: {
    title: 'Datalayer Platform',
    fixed: false,
    fullWidth: true,
  },
  render: args => (
    <SubdomainNavBar {...args}>
      <SubdomainNavBar.Link href="/dashboard">Dashboard</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/notebooks">Notebooks</SubdomainNavBar.Link>
      <SubdomainNavBar.Link href="/environments">
        Environments
      </SubdomainNavBar.Link>
      <SubdomainNavBar.PrimaryAction>Get Started</SubdomainNavBar.PrimaryAction>
    </SubdomainNavBar>
  ),
};
