/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export const AI_AGENTS_URL_KEY = 'aiAgents_url_s';
export const CAN_INVITE_URL_KEY = 'can_invite_b';
export const DOCS_IN_PLACE_KEY = 'docs_in_place_b';
export const SHOW_ADVANCED_KEY = 'show_advanced_b';

export type IUserSettings = {
  aiAgentsUrl?: string;
  canInvite?: boolean;
  /**
   * Whether the documentation opens inside the application shell, keeping the
   * navigation alongside it, rather than taking over the window.
   *
   * Undefined means the user has never chosen, which reads as `true`: opening
   * in place is the default. Only a deliberate `false` takes the reader to the
   * full-window documentation.
   */
  docsInPlace?: boolean;
  /**
   * Whether the Studio shows what a Maker does not need — *Show advanced*.
   *
   * Undefined means the user has never chosen: the Studio makes a first
   * choice for them, and keeps it here.
   */
  showAdvanced?: boolean;
};

export class UserSettings implements IUserSettings {
  private _aiAgentsUrl?: string;
  private _canInvite?: boolean;
  private _docsInPlace?: boolean;
  private _showAdvanced?: boolean;

  constructor(s: any) {
    this._aiAgentsUrl = s[AI_AGENTS_URL_KEY] ?? undefined;
    this._canInvite = s[CAN_INVITE_URL_KEY] ?? undefined;
    this._docsInPlace = s[DOCS_IN_PLACE_KEY] ?? undefined;
    this._showAdvanced = s[SHOW_ADVANCED_KEY] ?? undefined;
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

  get docsInPlace(): boolean | undefined {
    return this._docsInPlace;
  }

  set docsInPlace(value: boolean | undefined) {
    this._docsInPlace = value;
  }

  get showAdvanced(): boolean | undefined {
    return this._showAdvanced;
  }

  set showAdvanced(value: boolean | undefined) {
    this._showAdvanced = value;
  }
}

export default UserSettings;
