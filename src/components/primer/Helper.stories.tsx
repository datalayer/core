/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Container, RedlineBackground } from './Helper';

const meta = {
  title: 'Datalayer/Primer/Helper',
  component: Container,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Helper components for layout and debugging in Primer components.',
      },
    },
  },
} satisfies Meta<typeof Container>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ContainerDefault: Story = {
  args: {
    children: (
      <div
        style={{
          padding: '2rem',
          background: '#f6f8fa',
          textAlign: 'center',
          border: '1px solid #d1d9e0',
        }}
      >
        <h2>Container Content</h2>
        <p>This content is centered within a max-width container of 1024px.</p>
      </div>
    ),
  },
};

export const ContainerWithCustomStyle: Story = {
  args: {
    children: (
      <div
        style={{
          padding: '2rem',
          background: '#e1f5fe',
          textAlign: 'center',
          border: '1px solid #0366d6',
        }}
      >
        <h2>Custom Styled Container</h2>
        <p>Container with custom background and styling.</p>
      </div>
    ),
    style: {
      background: '#ffffff',
      padding: '1rem',
      border: '2px solid #0366d6',
      borderRadius: '8px',
    },
  },
};

export const ContainerWithMultipleChildren: Story = {
  args: {
    children: [
      <div
        key="1"
        style={{
          padding: '1rem',
          background: '#f1f8ff',
          margin: '0.5rem 0',
          border: '1px solid #0366d6',
          borderRadius: '4px',
        }}
      >
        <h3>First Child</h3>
        <p>This is the first child element.</p>
      </div>,
      <div
        key="2"
        style={{
          padding: '1rem',
          background: '#fff5b4',
          margin: '0.5rem 0',
          border: '1px solid #ffd33d',
          borderRadius: '4px',
        }}
      >
        <h3>Second Child</h3>
        <p>This is the second child element.</p>
      </div>,
    ],
  },
};

const RedlineBackgroundMeta = {
  title: 'Datalayer/Primer/RedlineBackground',
  component: RedlineBackground,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'A diagnostic component that shows a red checkerboard background pattern, useful for debugging layouts.',
      },
    },
  },
  argTypes: {
    height: {
      control: 'number',
      description: 'Height of the redline background in pixels',
    },
    hasBorder: {
      control: 'boolean',
      description: 'Whether to show a border around the component',
    },
  },
} satisfies Meta<typeof RedlineBackground>;

export const RedlineBackgroundDefault: StoryObj<typeof RedlineBackgroundMeta> =
  {
    args: {
      height: 200,
      hasBorder: true,
      children: (
        <div
          style={{
            padding: '1rem',
            background: 'white',
            border: '1px solid #333',
            borderRadius: '4px',
          }}
        >
          Content over redline background
        </div>
      ),
    },
  };

export const RedlineBackgroundNoBorder: StoryObj<typeof RedlineBackgroundMeta> =
  {
    args: {
      height: 150,
      hasBorder: false,
      children: (
        <div
          style={{
            padding: '1rem',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '4px',
          }}
        >
          No border redline background
        </div>
      ),
    },
  };

export const RedlineBackgroundTall: StoryObj<typeof RedlineBackgroundMeta> = {
  args: {
    height: 400,
    hasBorder: true,
    children: (
      <div
        style={{
          padding: '2rem',
          background: 'white',
          border: '2px solid #0366d6',
          borderRadius: '8px',
          maxWidth: '300px',
        }}
      >
        <h3>Tall Redline Background</h3>
        <p>
          This demonstrates a taller redline background for debugging larger
          layouts.
        </p>
      </div>
    ),
  },
};

export const RedlineBackgroundEmpty: StoryObj<typeof RedlineBackgroundMeta> = {
  args: {
    height: 100,
    hasBorder: true,
  },
};
