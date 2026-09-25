/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The anonymous trial: running the public benchmark before signing up
 * (BENCHMARK.md, B2-14).
 *
 * A visitor with no account asks for a trial and gets a principal of its
 * own with one benchmark it may run, a few credits and a short expiry. The
 * work they make is owned by that principal, so when they sign up it is
 * given to them rather than lost — `claimTrial` in the evals client moves
 * it, and the trial's own key has to be presented alongside their new one.
 *
 * A deployment that has not named a public benchmark offers no trials, and
 * `getTrialOffer` says so: a page asks before it shows the button.
 *
 * @module api/iam/trials
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';

/** Where a claim carries the trial's own key. */
export const TRIAL_TOKEN_HEADER = 'X-Datalayer-Trial-Token';

/** What a visitor may try here, if anything. */
export interface TrialOffer {
  offered: boolean;
  /** The one benchmark a trial may run. */
  evalsetId: string;
  /** The credits it may spend. */
  credits: number;
  /** How long it lives, in seconds. */
  ttlSeconds: number;
}

export interface Trial {
  id: string;
  /** The uid the trial's work is owned by, which is the trial's own. */
  ownerUid: string;
  state: 'open' | 'claimed' | 'expired';
  evalsetId: string;
  creditsLimit: number | null;
  creditsSpent: number;
  expiresAt: string | null;
  claimedByUid: string;
  claimedAt: string | null;
}

/** A trial and the key that acts as it. The key is answered once. */
export interface IssuedTrial {
  trial: Trial;
  token: string;
}

interface TrialWire {
  id: string;
  owner_uid?: string;
  state?: Trial['state'];
  evalset_id?: string;
  credits_limit?: number | null;
  credits_spent?: number;
  expires_at?: string | null;
  claimed_by_uid?: string;
  claimed_at?: string | null;
}

const trialsUrl = (baseUrl: string, suffix = ''): string =>
  `${baseUrl}${API_BASE_PATHS.IAM}/trials${suffix}`;

const asTrial = (wire: TrialWire): Trial => ({
  id: wire.id,
  ownerUid: wire.owner_uid ?? wire.id,
  state: wire.state ?? 'open',
  evalsetId: wire.evalset_id ?? '',
  creditsLimit: wire.credits_limit ?? null,
  creditsSpent: wire.credits_spent ?? 0,
  expiresAt: wire.expires_at ?? null,
  claimedByUid: wire.claimed_by_uid ?? '',
  claimedAt: wire.claimed_at ?? null,
});

/**
 * Whether this deployment lets a visitor try a benchmark, and which one.
 * Unauthenticated: it is what a public page asks before it offers the run.
 */
export const getTrialOffer = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<TrialOffer> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    offered: boolean;
    evalset_id?: string;
    credits?: number;
    ttl_seconds?: number;
  }>({ url: trialsUrl(baseUrl, '/offer'), method: 'GET' });
  return {
    offered: !!response.offered,
    evalsetId: response.evalset_id ?? '',
    credits: response.credits ?? 0,
    ttlSeconds: response.ttl_seconds ?? 0,
  };
};

/** Take a trial. Unauthenticated, rate limited, and refused where none are offered. */
export const createTrial = async (
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<IssuedTrial> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    trial: TrialWire;
    token: string;
  }>({ url: trialsUrl(baseUrl), method: 'POST' });
  return { trial: asTrial(response.trial), token: response.token };
};

/** The trial a key acts as: what it has left, and how long it has. */
export const getCurrentTrial = async (
  trialToken: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.IAM,
): Promise<Trial> => {
  const response = await requestDatalayerAPI<{
    success: boolean;
    trial: TrialWire;
  }>({
    url: trialsUrl(baseUrl, '/me'),
    method: 'GET',
    token: trialToken,
  });
  return asTrial(response.trial);
};
