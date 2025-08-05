/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const WELCOME_RUNTIME_TOUR_NAME = "welcome-runtime";

export const BOOTSTRAP_USER_ONBOARDING: IUserOnboarding = {
  clients: {
    "Platform": 0,
    "JupyterLab": 0,
    "CLI": 0,
    "VSCode": 0,
  },
  position: 'top',
  tours: {
    "welcome-runtime": {
      status: "ready",
    },
  },
}

export type IOnboardingPosition = 
| 'top'
| 'bottom'
| 'invisible'
| 'sidebar'
;

export type ITourStatus = 
| "idle"
| "ready"
| "waiting"
| "running"
| "paused"
| "skipped"
| "finished"
| "error"
;

export type ITour = {
  status: ITourStatus;
}

export type IOnboardingTours = Record<string, ITour>

export type IClient = 
| 'Platform'
| 'JupyterLab'
| 'CLI'
| 'VSCode'
;

export type IUserOnboarding = {
  clients: Record<IClient, number>,
  position: IOnboardingPosition,
  tours: IOnboardingTours,
}
