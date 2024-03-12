import { Token } from '@lumino/coreutils';
import { ISignal, Signal } from '@lumino/signaling';

export type IDatalayerConfig = {
  apiServerUrl: string;
  launcherCategory: string;
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
