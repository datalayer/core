/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { StudentItemStatus } from './StudentItemStatus';
import { IStudent, IStudentItem } from '../../models';

const mockStudent: IStudent = {
  id: 'student-1',
  name: 'John Doe',
  email: 'john.doe@example.com',
  username: 'johndoe',
};

const meta = {
  title: 'Datalayer/Students/StudentItemStatus',
  component: StudentItemStatus,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@primer/react',
          default: {
            useTheme: () => ({
              theme: {
                colorSchemes: {
                  light: {
                    colors: {
                      success: { muted: '#28a745' },
                      severe: { muted: '#d73a49' },
                    },
                  },
                },
              },
            }),
            Tooltip: ({ children, text }) => (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                {children}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: '#24292f',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    whiteSpace: 'nowrap',
                    opacity: 0,
                    pointerEvents: 'none',
                    transition: 'opacity 0.2s',
                    zIndex: 1000,
                  }}
                >
                  {text}
                </div>
              </div>
            ),
            Button: ({ children, variant, ...props }) => (
              <button
                {...props}
                style={{
                  background:
                    variant === 'invisible' ? 'transparent' : '#f6f8fa',
                  border:
                    variant === 'invisible' ? 'none' : '1px solid #d1d9e0',
                  borderRadius: '4px',
                  padding: '4px',
                  cursor: 'pointer',
                }}
              >
                {children}
              </button>
            ),
          },
        },
        {
          path: '@datalayer/primer-addons',
          default: {
            Box: ({ children, sx, display, ml, ...props }) => (
              <div
                {...props}
                style={{
                  ...sx,
                  ...(display && { display }),
                  ...(ml && { marginLeft: `${ml * 8}px` }),
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
    student: {
      control: 'object',
      description: 'Student information',
    },
    studentItem: {
      control: 'object',
      description: 'Student item with status information',
    },
  },
} satisfies Meta<typeof StudentItemStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CompletedDataset: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-1',
      type: 'student_item',
      itemId: 'dataset-1',
      itemType: 'dataset',
      completed: true,
    } as IStudentItem,
  },
};

export const IncompleteDataset: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-2',
      type: 'student_item',
      itemId: 'dataset-2',
      itemType: 'dataset',
      completed: false,
    } as IStudentItem,
  },
};

export const CompletedLesson: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-3',
      type: 'student_item',
      itemId: 'lesson-1',
      itemType: 'lesson',
      completed: true,
    } as IStudentItem,
  },
};

export const IncompleteLesson: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-4',
      type: 'student_item',
      itemId: 'lesson-2',
      itemType: 'lesson',
      completed: false,
    } as IStudentItem,
  },
};

export const CompletedExercise: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-5',
      type: 'student_item',
      itemId: 'exercise-1',
      itemType: 'exercise',
      points: 85,
      completed: true,
    } as IStudentItem,
  },
};

export const IncompleteExercise: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-6',
      type: 'student_item',
      itemId: 'exercise-2',
      itemType: 'exercise',
      points: 0,
      completed: false,
    } as IStudentItem,
  },
};

export const AssignmentWithGrades: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-7',
      type: 'student_item',
      itemId: 'assignment-1',
      itemType: 'assignment',
      nbgrades: [
        {
          grade_id_s: 'Problem 1',
          score_f: 10,
          points_f: 10,
        },
        {
          grade_id_s: 'Problem 2',
          score_f: 8,
          points_f: 10,
        },
        {
          grade_id_s: 'Problem 3',
          score_f: 7,
          points_f: 10,
        },
      ],
      nbgradesTotalScore: 25,
      nbgradesTotalPoints: 30,
      completed: true,
    } as IStudentItem,
  },
};

export const AssignmentPartialGrades: Story = {
  args: {
    student: mockStudent,
    studentItem: {
      id: 'item-8',
      type: 'student_item',
      itemId: 'assignment-2',
      itemType: 'assignment',
      nbgrades: [
        {
          grade_id_s: 'Question 1',
          score_f: 5,
          points_f: 10,
        },
        {
          grade_id_s: 'Question 2',
          score_f: 10,
          points_f: 10,
        },
      ],
      nbgradesTotalScore: 15,
      nbgradesTotalPoints: 20,
      completed: false,
    } as IStudentItem,
  },
};

export const NoStudent: Story = {
  args: {
    student: undefined,
    studentItem: undefined,
  },
};

export const AllItemTypes: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ minWidth: '120px' }}>Completed Dataset:</span>
        <StudentItemStatus
          student={mockStudent}
          studentItem={
            {
              id: 'item-1',
              type: 'student_item',
              itemId: 'dataset-1',
              itemType: 'dataset',
              completed: true,
            } as IStudentItem
          }
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ minWidth: '120px' }}>Incomplete Lesson:</span>
        <StudentItemStatus
          student={mockStudent}
          studentItem={
            {
              id: 'item-2',
              type: 'student_item',
              itemId: 'lesson-1',
              itemType: 'lesson',
              completed: false,
            } as IStudentItem
          }
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ minWidth: '120px' }}>Completed Exercise:</span>
        <StudentItemStatus
          student={mockStudent}
          studentItem={
            {
              id: 'item-3',
              type: 'student_item',
              itemId: 'exercise-1',
              itemType: 'exercise',
              points: 90,
              completed: true,
            } as IStudentItem
          }
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{ minWidth: '120px' }}>Graded Assignment:</span>
        <StudentItemStatus
          student={mockStudent}
          studentItem={
            {
              id: 'item-4',
              type: 'student_item',
              itemId: 'assignment-1',
              itemType: 'assignment',
              nbgrades: [
                { grade_id_s: 'Q1', score_f: 10, points_f: 10 },
                { grade_id_s: 'Q2', score_f: 8, points_f: 10 },
                { grade_id_s: 'Q3', score_f: 6, points_f: 10 },
              ],
              nbgradesTotalScore: 24,
              nbgradesTotalPoints: 30,
              completed: true,
            } as IStudentItem
          }
        />
      </div>
    </div>
  ),
};
