/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2023 Datalayer, Inc.
 *
 * MIT License
 */

import { PageConfig } from '@jupyterlab/coreutils';
import { loadJupyterConfig, IJupyterConfig } from '@datalayer/jupyter-react';
import { IDatalayerConfig } from '../../state/IDatalayerConfig';
import { DATALAYER_JUPYTER_SERVER_URL, DATALAYER_JUPYTER_SERVER_TOKEN } from './DatalayerDefaults';

/**
 * Flag to track if Datalayer config has been loaded.
 */
let datalayerConfigLoaded = false;

/**
 * Load Datalayer-specific configuration.
 */
export const loadDatalayerConfig = (): IDatalayerConfig | undefined => {
  if (datalayerConfigLoaded) {
    return undefined;
  }
  datalayerConfigLoaded = true;
  const datalayerConfigData = document.getElementById('datalayer-config-data');
  let datalayerConfig: IDatalayerConfig | undefined = undefined;
  if (datalayerConfigData) {
    const textContent = datalayerConfigData.textContent || '';
    if (textContent) {
      datalayerConfig = JSON.parse(textContent) as IDatalayerConfig;
      console.log('Loaded Datalayer config from HTML page', datalayerConfig);
    }
  }
  return datalayerConfig;
};

/**
 * Load both Jupyter and Datalayer configurations for Datalayer environments.
 */
export const loadDatalayerJupyterConfig = (
  props: {
    collaborative?: boolean;
    jupyterServerToken?: string;
    jupyterServerUrl?: string;
    lite?: boolean;
    terminals?: boolean;
  } = {}
): { jupyterConfig: IJupyterConfig; datalayerConfig?: IDatalayerConfig } => {
  // Load Datalayer-specific config
  const datalayerConfig = loadDatalayerConfig();
  
  // Load Jupyter config with Datalayer defaults
  const jupyterConfig = loadJupyterConfig({
    ...props,
    jupyterServerUrl: props.jupyterServerUrl ?? DATALAYER_JUPYTER_SERVER_URL,
    jupyterServerToken: props.jupyterServerToken ?? DATALAYER_JUPYTER_SERVER_TOKEN,
  });
  
  // Set Datalayer-specific PageConfig options if needed
  if (datalayerConfig?.runUrl) {
    PageConfig.setOption('datalayerRunUrl', datalayerConfig.runUrl);
  }
  
  return { jupyterConfig, datalayerConfig };
};