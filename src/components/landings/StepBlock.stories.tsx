/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { StepBlock } from './StepBlock';
import { RocketIcon, StarIcon, CheckIcon } from '@primer/octicons-react';

const meta = {
  title: 'Datalayer/Landings/StepBlock',
  component: StepBlock,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    date: {
      control: 'text',
      description: 'Date or step number',
    },
    title: {
      control: 'text',
      description: 'Title of the step',
    },
    description: {
      control: 'text',
      description: 'Description of the step (supports HTML)',
    },
  },
} satisfies Meta<typeof StepBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    date: 'Step 1',
    title: 'Launch Your Project',
    description:
      'Create a new project and start building amazing applications with our platform.',
    StepIcon: RocketIcon,
  },
};

export const WithHTMLDescription: Story = {
  args: {
    date: 'Step 2',
    title: 'Configure Settings',
    description:
      'Set up your project configuration and customize it <strong>according to your needs</strong>. You can also <em>add integrations</em> and API keys.',
    StepIcon: StarIcon,
  },
};

export const CompletedStep: Story = {
  args: {
    date: 'Step 3',
    title: 'Deploy & Monitor',
    description:
      'Deploy your application to production and monitor its performance using our comprehensive dashboard.',
    StepIcon: CheckIcon,
  },
};

export const DateFormat: Story = {
  args: {
    date: 'Jan 2024',
    title: 'Feature Launch',
    description:
      'We launched this amazing feature that revolutionizes how you work with data.',
    StepIcon: RocketIcon,
  },
};
