/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

const TextRevealAnimation = ({
  text = 'Welcome to Datalayer Platform',
  delay = 100,
  className = '',
}) => (
  <div
    className={className}
    style={{
      fontSize: '2rem',
      fontWeight: 'bold',
      color: '#0366d6',
      textAlign: 'center',
      letterSpacing: '0.05em',
    }}
  >
    {text.split('').map((char, index) => (
      <span
        key={index}
        style={{
          display: 'inline-block',
          opacity: 0,
          animation: `fadeInUp 0.6s ease-out ${index * delay}ms forwards`,
        }}
      >
        {char === ' ' ? '\u00A0' : char}
      </span>
    ))}
    <style
      dangerouslySetInnerHTML={{
        __html: `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `,
      }}
    />
  </div>
);

const meta = {
  title: 'Datalayer/TextReveal/TextRevealAnimation',
  component: TextRevealAnimation,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    text: {
      control: 'text',
      description: 'Text to animate',
    },
    delay: {
      control: { type: 'number', min: 0, max: 300, step: 10 },
      description: 'Delay between each character animation (ms)',
    },
    className: {
      control: 'text',
      description: 'Additional CSS class',
    },
  },
} satisfies Meta<typeof TextRevealAnimation>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    text: 'Welcome to Datalayer',
    delay: 100,
  },
};

export const FastAnimation: Story = {
  args: {
    text: 'Fast Animation',
    delay: 50,
  },
};

export const SlowAnimation: Story = {
  args: {
    text: 'Slow Animation',
    delay: 200,
  },
};

export const LongText: Story = {
  args: {
    text: 'Data Science Platform for Modern Teams',
    delay: 80,
  },
};

export const ShortText: Story = {
  args: {
    text: 'Hello!',
    delay: 150,
  },
};
