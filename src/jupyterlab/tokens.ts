import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

export type IDatalayerConfig = {
  /**
   * Cloud API URL
   */
  apiServerUrl: string;
  /**
   * Launcher card customization
   */
  launcher: {
    /**
     * Card category
     */
    category: string;
    /**
     * Card name
     */
    name: string;
    /**
     * Card icon SVG URL
     */
    icon: string | null;
    /**
     * Card rank
     */
    rank: number;
  };
  /**
   * Whether to display the white labelled user interface or not.
   */
  whiteLabel: boolean;
};

export type IDatalayer = {
  configuration: DatalayerConfiguration;
  ready: Promise<void>;
};

export const IDatalayer = new Token<IDatalayer>('@datalayer/core:plugin');

export class DatalayerConfiguration {
  private _configuration?: IDatalayerConfig;
  private _configurationChanged: Signal<
    DatalayerConfiguration,
    IDatalayerConfig | undefined
  >;
  constructor() {
    this._configurationChanged = new Signal<
      DatalayerConfiguration,
      IDatalayerConfig | undefined
    >(this);
  }
  set configuration(configuration: IDatalayerConfig | undefined) {
    this._configuration = configuration;
    this._configurationChanged.emit(configuration);
  }
  get configuration() {
    return this._configuration;
  }
  get configurationChanged(): ISignal<
    DatalayerConfiguration,
    IDatalayerConfig | undefined
  > {
    return this._configurationChanged;
  }
}
