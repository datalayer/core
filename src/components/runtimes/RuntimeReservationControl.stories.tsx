/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';

import { RuntimeReservationControl } from './RuntimeReservationControl';

const meta = {
  title: 'Datalayer/Runtimes/RuntimeReservationControl',
  component: RuntimeReservationControl,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            FormControl: ({ children, disabled, sx }) => (
              <div style={{ opacity: disabled ? 0.6 : 1, ...sx }}>
                {children}
              </div>
            ),
            'FormControl.Label': ({ children }) => (
              <label
                style={{
                  display: 'block',
                  marginBottom: '8px',
                  fontWeight: 'bold',
                }}
              >
                {children}
              </label>
            ),
            'FormControl.Caption': ({ children }) => (
              <div
                style={{ fontSize: '12px', color: '#656d76', marginTop: '8px' }}
              >
                {children}
              </div>
            ),
            'FormControl.Validation': ({ children, variant }) => (
              <div
                style={{
                  fontSize: '12px',
                  color: variant === 'error' ? '#d73a49' : '#656d76',
                  marginTop: '4px',
                }}
              >
                {children}
              </div>
            ),
            IconButton: ({
              icon: Icon,
              onClick,
              'aria-label': ariaLabel,
              ...props
            }) => (
              <button
                {...props}
                onClick={onClick}
                aria-label={ariaLabel}
                style={{
                  background: 'none',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={16} />
              </button>
            ),
            Text: ({ children }) => <span>{children}</span>,
            TextInput: ({
              value,
              onChange,
              type,
              step,
              min,
              max,
              disabled,
              ...props
            }) => (
              <input
                {...props}
                type={type}
                step={step}
                min={min}
                max={max}
                value={value}
                onChange={onChange}
                disabled={disabled}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  width: '80px',
                  opacity: disabled ? 0.6 : 1,
                }}
              />
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, style }) => <div style={style}>{children}</div>,
            Slider: ({ min, max, value, onChange, disabled, step }) => (
              <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={e => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                step={step}
                style={{
                  width: '200px',
                  opacity: disabled ? 0.6 : 1,
                }}
              />
            ),
          },
        },
        {
          path: '@primer/octicons-react',
          default: {
            PlusIcon: ({ size = 16 }) => (
              <svg
                width={size}
                height={size}
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8 2a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2z"
                />
              </svg>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    label: {
      control: 'text',
      description: 'Control label',
    },
    time: {
      control: { type: 'number', min: 1, max: 1440 },
      description: 'Time value in minutes',
    },
    max: {
      control: { type: 'number', min: 1, max: 1440 },
      description: 'Maximum time in minutes',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state',
    },
    burningRate: {
      control: { type: 'number', min: 0.1, max: 5.0, step: 0.1 },
      description: 'Credits burning rate per minute',
    },
    error: {
      control: 'text',
      description: 'Error message',
    },
  },
} satisfies Meta<typeof RuntimeReservationControl>;

export default meta;
type Story = StoryObj<typeof meta>;

const InteractiveTemplate = args => {
  const [time, setTime] = useState(args.time);

  return (
    <RuntimeReservationControl {...args} time={time} onTimeChange={setTime} />
  );
};

export const Default: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 60,
    max: 240,
    disabled: false,
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const WithBurningRate: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 120,
    max: 300,
    disabled: false,
    burningRate: 0.5,
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const WithAddCredits: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 30,
    max: 60,
    disabled: false,
    burningRate: 1.0,
    addCredits: () => console.log('Add credits clicked'),
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const WithError: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 180,
    max: 240,
    disabled: false,
    burningRate: 0.8,
    error: 'Insufficient credits for this duration',
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const Disabled: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 90,
    max: 180,
    disabled: true,
    burningRate: 0.3,
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const MaximumTime: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 1440, // 24 hours
    max: 1440,
    disabled: false,
    burningRate: 0.1,
    addCredits: () => console.log('Add credits clicked'),
    onTimeChange: value => console.log('Time changed:', value),
  },
};

export const LowCredits: Story = {
  render: InteractiveTemplate,
  args: {
    label: 'Runtime Duration',
    time: 15,
    max: 30,
    disabled: false,
    burningRate: 2.0,
    addCredits: () => console.log('Add credits clicked'),
    error: 'Low credits available',
    onTimeChange: value => console.log('Time changed:', value),
  },
};
