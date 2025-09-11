/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { NbGradesDetails } from './NbGradesDetails';
import { IStudentItem } from '../../models';

const meta = {
  title: 'Datalayer/NBGrader/NbGradesDetails',
  component: NbGradesDetails,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            Heading: ({ children, sx, ...props }) => (
              <h2
                {...props}
                style={{
                  fontSize: sx?.fontSize === 1 ? '1.1rem' : '1.5rem',
                  margin: '0 0 8px 0',
                  fontWeight: 600,
                }}
              >
                {children}
              </h2>
            ),
            Text: ({ children, sx, ...props }) => (
              <span
                {...props}
                style={{
                  fontSize: sx?.fontSize === 'small' ? '0.875rem' : '1rem',
                }}
              >
                {children}
              </span>
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, mt, ...props }) => (
              <div
                {...props}
                style={{
                  ...props.style,
                  ...(mt && { marginTop: `${mt * 8}px` }),
                }}
              >
                {children}
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    studentItem: {
      description: 'Student item data containing grades information',
    },
  },
} satisfies Meta<typeof NbGradesDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

const mockStudentItemWithGrades: IStudentItem = {
  id: '1',
  type: 'student_item',
  itemId: 'assignment-1',
  itemType: 'assignment',
  nbgrades: [
    {
      grade_id_s: 'Problem 1',
      score_f: 8.5,
    },
    {
      grade_id_s: 'Problem 2',
      score_f: 6.0,
    },
    {
      grade_id_s: 'Problem 3',
      score_f: 9.2,
    },
    {
      grade_id_s: 'Problem 4',
      score_f: 7.8,
    },
  ],
  nbgradesTotalScore: 31.5,
  nbgradesTotalPoints: 40,
  completed: true,
  pass: true,
};

const mockStudentItemWithoutGrades: IStudentItem = {
  id: '2',
  type: 'student_item',
  itemId: 'assignment-2',
  itemType: 'assignment',
  completed: false,
};

export const WithGrades: Story = {
  args: {
    studentItem: mockStudentItemWithGrades,
  },
};

export const WithoutGrades: Story = {
  args: {
    studentItem: mockStudentItemWithoutGrades,
  },
};

export const NoStudentItem: Story = {
  args: {
    studentItem: undefined,
  },
};

export const PartialGrades: Story = {
  args: {
    studentItem: {
      id: '3',
      type: 'student_item',
      itemId: 'assignment-3',
      itemType: 'assignment',
      nbgrades: [
        {
          grade_id_s: 'Problem 1',
          score_f: 10.0,
        },
        {
          grade_id_s: 'Problem 2',
          score_f: 5.5,
        },
      ],
      nbgradesTotalScore: 15.5,
      nbgradesTotalPoints: 25,
      completed: true,
      pass: false,
    },
  },
};

export const PerfectScore: Story = {
  args: {
    studentItem: {
      id: '4',
      type: 'student_item',
      itemId: 'assignment-4',
      itemType: 'assignment',
      nbgrades: [
        {
          grade_id_s: 'Problem 1',
          score_f: 10.0,
        },
        {
          grade_id_s: 'Problem 2',
          score_f: 10.0,
        },
        {
          grade_id_s: 'Problem 3',
          score_f: 10.0,
        },
      ],
      nbgradesTotalScore: 30.0,
      nbgradesTotalPoints: 30,
      completed: true,
      pass: true,
    },
  },
};
