/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ISignal, Signal } from '@lumino/signaling';
import { coreStore } from '../state';

export const FORCE_ACTIVATE_RUNTIMES_PLUGINS = false;

export type IDatalayerCoreConfig = {
  /**
   * Use mock model, useful for e.g. storybooks.
   */
  useMock: boolean;
  /**
   * Does the webapp need a jupyter server.
   */
  jupyterServerless: boolean;
  /**
   * IAM API URL.
   */
  iamRunUrl: string;
  /**
   * Runtimes API URL.
   */
  runtimesRunUrl: string;
  /**
   * Spacer API URL.
   */
  spacerRunUrl: string;
  /**
   * Library API URL.
   */
  libraryRunUrl: string;
  /**
   * AI Agents API URL.
   */
  aiagentsRunUrl: string;
  /**
   * Growth API URL.
   */
  growthRunUrl: string;
  /**
   * Inbounds API URL.
   */
  inboundsRunUrl: string;
  /**
   * Success API URL.
   */
  successRunUrl: string;
  /**
   * Support API URL.
   */
  supportRunUrl: string;
  /**
   * Load configuration from server.
   */
  loadConfigurationFromServer: boolean;
  /**
   * Launcher card customization.
   */
  launcher: {
    /**
     * Card category.
     */
    category: string;
    /**
     * Card name.
     */
    name: string;
    /**
     * Card icon SVG URL.
     */
    icon: string | null;
    /**
     * Card rank.
     */
    rank: number;
  };
  /**
   * Brand customization.
   */
  brand: {
    name: string;
    logoUrl: string;
    logoSquareUrl: string;
    about: string;
    copyright: string;
    docsUrl: string;
    supportUrl: string;
    pricingUrl: string;
    termsUrl: string;
    privacyUrl: string;
  };
  /**
   * Whether to display the white labelled user interface or not.
   */
  whiteLabel: boolean;
}

export interface IRuntimesConfiguration {
  /**
   * Maximal number of notebook remote runtimes per user.
   */
  maxNotebookRuntimes: number;
  /**
   * Maximal number of cell remote runtimes per user.
   */
  maxCellRuntimes: number;
}

export class DatalayerConfiguration {
  private _configuration: IDatalayerCoreConfig = coreStore.getState().configuration;
  private _configurationChanged: Signal<DatalayerConfiguration, IDatalayerCoreConfig>;
  constructor() {
    this._configurationChanged = new Signal<DatalayerConfiguration, IDatalayerCoreConfig>(this);
  }
  set configuration(configuration: IDatalayerCoreConfig) {
    this._configuration = configuration;
    this._configurationChanged.emit(configuration);
  }
  get configuration(): IDatalayerCoreConfig {
    return this._configuration;
  }
  get configurationChanged(): ISignal<DatalayerConfiguration, IDatalayerCoreConfig> {
    return this._configurationChanged;
  }
}

export default DatalayerConfiguration;
