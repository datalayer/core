/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */


export class URN implements IURN {
  private _partition: string;
  private _service: string;
  private _region: string;
  private _account: string;
  private _type: string;
  private _uid: string;
//  private _path: string;

  constructor(urn: string) {
    const parts = urn.split(":");
    this._partition = parts[1];
    this._service = parts[2];
    this._region = parts[3];
    this._account = parts[4];
    this._type = parts[5];
    this._uid = parts[6];
  }

  get partition() {
    return this._partition;
  }

  get service() {
    return this._service;
  }

  get region() {
    return this._region;
  }

  get account() {
    return this._account;
  }

  get type() {
    return this._type;
  }

  get uid() {
    return this._uid;
  }

}

/**
  Datalayer Uniform Resource Name (URN)

  @see https://en.wikipedia.org/wiki/Uniform_Resource_Name
  @see https://learn.microsoft.com/en-us/linkedin/shared/api-guide/concepts/urns
  @see https://docs.aws.amazon.com/IAM/latest/UserGuide/reference-arns.html

  urn:partition:service:region:account:type:uid
  urn:partition:service:region:account:type:uid/path/subpath

  Examples:
  - Account should be the uid.
  - We are using in the examples some names to make it easier to read.

  IAM Account
  - urn:dla:iam:::user:eric
  - urn:dla:iam:::organization:datalayer
  - urn:dla:iam:::team:developers

  IAM Providers
  - urn:dla:iam:ext::github:xyz

  Objects
  - urn:dla:spacer:::space:space-1
  - urn:dla:spacer:::notebook:data-analysis/data-analysis.ipynb
  - urn:dla:spacer:::cell:a-simple-cell
  - urn:dla:spacer:us-east-1::dataset:cities/cities.csv
  - urn:dla:edu:::course:course-1
  - urn:dla:edu:::lesson:advanced-python/advanced-python.ipynb
  - urn:dla:edu:::exercise:loop-with-python
  - urn:dla:library:::notebook:notebook-1
  - urn:dla:app:::panel:new-york-taxis

  Relations
  - urn:dla:iam::run:relation:CourseInstructor/python-advanced
  - urn:dla:iam::run:relation:OrganizationMember
  - urn:dla:iam::run:relation:ReadCourseNotebook/python-advanced
  - urn:dla:iam::run:relation:SpaceReader/simple-analysis
  - urn:dla:iam::run:relation:TeamMember/developers
*/
export type IURN = {
  partition: string;
  service: string;
  region: string;
  account: string;
  type: string;
  uid: string;
//  path: string;
}
