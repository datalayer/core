/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const WELCOME_RUNTIME_TOUR_NAME = 'welcome-runtime';

export const BOOTSTRAP_USER_ONBOARDING: IUserOnboarding = {
  clients: {
    Platform: 0,
    JupyterLab: 0,
    CLI: 0,
    VSCode: 0,
  },
  position: 'top',
  tours: {
    'welcome-runtime': {
      status: 'ready',
    },
  },
};

export type IOnboardingPosition = 'top' | 'bottom' | 'invisible' | 'sidebar';

export type ITourStatus =
  | 'idle'
  | 'ready'
  | 'waiting'
  | 'running'
  | 'paused'
  | 'skipped'
  | 'finished'
  | 'error';

export type ITour = {
  status: ITourStatus;
};

export type IOnboardingTours = Record<string, ITour>;

export type IClient = 'Platform' | 'JupyterLab' | 'CLI' | 'VSCode';

export type IUserOnboarding = {
  clients: Record<IClient, number>;
  position: IOnboardingPosition;
  tours: IOnboardingTours;
};

/**
 * The user's onboarding, as IAM keeps it: a child of the user whose fields
 * say the guide's position (`position_s`), each client's progress
 * (`client_<client>_i`) and each tour's status (`tour_<tour>_status_s`), over
 * what nothing has said yet. Read from the old `onboarding_s` string, a
 * status saved since was never seen: the welcome tour started again on every
 * load and was saved again (13 October 2026).
 */
export const userOnboardingOf = (child: unknown): IUserOnboarding => {
  const stored = (Array.isArray(child) ? child[0] : child) as
    Record<string, unknown> | undefined;
  const onboarding: IUserOnboarding = {
    clients: { ...BOOTSTRAP_USER_ONBOARDING.clients },
    position: BOOTSTRAP_USER_ONBOARDING.position,
    tours: { ...BOOTSTRAP_USER_ONBOARDING.tours },
  };
  if (!stored || typeof stored !== 'object') {
    return onboarding;
  }
  if (typeof stored.position_s === 'string') {
    onboarding.position = stored.position_s as IOnboardingPosition;
  }
  for (const [key, value] of Object.entries(stored)) {
    const client = /^client_(.+)_i$/.exec(key)?.[1];
    if (client && typeof value === 'number') {
      onboarding.clients[client as IClient] = value;
    }
    const tour = /^tour_(.+)_status_s$/.exec(key)?.[1];
    if (tour && typeof value === 'string') {
      onboarding.tours[tour] = { status: value as ITourStatus };
    }
  }
  return onboarding;
};
