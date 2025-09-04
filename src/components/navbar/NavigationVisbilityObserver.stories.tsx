/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';
import React from 'react';

import { NavigationVisbilityObserver } from './NavigationVisbilityObserver';

const meta = {
  title: 'Components/Navbar/NavigationVisbilityObserver',
  component: NavigationVisbilityObserver,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    className: {
      control: 'text',
      description: 'CSS class name to apply to the component',
    },
    children: {
      control: 'object',
      description: 'Child navigation items to observe for visibility',
    },
  },
} satisfies Meta<typeof NavigationVisbilityObserver>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockNavItems = [
  React.createElement(
    'li',
    { key: 1, 'data-navitemid': 'home', className: 'nav-item' },
    React.createElement('a', { href: '#home' }, 'Home'),
  ),
  React.createElement(
    'li',
    { key: 2, 'data-navitemid': 'about', className: 'nav-item' },
    React.createElement('a', { href: '#about' }, 'About'),
  ),
  React.createElement(
    'li',
    { key: 3, 'data-navitemid': 'services', className: 'nav-item' },
    React.createElement('a', { href: '#services' }, 'Services'),
  ),
  React.createElement(
    'li',
    { key: 4, 'data-navitemid': 'contact', className: 'nav-item' },
    React.createElement('a', { href: '#contact' }, 'Contact'),
  ),
];

export const Default: Story = {
  args: {
    children: mockNavItems,
    className: '',
  },
};

export const WithCustomClass: Story = {
  args: {
    children: mockNavItems,
    className: 'custom-navigation-observer',
  },
};

export const MinimalItems: Story = {
  args: {
    children: [
      React.createElement(
        'li',
        { key: 1, 'data-navitemid': 'home', className: 'nav-item' },
        React.createElement('a', { href: '#home' }, 'Home'),
      ),
      React.createElement(
        'li',
        { key: 2, 'data-navitemid': 'about', className: 'nav-item' },
        React.createElement('a', { href: '#about' }, 'About'),
      ),
    ],
    className: '',
  },
};

export const ManyItems: Story = {
  args: {
    children: [
      ...mockNavItems,
      React.createElement(
        'li',
        { key: 5, 'data-navitemid': 'blog', className: 'nav-item' },
        React.createElement('a', { href: '#blog' }, 'Blog'),
      ),
      React.createElement(
        'li',
        { key: 6, 'data-navitemid': 'portfolio', className: 'nav-item' },
        React.createElement('a', { href: '#portfolio' }, 'Portfolio'),
      ),
      React.createElement(
        'li',
        { key: 7, 'data-navitemid': 'testimonials', className: 'nav-item' },
        React.createElement('a', { href: '#testimonials' }, 'Testimonials'),
      ),
      React.createElement(
        'li',
        { key: 8, 'data-navitemid': 'careers', className: 'nav-item' },
        React.createElement('a', { href: '#careers' }, 'Careers'),
      ),
    ],
    className: '',
  },
};
