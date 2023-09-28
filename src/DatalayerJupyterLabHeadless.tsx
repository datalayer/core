import { useState } from 'react';
import { createRoot } from 'react-dom/client';
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
`

const DatalayerJupyterLabHeadless = () => {
  const [jupyterlab, setJupyterLab] = useState<JupyterLab>();
  const onReady = (jupyterlabAppAdapter: JupyterLabAppAdapter) => {
    setJupyterLab(jupyterlabAppAdapter.jupyterlab);
    /*
    jupyterlab.deactivatePlugin(datalayerExtension.PLUGIN_ID).then((deactivatedDownstreamPlugins) => {
      console.log('Deactivated downstream plugins', deactivatedDownstreamPlugins);
    });
    jupyterlab.deregisterPlugin(datalayerExtension.PLUGIN_ID, true);
    */
  }
  return (
    <>
      {jupyterlab && <Datalayer app={jupyterlab}/>}
      <JupyterLabApp
        extensions={[
          lightThemeExtension,
          collaborationExtension,
          datalayerExtension,
        ]}
        headless={true}
        onReady={onReady}
      />
    </>
  )
}

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(
  <Jupyter startDefaultKernel={false} disableCssLoading={true}>
    <ThemeGlobalStyle />
    <DatalayerJupyterLabHeadless/>
  </Jupyter>
);
