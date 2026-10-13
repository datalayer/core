/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, expect, it } from 'vitest';
import { BOOTSTRAP_USER_ONBOARDING, userOnboardingOf } from '../UserOnboarding';

describe('userOnboardingOf', () => {
  it('reads the tour status IAM keeps, so a finished tour stays finished', () => {
    const onboarding = userOnboardingOf({
      type_s: 'user_onboarding',
      completed_steps_ss: [],
      position_s: 'bottom',
      client_Platform_i: 2,
      'tour_welcome-runtime_status_s': 'finished',
    });
    expect(onboarding.tours['welcome-runtime'].status).toBe('finished');
    expect(onboarding.position).toBe('bottom');
    expect(onboarding.clients.Platform).toBe(2);
    expect(onboarding.clients.JupyterLab).toBe(0);
  });

  it('accepts a single child spelled as a one-element list', () => {
    expect(
      userOnboardingOf([{ 'tour_welcome-runtime_status_s': 'skipped' }]).tours[
        'welcome-runtime'
      ].status,
    ).toBe('skipped');
  });

  it('starts from the bootstrap when nothing is kept, without sharing it', () => {
    const onboarding = userOnboardingOf(undefined);
    expect(onboarding).toEqual(BOOTSTRAP_USER_ONBOARDING);
    onboarding.tours['welcome-runtime'] = { status: 'finished' };
    expect(BOOTSTRAP_USER_ONBOARDING.tours['welcome-runtime'].status).toBe(
      'ready',
    );
  });
});
