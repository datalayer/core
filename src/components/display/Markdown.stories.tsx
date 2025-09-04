/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import { Markdown } from './Markdown';

const meta = {
  title: 'Datalayer/Display/Markdown',
  component: Markdown,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Markdown>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockMarkdownParser = {
  render: async (text: string) => {
    // Simple markdown to HTML conversion for demo
    return text
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br/>');
  },
};

export const SimpleMarkdown: Story = {
  args: {
    text: '# Hello World\nThis is **bold** and this is *italic*',
    markdownParser: mockMarkdownParser as any,
  },
};

export const ComplexMarkdown: Story = {
  args: {
    text: `# Main Title
## Subtitle
This is a paragraph with **bold** and *italic* text.

Another paragraph here.`,
    markdownParser: mockMarkdownParser as any,
  },
};

export const WithSanitizer: Story = {
  args: {
    text: '# Hello World\n<script>alert("XSS")</script>',
    markdownParser: mockMarkdownParser as any,
    sanitizer: {
      sanitize: (html: string) =>
        html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''),
    },
  },
};
