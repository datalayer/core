/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const asUserEvent = (u: any): IUserEvent => {
  return {
    id: u.uid,
    message: u.message_t ?? '',
    subType: u.sub_type_s,
    detailsJson: u.details_json_t ?? '',
    token: u.token_s,
    eventDate: u.event_ts_dt,
  }
}

export type IUserEvent = {
  id: string;
  subType: string;
  token: string;
  detailsJson: string,
  message: string;
  eventDate: string;
}

export default IUserEvent;
