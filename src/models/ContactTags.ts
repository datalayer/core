/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export type IContactTag = {
  handle: string;
};

export class ContactTags {
  private constructor() {}

  static readonly Called: IContactTag = {
    handle: 'called',
  };
  static readonly ConentCreatorAI: IContactTag = {
    handle: 'content-creator-ai',
  };
  static readonly ContentCreatorDev: IContactTag = {
    handle: 'content-creator-dev',
  };
  static readonly ContentCreatorJupyter: IContactTag = {
    handle: 'content-creator-jupyter',
  };
  static readonly HardNo: IContactTag = {
    handle: 'hard-no',
  };
  static readonly HasJoined: IContactTag = {
    handle: 'has-joined',
  };
  static readonly Interested: IContactTag = {
    handle: 'interested',
  };
  static readonly KeenCall: IContactTag = {
    handle: 'keen-call',
  };
  static readonly KeenCreateContent: IContactTag = {
    handle: 'keen-create-content',
  };
  static readonly KeenKnowMore: IContactTag = {
    handle: 'keen-know-more',
  };
  static readonly NoReplySofar: IContactTag = {
    handle: 'no-reply-sofar',
  };
  static readonly NoTimeNow: IContactTag = {
    handle: 'no-time-now',
  };
  static readonly NotInterested: IContactTag = {
    handle: 'not-interested',
  };
  static readonly UsingOtherSolution: IContactTag = {
    handle: 'using-other-solution',
  };
  static readonly WillTry: IContactTag = {
    handle: 'will-try',
  };
  static readonly GithubStargazer: IContactTag = {
    handle: 'github-stargazer',
  };
  static readonly ALL_TAGS: IContactTag[] = [
    ContactTags.Called,
    ContactTags.ConentCreatorAI,
    ContactTags.ContentCreatorDev,
    ContactTags.ContentCreatorJupyter,
    ContactTags.HardNo,
    ContactTags.HasJoined,
    ContactTags.Interested,
    ContactTags.KeenCall,
    ContactTags.KeenCreateContent,
    ContactTags.KeenKnowMore,
    ContactTags.NoReplySofar,
    ContactTags.NotInterested,
    ContactTags.NoTimeNow,
    ContactTags.UsingOtherSolution,
    ContactTags.WillTry,
    ContactTags.GithubStargazer,
  ];
}
