/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The Scheduler API's own shapes.
 *
 * A schedule and a schedule run are Solr documents the service answers
 * as they are stored — field suffixes and all — rather than a projection:
 * `views/schedules/Schedules.tsx` has always read them this way, and these
 * types describe that wire shape rather than inventing a cleaner one the
 * service does not actually send.
 *
 * @module api/scheduler/types
 */

/** What a schedule runs. `notebook` is every schedule from before B2-16. */
export type ScheduleTargetKind = 'notebook' | 'evalset';

/** One schedule, as the service answers it. */
export interface ScheduleRecord {
  uid: string;
  owner_uid_s: string;
  owner_handle_s?: string;
  owner_display_name_s?: string;
  principal_kind_s?: string;
  billing_entity_uid_s?: string;
  target_kind_s: ScheduleTargetKind | string;
  /** The evalset id or, for a notebook schedule, the notebook uid. */
  target_uid_s: string;
  /** Set only for a notebook schedule. */
  notebook_uid_s?: string;
  cron_expression_s: string;
  preset_s: string;
  enabled_b: boolean;
  /** What the target is run with, as JSON text — parse with `scheduleConfigOf`. */
  config_json_t?: string;
  next_planned_ts_dt?: string;
  creation_ts_dt?: string;
  last_update_ts_dt?: string;
}

/** What an `evalset` schedule's `config_json_t` holds (BENCHMARK.md, B2-16). */
export interface EvalsetScheduleConfig {
  /** Empty means every live experiment of the evalset, resolved at run time. */
  experiment_ids?: string[];
  run_mode?: 'batch' | 'interactive';
  config?: Record<string, unknown>;
}

export type ScheduleRunState =
  | 'planned'
  | 'running'
  | 'dispatched'
  | 'executed'
  | 'executed_with_failure'
  | 'failed';

/** One run of a schedule, as the service answers it. */
export interface ScheduleRunRecord {
  uid: string;
  schedule_uid_s: string;
  owner_uid_s: string;
  target_kind_s: ScheduleTargetKind | string;
  target_uid_s: string;
  notebook_uid_s?: string;
  state_s: ScheduleRunState | string;
  success_b?: boolean | null;
  result_s?: string;
  planned_ts_dt?: string;
  executed_ts_dt?: string;
  last_update_ts_dt?: string;
}

export interface ScheduleListResponse {
  success: boolean;
  message: string;
  schedules: ScheduleRecord[];
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  schedule: ScheduleRecord;
}

export interface ScheduleRunListResponse {
  success: boolean;
  message: string;
  runs: ScheduleRunRecord[];
}

/** `POST /schedules`: create, or replace the one schedule a target has. */
export interface UpsertScheduleRequest {
  targetUid: string;
  targetKind?: ScheduleTargetKind;
  cronExpression: string;
  preset?: string;
  enabled?: boolean;
  config?: EvalsetScheduleConfig;
}

/** `PUT /schedules/{uid}`: change one field or more of an existing schedule. */
export interface UpdateScheduleRequest {
  cronExpression?: string;
  preset?: string;
  enabled?: boolean;
}
