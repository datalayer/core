/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Box, SegmentedControl, Label, Text } from '@primer/react';
import { INotebookContent } from '@jupyterlab/nbformat';
import { Session, ServiceManager } from '@jupyterlab/services';
import {
  createLiteServiceManager,
  createServerSettings,
  setJupyterServerUrl,
  getJupyterServerUrl,
  getJupyterServerToken,
  ServiceManagerLess,
  loadJupyterConfig,
  DEFAULT_JUPYTER_SERVER_URL,
  Lite,
  OnSessionConnection,
  useNotebookStore,
  Notebook,
  SpinnerCentered,
  JupyterReactTheme,
} from '@datalayer/jupyter-react';
import { useCoreStore } from '../state/substates/CoreState';
import { createDatalayerServiceManager } from '../services/DatalayerServiceManager';

import nbformatExample from './notebooks/NotebookExample1.ipynb.json';

const NOTEBOOK_ID = 'notebook-mutations-id';

loadJupyterConfig();

const SERVICE_MANAGER_LESS = new ServiceManagerLess();

const NotebookMutationsServiceManager = () => {
  const [index, setIndex] = useState(0);
  const [nbformat, setNbformat] = useState(nbformatExample as INotebookContent);
  const [readonly, setReadonly] = useState(true);
  const [waiting, setWaiting] = useState(false);
  const [lite, setLite] = useState<Lite>(false);
  const [serviceManager, setServiceManager] =
    useState<ServiceManager.IManager>(SERVICE_MANAGER_LESS);
  const [sessions, setSessions] = useState<Array<Session.ISessionConnection>>(
    [],
  );
  const { configuration } = useCoreStore();
  const notebookStore = useNotebookStore();
  const notebook = notebookStore.selectNotebook(NOTEBOOK_ID);
  const onSessionConnection: OnSessionConnection = (
    session: Session.ISessionConnection | undefined,
  ) => {
    console.log('Received a Kernel Session.', session);
    if (session) {
      setSessions(sessions.concat(session));
    }
  };
  const changeIndex = (index: number) => {
    setIndex(index);
    switch (index) {
      case 0: {
        setNbformat(
          notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
        );
        setReadonly(true);
        setLite(false);
        setServiceManager(SERVICE_MANAGER_LESS);
        break;
      }
      case 1: {
        setJupyterServerUrl(location.protocol + '//' + location.host);
        createLiteServiceManager().then(liteServiceManager => {
          console.log('Lite Service Manager is available', liteServiceManager);
          setServiceManager(liteServiceManager);
          setNbformat(
            notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
          );
          setReadonly(false);
          setLite(true);
        });
        break;
      }
      case 2: {
        setJupyterServerUrl(DEFAULT_JUPYTER_SERVER_URL);
        setNbformat(
          notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
        );
        setReadonly(false);
        setLite(false);
        const serverSettings = createServerSettings(
          getJupyterServerUrl(),
          getJupyterServerToken(),
        );
        const serviceManager = new ServiceManager({ serverSettings });
        (serviceManager as any)['__NAME__'] = 'MutatingServiceManager';
        setServiceManager(serviceManager);
        break;
      }
      case 3: {
        setReadonly(false);
        setWaiting(true);
        setLite(false);
        setNbformat(
          notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
        );
        createDatalayerServiceManager(
          configuration?.cpuEnvironment || 'python-simple-env',
          configuration?.credits || 1,
        ).then(serviceManager => {
          (serviceManager as any)['__NAME__'] = 'DatalayerCPUServiceManager';
          setServiceManager(serviceManager);
          setNbformat(
            notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
          );
          setReadonly(false);
          setWaiting(false);
        });
        break;
      }
      case 4: {
        setReadonly(false);
        setWaiting(true);
        setLite(false);
        setNbformat(
          notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
        );
        createDatalayerServiceManager(
          configuration?.gpuEnvironment || 'pytorch-cuda-env',
          configuration?.credits || 1,
        ).then(serviceManager => {
          (serviceManager as any)['__NAME__'] = 'DatalayerGPUServiceManager';
          setServiceManager(serviceManager);
          setNbformat(
            notebook?.adapter?.notebookPanel?.content.model?.toJSON() as INotebookContent,
          );
          setReadonly(false);
          setWaiting(false);
        });
        break;
      }
    }
  };
  return (
    <JupyterReactTheme>
      <>
        <Box display="flex">
          <Box>
            <SegmentedControl
              onChange={index => changeIndex(index)}
              aria-label="jupyter-react-example"
            >
              <SegmentedControl.Button defaultSelected={index === 0}>
                Readonly
              </SegmentedControl.Button>
              <SegmentedControl.Button defaultSelected={index === 1}>
                Browser Kernel
              </SegmentedControl.Button>
              <SegmentedControl.Button defaultSelected={index === 2}>
                OSS Kernel (CPU)
              </SegmentedControl.Button>
              <SegmentedControl.Button defaultSelected={index === 3}>
                Kernel (CPU)
              </SegmentedControl.Button>
              <SegmentedControl.Button defaultSelected={index === 4}>
                Kernel (GPU)
              </SegmentedControl.Button>
            </SegmentedControl>
          </Box>
          <Box ml={1} mt={1}>
            <Label>Lite: {String(notebook?.adapter?.lite)}</Label>
            <Label>
              Service Manager URL:{' '}
              {notebook?.adapter?.serviceManager.serverSettings.baseUrl}
            </Label>
            <Label>
              Service Manager is ready:{' '}
              {String(notebook?.adapter?.serviceManager.isReady)}
            </Label>
            <Label>Kernel ID: {notebook?.adapter?.kernel?.id}</Label>
            <Label>
              Kernel Banner: {notebook?.adapter?.kernel?.info?.banner}
            </Label>
          </Box>
        </Box>
        <Box>
          <Text as="h3">Kernel Sessions</Text>
        </Box>
        <Box>
          {sessions.map(session => {
            return (
              <Box key={session.id}>
                <Text>
                  {session.name} {session.id} <Label>Kernel</Label> clientId [
                  {session.kernel?.clientId}) - id {session.kernel?.id}
                </Text>
              </Box>
            );
          })}
        </Box>
        {waiting ? (
          <SpinnerCentered />
        ) : (
          <Notebook
            height="calc(100vh - 2.6rem)"
            id={NOTEBOOK_ID}
            lite={lite}
            nbformat={nbformat as INotebookContent}
            onSessionConnection={onSessionConnection}
            readonly={readonly}
            serviceManager={serviceManager}
          />
        )}
      </>
    </JupyterReactTheme>
  );
};

export default NotebookMutationsServiceManager;

// For standalone testing
if (typeof window !== 'undefined' && window.location.pathname === '/test') {
  const div = document.createElement('div');
  document.body.appendChild(div);
  const root = createRoot(div);
  root.render(<NotebookMutationsServiceManager />);
}
