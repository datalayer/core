/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useEffect } from 'react';

import setupPrimerPortals from './Portals';

// This component doesn't render anything visual but sets up portals
const PortalsDemo = () => {
  useEffect(() => {
    setupPrimerPortals();
  }, []);

  return (
    <div
      style={{
        padding: '2rem',
        border: '1px solid #d1d9e0',
        borderRadius: '8px',
        background: '#f6f8fa',
        textAlign: 'center',
      }}
    >
      <h2>Primer Portals Setup</h2>
      <p>This component sets up the Primer portal root for React components.</p>
      <p>
        Check the DOM to see the portal root has been configured on the body
        element.
      </p>
      <div
        style={{
          marginTop: '1rem',
          padding: '1rem',
          background: '#fff',
          border: '1px solid #d1d9e0',
          borderRadius: '4px',
        }}
      >
        <strong>Portal Configuration:</strong>
        <ul style={{ textAlign: 'left', marginTop: '0.5rem' }}>
          <li>Portal root ID: __primerPortalRoot__</li>
          <li>Color mode: light</li>
          <li>Light theme: light</li>
          <li>Dark theme: dark</li>
        </ul>
      </div>
    </div>
  );
};

const meta = {
  title: 'Datalayer/Primer/Portals',
  component: PortalsDemo,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Sets up the Primer portal root for React components. This is a utility function that configures the DOM for Primer portals.',
      },
    },
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            registerPortalRoot: element => {
              console.log('Registered portal root:', element);
            },
          },
        },
      ],
    },
  },
} satisfies Meta<typeof PortalsDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SetupExample: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Demonstrates the setup of Primer portals. The function configures the DOM body element as the portal root.',
      },
    },
  },
};
