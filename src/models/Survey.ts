/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const asSurvey = (s: any): ISurvey => {
  return {
    id: s.uid,
    name: s.name_s,
    userId: s.user_id,
    form: s.form,
    createdAt: new Date(s.creation_ts_dt),
    updatedAt: new Date(s.last_update_ts_dt),
  }
}

export type ICreateSurveyResponseType = {
  success: boolean;
  message: string;
  survey: ISurvey;
}

export type IGetSurveysResponseType = {
  success: boolean;
  message: string;
  surveys: Array<ISurvey>;
}

export type ISurvey = {
  id: string;
  name: string;
  userId: string;
  form: any;
  createdAt: Date;
  updatedAt: Date;
};

export default ISurvey;
