/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { IOrganization } from "../../models/Organization";
import { newUlid } from "../../utils";
import { IOrganizationMember } from "./../../models";

const newOrganizationMock = (name: string) => {
  const organization: IOrganization = {
    id: newUlid(),
    handle: newUlid(),
    type: "organization",
    name: name,
    description: name + " description.",
    public: false,
    members: [],
    teams: [],
    creationDate: new Date(),
    setMembers: (members: IOrganizationMember[]) => {},
  };
  return organization;
};

export const ORGANISATION_1_MOCK = newOrganizationMock("Organization 1");
export const ORGANISATION_2_MOCK = newOrganizationMock("Organization 2");
export const ORGANISATION_3_MOCK = newOrganizationMock("Organization 3");

export const ORGANISATIONS_MOCK = [ORGANISATION_1_MOCK, ORGANISATION_2_MOCK, ORGANISATION_3_MOCK];
