/*
 * Copyright (c) 2023-2026 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * The Scheduler API, one function per endpoint this UI uses.
 *
 * Paths mirror `datalayer_scheduler/api/v1/endpoints/schedules.py`. Only
 * the routes a schedule's own management needs are wrapped here — the
 * notebook-run reading and reporting routes `views/schedules/Schedules.tsx`
 * already reaches directly stay as they are.
 *
 * @module api/scheduler/client
 */

import {
  schedulerRequest,
  scheduleSegment,
  type SchedulerClientOptions,
} from './request';
import type {
  ScheduleListResponse,
  ScheduleResponse,
  ScheduleRunListResponse,
  UpdateScheduleRequest,
  UpsertScheduleRequest,
} from './types';

/** Every schedule the caller owns, `notebook` and `evalset` alike. */
export const listSchedules = (
  options: SchedulerClientOptions,
  query: { includeDisabled?: boolean } = {},
) =>
  schedulerRequest<ScheduleListResponse>(options, '/schedules', {
    query: { includeDisabled: query.includeDisabled },
  });

/** One schedule. */
export const getSchedule = (
  options: SchedulerClientOptions,
  scheduleUid: string,
) =>
  schedulerRequest<ScheduleResponse>(
    options,
    `/schedules/${scheduleSegment(scheduleUid)}`,
  );

/**
 * Create the one schedule a target has, or replace it (BENCHMARK.md, B2-16):
 * a schedule is unique per owner and target, so upserting is how a person
 * changes an `evalset` schedule's cron or configuration too.
 */
export const upsertSchedule = (
  options: SchedulerClientOptions,
  body: UpsertScheduleRequest,
) =>
  schedulerRequest<ScheduleResponse>(options, '/schedules', {
    method: 'POST',
    body,
  });

/** Change a schedule's cron expression, preset or enabled flag. */
export const updateSchedule = (
  options: SchedulerClientOptions,
  scheduleUid: string,
  body: UpdateScheduleRequest,
) =>
  schedulerRequest<ScheduleResponse>(
    options,
    `/schedules/${scheduleSegment(scheduleUid)}`,
    { method: 'PUT', body },
  );

/** Turn a schedule off, without losing its cron and configuration. */
export const disableSchedule = (
  options: SchedulerClientOptions,
  scheduleUid: string,
) =>
  schedulerRequest<ScheduleResponse>(
    options,
    `/schedules/${scheduleSegment(scheduleUid)}/disable`,
    { method: 'POST' },
  );

/** The runs of one schedule, newest first. */
export const listScheduleRuns = (
  options: SchedulerClientOptions,
  scheduleUid: string,
) =>
  schedulerRequest<ScheduleRunListResponse>(
    options,
    `/schedules/${scheduleSegment(scheduleUid)}/runs`,
  );

/** Every run of every schedule the caller owns, newest first. */
export const listAllScheduleRuns = (options: SchedulerClientOptions) =>
  schedulerRequest<ScheduleRunListResponse>(options, '/schedules/runs');
