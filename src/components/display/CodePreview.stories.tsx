/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { CodePreview } from './CodePreview';

const meta = {
  title: 'Datalayer/Display/CodePreview',
  component: CodePreview,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  argTypes: {
    code: {
      control: 'text',
      description: 'Code to display',
    },
  },
} satisfies Meta<typeof CodePreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    code: 'console.log("Hello, world!");',
  },
};

export const PythonCode: Story = {
  args: {
    code: `import pandas as pd
import numpy as np

def analyze_data(data):
    """Analyze the input data"""
    result = pd.DataFrame(data)
    return result.describe()

# Example usage
data = {'values': np.random.randn(100)}
stats = analyze_data(data)
print(stats)`,
  },
};

export const JSONCode: Story = {
  args: {
    code: `{
  "name": "datalayer-core",
  "version": "1.0.0",
  "description": "Datalayer Core SDK",
  "scripts": {
    "build": "npm run build:lib",
    "dev": "vite",
    "test": "vitest"
  }
}`,
  },
};

export const LongCode: Story = {
  args: {
    code: `function calculateComplexAnalysis(dataset, options = {}) {
  const { threshold = 0.5, method = 'standard', includeMetrics = true } = options;
  
  // This is a very long line that will demonstrate word wrapping behavior in the code preview component when dealing with extensive content that exceeds normal display widths
  const processedData = dataset.map(item => ({ ...item, processed: true, timestamp: Date.now(), metadata: { source: 'analysis', confidence: Math.random() } }));
  
  return {
    results: processedData,
    summary: includeMetrics ? generateSummaryMetrics(processedData) : null,
    config: { threshold, method }
  };
}`,
  },
};
