/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import type { Meta, StoryObj } from '@storybook/react-vite';

import { Survey2025_1 } from './Survey2025_1';

const meta = {
  title: 'Datalayer/Flashes/Surveys/Survey2025_1',
  component: Survey2025_1,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    mockAddonConfigs: {
      globalMockData: [
        {
          path: '@datalayer/primer-rjsf',
          default: ({
            schema,
            uiSchema,
            formData,
            onSubmit,
            readonly,
            disabled,
            validator,
          }) => {
            const handleSubmit = e => {
              e.preventDefault();
              const formDataFromForm = new FormData(e.target);
              const data = Object.fromEntries(formDataFromForm);
              onSubmit?.({ formData: data }, e);
            };

            return (
              <div
                style={{
                  border: '1px solid #d1d9e0',
                  borderRadius: '6px',
                  padding: '16px',
                  maxWidth: '500px',
                }}
              >
                <form onSubmit={handleSubmit}>
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      Your profile *
                    </label>
                    <select
                      name="profile_s"
                      disabled={disabled}
                      defaultValue={formData?.profile_s || ''}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #d1d9e0',
                        borderRadius: '6px',
                      }}
                    >
                      <option value="">Select your profile</option>
                      <option value="beginner student">
                        Beginner / Student
                      </option>
                      <option value="researcher phd">Researcher / Phd</option>
                      <option value="data analyst scientist">
                        Data Analyst / Scientist
                      </option>
                      <option value="startup">Startup</option>
                      <option value="data platform builder">
                        Data Platform Builder
                      </option>
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '8px',
                        fontWeight: 600,
                      }}
                    >
                      What do you need to achieve with data? *
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      {[
                        {
                          value: 'learn how to analyse data',
                          label: 'Learn how to analyse data',
                        },
                        {
                          value:
                            'scale my laptop jupyter notebook with stronger cpu gpu memory',
                          label:
                            'Scale my laptop Jupyter Notebook with stronger CPU/GPU/Memory',
                        },
                        {
                          value:
                            'scale from jupyterhub with stronger cpu gpu memory',
                          label:
                            'Scale from JupyterHub with stronger CPU/GPU/Memory',
                        },
                        {
                          value: 'create ai models',
                          label: 'Create AI models',
                        },
                        {
                          value: 'work in team on jupyter notebooks',
                          label: 'Work in team on Jupyter Notebooks',
                        },
                        {
                          value: 'publis and share my data analysis',
                          label: 'Publish and share my data analysis',
                        },
                      ].map(activity => (
                        <label
                          key={activity.value}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <input
                            type="checkbox"
                            name="activities_txt"
                            value={activity.value}
                            disabled={disabled}
                            defaultChecked={formData?.activities_txt?.includes(
                              activity.value,
                            )}
                          />
                          <span>{activity.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {!readonly && (
                    <div style={{ textAlign: 'right' }}>
                      <button
                        type="submit"
                        style={{
                          backgroundColor: '#0969da',
                          color: 'white',
                          border: '1px solid #0969da',
                          borderRadius: '6px',
                          padding: '8px 16px',
                          cursor: disabled ? 'not-allowed' : 'pointer',
                          opacity: disabled ? 0.5 : 1,
                        }}
                        disabled={disabled}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </form>
              </div>
            );
          },
        },
        {
          path: '@rjsf/validator-ajv8',
          default: {
            // Mock validator - in a real implementation this would validate the form
            validate: () => ({ errors: [] }),
          },
        },
      ],
    },
  },
  argTypes: {
    readonly: {
      control: 'boolean',
      description: 'Whether the form is readonly',
    },
    formData: {
      control: 'object',
      description: 'Pre-populated form data',
    },
  },
} satisfies Meta<typeof Survey2025_1>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted:', data);
    },
    readonly: false,
  },
};

export const WithPrefilledData: Story = {
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted:', data);
    },
    readonly: false,
    formData: {
      profile_s: 'data analyst scientist',
      activities_txt: [
        'scale my laptop jupyter notebook with stronger cpu gpu memory',
        'create ai models',
        'work in team on jupyter notebooks',
      ],
    },
  },
};

export const ReadonlyMode: Story = {
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted (readonly):', data);
    },
    readonly: true,
    formData: {
      profile_s: 'researcher phd',
      activities_txt: [
        'learn how to analyse data',
        'create ai models',
        'publis and share my data analysis',
      ],
    },
  },
};

export const BeginnerStudent: Story = {
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted:', data);
    },
    readonly: false,
    formData: {
      profile_s: 'beginner student',
      activities_txt: [
        'learn how to analyse data',
        'scale my laptop jupyter notebook with stronger cpu gpu memory',
      ],
    },
  },
};

export const DataPlatformBuilder: Story = {
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted:', data);
    },
    readonly: false,
    formData: {
      profile_s: 'data platform builder',
      activities_txt: [
        'scale from jupyterhub with stronger cpu gpu memory',
        'work in team on jupyter notebooks',
        'publis and share my data analysis',
      ],
    },
  },
};

export const InteractiveDemo: Story = {
  render: args => {
    return (
      <div style={{ padding: '16px', maxWidth: '600px' }}>
        <h3>2025 Data Survey</h3>
        <p style={{ marginBottom: '16px', color: '#656d76' }}>
          Help us understand your data needs and how we can better serve you.
          This survey includes questions about your profile and data-related
          activities.
        </p>
        <Survey2025_1 {...args} />
        <div style={{ marginTop: '16px', fontSize: '12px', color: '#656d76' }}>
          <p>
            <strong>Survey Features:</strong>
          </p>
          <ul>
            <li>Profile selection (required)</li>
            <li>Multiple activity selection (required)</li>
            <li>Form validation</li>
            <li>Readonly mode available</li>
          </ul>
        </div>
      </div>
    );
  },
  args: {
    onSubmit: (data, e) => {
      console.log('Survey submitted:', data);
      alert('Survey submitted! Check console for data.');
    },
    readonly: false,
  },
};
