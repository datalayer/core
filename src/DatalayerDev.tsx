import { createRoot } from 'react-dom/client';
import { Jupyter, JupyterLabApp, JupyterLabPluginsCore } from '@datalayer/jupyter-react';
import { JupyterLab } from '@jupyterlab/application';
import * as collaborationExtension from '@jupyter/collaboration-extension';
import * as datalayerExtension from './jupyterlab/index';

const { extensionsPromises, mimeExtensionsPromises } = JupyterLabPluginsCore;

const onReady = (jupyterLab: JupyterLab) => {
  console.log('JupyterLab is ready.')
  /*
  jupyterLab.deactivatePlugin(datalayerExtension.PLUGIN_ID).then((deactivatedDownstreamPlugins) => {
    console.log('Deeactivated downstream plugins', deactivatedDownstreamPlugins);
  });
  jupyterLab.deregisterPlugin(datalayerExtension.PLUGIN_ID, true);
  */
}
const DatalayerDev = () => (
  <JupyterLabApp
    extensions={[
      datalayerExtension,
      collaborationExtension,
    ]}
    extensionPromises={extensionsPromises}
    mimeExtensionsPromises={mimeExtensionsPromises}
    position="absolute"
    hostId="jupyterlab-app-id"
    height="100vh"
    onReady={onReady}
  />
)

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(
  <Jupyter startDefaultKernel={false} disableCssLoading={true}>
    <DatalayerDev/>
  </Jupyter>
);
