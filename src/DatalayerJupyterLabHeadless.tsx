import { useState } from 'react';
import { createGlobalStyle } from 'styled-components';
import { JupyterLab } from '@jupyterlab/application';
import { Jupyter, JupyterLabApp, JupyterLabAppAdapter } from '@datalayer/jupyter-react';
import Datalayer from './Datalayer';

import * as lightThemeExtension from '@jupyterlab/theme-light-extension';
import * as collaborationExtension from '@jupyter/collaboration-extension';
import * as datalayerExtension from './jupyterlab/index';

const ThemeGlobalStyle = createGlobalStyle<any>`
  body {
    background-color: white !important;
  }
`;

const JupyterLabHeadless = () => {
  const [jupyterLab, setJupyterLab] = useState<JupyterLab>();
  const onJupyterLab = (jupyterLabAppAdapter: JupyterLabAppAdapter) => {
    setJupyterLab(jupyterLabAppAdapter.jupyterLab);
    /*
    jupyterLab.deactivatePlugin(datalayerExtension.PLUGIN_ID).then((deactivatedDownstreamPlugins) => {
      console.log('Deactivated downstream plugins', deactivatedDownstreamPlugins);
    });
    jupyterLab.deregisterPlugin(datalayerExtension.PLUGIN_ID, true);
    */
  }
  return (
    <>
      {jupyterLab && <Datalayer jupyterFrontend={jupyterLab}/>}
      <JupyterLabApp
        extensions={[
          lightThemeExtension,
          collaborationExtension,
          datalayerExtension,
        ]}
        headless={true}
        onJupyterLab={onJupyterLab}
      />
    </>
  )
}

export const DatalayerJupyterLabHeadless = () => (
  <Jupyter startDefaultKernel={false} disableCssLoading={true} collaborative={true}>
    <ThemeGlobalStyle />
    <JupyterLabHeadless/>
  </Jupyter>
)

export default DatalayerJupyterLabHeadless;
