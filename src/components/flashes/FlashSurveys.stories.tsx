/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { FlashSurveys, SURVEY_2025_1_NAME } from './FlashSurveys';

const meta = {
  title: 'Datalayer/Flashes/FlashSurveys',
  component: FlashSurveys,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useSurveysStore: () => ({
              surveys: new Map(),
              createSurvey: (name: string, data: any) => {
                console.log('Creating survey:', name, data);
              },
            }),
            useCoreStore: () => ({
              configuration: { whiteLabel: false },
            }),
          },
        },
        {
          path: './surveys',
          default: {
            Survey2025_1: ({ formData, onSubmit }: any) => (
              <div>
                <p>Mock Survey Component</p>
                <button
                  onClick={() =>
                    onSubmit({ formData: { question1: 'answer1' } })
                  }
                >
                  Submit Survey
                </button>
              </div>
            ),
          },
        },
      ],
    },
  },
  argTypes: {
    surveyName: {
      control: 'text',
      description: 'Specific survey name to show',
    },
  },
} satisfies Meta<typeof FlashSurveys>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SpecificSurvey: Story = {
  args: {
    surveyName: SURVEY_2025_1_NAME,
  },
};

export const WithExistingSurvey: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useSurveysStore: () => ({
              surveys: new Map([
                [
                  SURVEY_2025_1_NAME,
                  { form: { question1: 'previous answer' } },
                ],
              ]),
              createSurvey: (name: string, data: any) => {
                console.log('Creating survey:', name, data);
              },
            }),
            useCoreStore: () => ({
              configuration: { whiteLabel: false },
            }),
          },
        },
        {
          path: './surveys',
          default: {
            Survey2025_1: ({ formData, onSubmit }: any) => (
              <div>
                <p>Mock Survey Component (Already Completed)</p>
                <p>Previous data: {JSON.stringify(formData)}</p>
                <button
                  onClick={() =>
                    onSubmit({ formData: { question1: 'updated answer' } })
                  }
                >
                  Update Survey
                </button>
              </div>
            ),
          },
        },
      ],
    },
  },
};

export const WhiteLabelHidden: Story = {
  parameters: {
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '../../hooks',
          default: {
            useToast: () => ({
              enqueueToast: (message: string, options?: any) => {
                console.log('Toast:', message, options);
              },
            }),
          },
        },
        {
          path: '../../state',
          default: {
            useSurveysStore: () => ({
              surveys: new Map(),
              createSurvey: (name: string, data: any) => {
                console.log('Creating survey:', name, data);
              },
            }),
            useCoreStore: () => ({
              configuration: { whiteLabel: true },
            }),
          },
        },
        {
          path: './surveys',
          default: {
            Survey2025_1: ({ formData, onSubmit }: any) => (
              <div>Survey Component (should be hidden)</div>
            ),
          },
        },
      ],
    },
  },
};
