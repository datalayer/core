import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createGlobalStyle } from 'styled-components';
import { Jupyter, JupyterLabApp, JupyterLabAppAdapter, JupyterLabAppCorePlugins } from '@datalayer/jupyter-react';
import { JupyterLab } from '@jupyterlab/application';
import * as collaborationExtension from '@jupyter/collaboration-extension';
import * as datalayerExtension from './jupyterlab/index';
import Datalayer from './Datalayer';

const { extensionPromises, mimeExtensionPromises } = JupyterLabAppCorePlugins;

const ThemeGlobalStyle = createGlobalStyle<any>`
  body {
    background-color: white !important;
  }
`

const DatalayerJupyterLabHeadless = () => {
  const [jupyterlab, setJupyterLab] = useState<JupyterLab>();
  const onReady = (jupyterlabAdapter: JupyterLabAppAdapter) => {
    // jupyterlab.deactivatePlugin(datalayerExtension.PLUGIN_ID).then((deactivatedDownstreamPlugins) => {
    //   console.log('Deeactivated downstream plugins', deactivatedDownstreamPlugins);
    // });
    // jupyterlab.deregisterPlugin(datalayerExtension.PLUGIN_ID, true);
    setJupyterLab(jupyterlabAdapter.jupyterlab);
  }
  return (
    <>
      {jupyterlab && <Datalayer app={jupyterlab}/>}
      <JupyterLabApp
        extensions={[
          datalayerExtension,
          collaborationExtension,
        ]}
        extensionPromises={extensionPromises}
        mimeExtensionPromises={mimeExtensionPromises}
        hostId="jupyterlab-app-id"
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
