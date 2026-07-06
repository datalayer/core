/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import {
  requestDatalayerAPI,
  type RunResponseError,
} from '../../api/DatalayerApi';
import {
  ISurvey,
  asSurvey,
  IGetSurveysResponseType,
  ICreateSurveyResponseType,
} from '../../models';
import { coreStore } from './CoreState';
import { iamStore } from './IAMState';

export type ISuccessState = {
  growthUrl: string;
  surveys?: Map<string, ISurvey>;
};

export type SuccessState = ISuccessState & {
  setSurveys: (surveys: Array<ISurvey>) => void;
  refreshSurveys: () => void;
  createSurvey: (name: string, form: any) => void;
};

export const surveysStore = createStore<SuccessState>((set, get) => ({
  surveys: undefined,
  growthUrl: coreStore.getState().configuration?.growthUrl,
  setSurveys: (s: Array<ISurvey>) => {
    const surveys = new Map<string, ISurvey>();
    s.forEach(survey => surveys.set(survey.name, survey));
    set((state: SuccessState) => ({ surveys }));
  },
  refreshSurveys: async () => {
    const { token } = iamStore.getState();
    const { growthUrl } = get();
    try {
      const resp = await requestDatalayerAPI<IGetSurveysResponseType>({
        url: `${growthUrl}/api/growth/v1/surveys`,
        method: 'GET',
        token,
      });
      if (resp.success && resp.surveys) {
        const surveyArray = resp.surveys.map(survey => asSurvey(survey));
        const surveys = new Map<string, ISurvey>();
        surveyArray.forEach(survey => surveys.set(survey.name, survey));
        set((state: SuccessState) => ({ surveys }));
      } else {
        console.error('Failed to get the surveys.', resp);
      }
    } catch (error) {
      console.error('Failed to get the surveys.', error);
      if (
        (error as RunResponseError).name === 'RunResponseError' &&
        (error as RunResponseError).response.status === 401
      ) {
        console.error('Received 401, logging out.');
      }
      throw error;
    }
  },
  createSurvey: async (name: string, form: any) => {
    const { growthUrl } = get();
    const { token } = iamStore.getState();
    try {
      const resp = await requestDatalayerAPI<ICreateSurveyResponseType>({
        url: `${growthUrl}/api/growth/v1/surveys`,
        method: 'POST',
        body: {
          name,
          form,
        },
        token,
      });
      if (resp.success && resp.survey) {
        const survey = asSurvey(resp.survey);
        const surveys = get().surveys;
        if (surveys) {
          surveys.set(survey.name, survey);
          set((state: SuccessState) => ({ surveys }));
        } else {
          set((state: SuccessState) => ({
            surveys: new Map<string, ISurvey>([[survey.name, survey]]),
          }));
        }
      } else {
        console.error('Failed to create the survey.', resp);
      }
    } catch (error) {
      console.error('Failed to create the survey.', error);
      if (
        (error as RunResponseError).name === 'RunResponseError' &&
        (error as RunResponseError).response.status === 401
      ) {
        console.error('Received 401, logging out.');
      }
      throw error;
    }
  },
}));

coreStore.subscribe((state, prevState) => {
  if (
    state.configuration.successUrl &&
    state.configuration.successUrl !== prevState.configuration.successUrl
  ) {
    const growthUrl = state.configuration.growthUrl;
    console.log(`Updating growthUrl with new value ${growthUrl}`);
    surveysStore.setState({ growthUrl });
  }
});

export function useSurveysStore(): SuccessState;
export function useSurveysStore<T>(selector: (state: SuccessState) => T): T;
export function useSurveysStore<T>(selector?: (state: SuccessState) => T) {
  return useStore(surveysStore, selector!);
}

export default useSurveysStore;
