/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import Form from '@datalayer/primer-rjsf';
import { RJSFSchema } from '@rjsf/utils';
import validator from '@rjsf/validator-ajv8';
import { ISurveyProps } from './SurveyProps';

const schema: RJSFSchema = {
  type: 'object',
  required: ['profile_s', 'activities_txt'],
  properties: {
    profile_s: {
      title: 'Your profile',
      $ref: '#/definitions/Profile',
    },
    activities_txt: {
      type: 'array',
      uniqueItems: true,
      items: {
        $ref: '#/definitions/Activities',
      },
      title: 'What do you need to achieve with data?',
    },
  },
  definitions: {
    Profile: {
      title: 'Profile',
      type: 'string',
      anyOf: [
        {
          type: 'string',
          enum: ['beginner student'],
          title: 'Beginner / Student',
        },
        {
          type: 'string',
          enum: ['researcher phd'],
          title: 'Researcher / Phd',
        },
        {
          type: 'string',
          enum: ['data analyst scientist'],
          title: 'Data Analyst / Scientist',
        },
        {
          type: 'string',
          enum: ['startup'],
          title: 'Startup',
        },
        {
          type: 'string',
          enum: ['data platform builder'],
          title: 'Data Platform Builder',
        },
      ],
    },
    Activities: {
      title: 'Activities',
      type: 'string',
      anyOf: [
        {
          type: 'string',
          enum: ['learn how to analyse data'],
          title: ' Learn how to analyse data',
        },
        {
          type: 'string',
          enum: [
            'scale my laptop jupyter notebook with stronger cpu gpu memory',
          ],
          title:
            'Scale my laptop Jupyter Notebook with stronger CPU/GPU/Memory',
        },
        {
          type: 'string',
          enum: ['scale from jupyterhub with stronger cpu gpu memory'],
          title: 'Scale from JupyterHub with stronger CPU/GPU/Memory',
        },
        {
          type: 'string',
          enum: ['create ai models'],
          title: 'Create AI models',
        },
        {
          type: 'string',
          enum: ['work in team on jupyter notebooks'],
          title: 'Work in team on Jupyter Notebooks',
        },
        {
          type: 'string',
          enum: ['publis and share my data analysis'],
          title: 'Publish and share my data analysis',
        },
      ],
    },
  },
};

const uiSchema: RJSFSchema = {
  'ui:submitButtonOptions': {
    submitText: 'Save',
  },
};

export const Survey2025_1 = (props: ISurveyProps) => {
  const { onSubmit, formData, readonly = false } = props;
  return (
    <>
      <Form
        readonly={readonly}
        formData={formData}
        schema={schema}
        uiSchema={uiSchema}
        validator={validator}
        onSubmit={onSubmit}
        disabled={readonly}
      />
    </>
  );
};

export default Survey2025_1;
