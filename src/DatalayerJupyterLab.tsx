import { createRoot } from 'react-dom/client';
import { Jupyter, JupyterLabApp, JupyterLabAppCorePlugins } from '@datalayer/jupyter-react';
import * as collaborationExtension from '@jupyter/collaboration-extension';
import * as datalayerExtension from './jupyterlab';

const { extensionPromises, mimeExtensionPromises } = JupyterLabAppCorePlugins;

const DatalayerJupyterLab = () => (
  <JupyterLabApp
    extensions={[
      datalayerExtension,
      collaborationExtension,
    ]}
    extensionPromises={extensionPromises}
    mimeExtensionPromises={mimeExtensionPromises}
    hostId="datalayer-jupyterlab-id"
    position="absolute"
    height="100vh"
  />
)

const div = document.createElement('div');
document.body.appendChild(div);
const root = createRoot(div);

root.render(
  <Jupyter startDefaultKernel={false} disableCssLoading={true}>
    <DatalayerJupyterLab/>
  </Jupyter>
);
