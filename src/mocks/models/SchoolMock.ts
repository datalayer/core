/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { IOrganizationMember, ISchool } from "./../../models";
import { newUlid } from "../../utils";

export const newSchoolMock = (name: string) => {
  const school: ISchool = {
    id: newUlid(),
    handle: newUlid(),
    type: "school",
    name: name,
    description: name + " description.",
    public: false,
    members: [],
    students: [],
    courses: [],
    creationDate: new Date(),
    setMembers: (members: IOrganizationMember[]) => {},
  };
  return school;
};

export const SCHOOL_1_MOCK = newSchoolMock("School 1");
export const SCHOOL_2_MOCK = newSchoolMock("School 2");
export const SCHOOL_3_MOCK = newSchoolMock("School 3");

export const SCHOOLS_MOCK = [SCHOOL_1_MOCK, SCHOOL_2_MOCK, SCHOOL_3_MOCK];
