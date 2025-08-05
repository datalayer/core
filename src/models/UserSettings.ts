/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const AI_AGENTS_URL_KEY = "aiagents_url_s";
export const CAN_INVITE_URL_KEY = "can_invite_b";

export type IUserSettings = {
  aiAgentsUrl?: string;
  canInvite?: boolean;
};

export class UserSettings implements IUserSettings {
  private _aiAgentsUrl?: string;
  private _canInvite?: boolean;

  constructor (s: any) {
    this._aiAgentsUrl = s[AI_AGENTS_URL_KEY] ?? undefined;
    this._canInvite = s[CAN_INVITE_URL_KEY] ?? undefined;
  }

  get aiAgentsUrl(): string | undefined {
    return this._aiAgentsUrl;
  }

  set aiAgentsUrl(value: string | undefined) {
    this._aiAgentsUrl = value;
  }

  get canInvite(): boolean | undefined {
    return this._canInvite;
  }

  set canInvite(value: boolean | undefined) {
    this._canInvite = value;
  }

}

export default UserSettings;
