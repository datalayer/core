import { createRoot } from 'react-dom/client';
import { Jupyter, JupyterLabApp, JupyterLabCorePlugins } from '@datalayer/jupyter-react';
import * as collaborationExtension from '@jupyter/collaboration-extension';
import * as datalayerExtension from './jupyterlab';

const { extensionPromises, mimeExtensionPromises } = JupyterLabCorePlugins;

const DatalayerJupyterLab = () => (
  <JupyterLabApp
    extensions={[
      datalayerExtension,
      collaborationExtension,
    ]}
    extensionPromises={extensionPromises}
    mimeExtensionPromises={mimeExtensionPromises}
    position="absolute"
    hostId="jupyterlab-app-id"
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
