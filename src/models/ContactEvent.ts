/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

export const asContactEvent = (ce: any): IContactEvent => {
  return {
    id: ce.uid,
    message: ce.message ?? '',
    subType: ce.subType,
    detailsJson: ce.detailsJson ?? '',
    token: ce.token,
    eventDate: ce.eventDate,
  }
}

export type IContactEvent = {
  id: string;
  subType: string;
  token: string;
  detailsJson: string,
  message: string;
  eventDate: string;
}

export default IContactEvent;
