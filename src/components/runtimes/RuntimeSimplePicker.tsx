/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback, useEffect, useState } from 'react';
import { KernelIndicator } from '@datalayer/jupyter-react';
import { ISanitizer } from '@jupyterlab/apputils';
import { IMarkdownParser } from '@jupyterlab/rendermime';
import { Session } from '@jupyterlab/services';
import { ActionList, ActionMenu, Box, Button, Tooltip } from '@primer/react';
import { CloudIcon, EyeIcon, UnfoldIcon } from '@primer/octicons-react';
import { BrowserIcon, PlusIcon } from '@datalayer/icons-react';
import { ArtifactIcon } from '../../components/icons';
import { KernelLauncherDialog } from '../../components/runtimes';
import { IRuntimeModel, type IRuntimeDesc, type RuntimeLocation } from '../../api';
import { useRuntimesStore } from '../../state';

export interface IRuntimeAssignOptions {
  /**
   * Kernel description.
   */
  runtimeDesc?: IRuntimeDesc;
  /**
   * Kernel model to connect to.
   */
  runtimeModel?: IRuntimeModel;
  /**
   * Whether to transfer the state to the new Kernel model.
   */
  transferState?: boolean;
}

/**
 * Runtime picker component properties.
 */
interface IRuntimeSimplePickerProps {
  /**
   * Kernel assignment callback.
   */
  assignRuntime: (options: IRuntimeAssignOptions) => Promise<void>;
  /**
   * Connection to the active Kernel.
   */
  sessionConnection?: Session.ISessionConnection;
}

/**
 * Cause to open the new Kernel dialog.
 */
enum KernelDialogCause {
  /**
   * Don't open.
   */
  None = 0,
  /**
   * Launch a new Remote Kernel.
   */
  New = 1,
  /**
   * Transfer the state from the current Kernel to a new Remote Kernel.
   */
  Transfer = 2
}

/**
 * Runtime simple picker component.
 */
export function RuntimeSimplePicker(props: IRuntimeSimplePickerProps): JSX.Element {
  const { assignRuntime: assignKernel, sessionConnection } = props;
  const { runtimeModels: remoteKernels, multiServiceManager, jupyterLabAdapter } = useRuntimesStore();
  const [kernelLocation, setKernelLocation] = useState<RuntimeLocation>();
  const [luminoServices, setLuminoServices] = useState<{ [k: string]: any }>({});
  const [dialogCause, setDialogCause] = useState<KernelDialogCause>(KernelDialogCause.None);
  const [status, setStatus] = useState('');
  useEffect(() => {
    if (sessionConnection) {
      function onStatusChanged(connection: Session.ISessionConnection) {
        setStatus(`Runtime ${connection.kernel?.connectionStatus} - Status: ${connection.kernel?.status}`);
      }
      onStatusChanged(sessionConnection);
      sessionConnection?.statusChanged.connect(onStatusChanged);
      sessionConnection?.connectionStatusChanged.connect(onStatusChanged);
      return () => {
        sessionConnection?.statusChanged.disconnect(onStatusChanged);
        sessionConnection?.connectionStatusChanged.disconnect(onStatusChanged);
      };
    } else {
      setStatus('No kernel');
    }
  }, [sessionConnection]);
  const refreshRemoteKernels = useCallback(async () => {
    if (multiServiceManager?.remote?.runtimesManager) {
      await multiServiceManager.remote.runtimesManager.refresh();
    }
  }, [multiServiceManager?.remote?.runtimesManager]);
  const handleLaunchRemoteKernel = useCallback(() => {
    setDialogCause(KernelDialogCause.New);
  }, []);
  const handleCloseDialog = useCallback(
    (runtimeDesc?: IRuntimeDesc) => {
      if (runtimeDesc) {
        switch (dialogCause) {
          case KernelDialogCause.New:
            refreshRemoteKernels().then(() => {
              setKernelLocation('remote');
              assignKernel({
                runtimeDesc,
                runtimeModel: multiServiceManager?.remote?.runtimesManager
                  .get()
                  .find(model => model.id === runtimeDesc.kernelId)
              });
            });
            break;
          case KernelDialogCause.Transfer:
            setKernelLocation('remote');
            assignKernel({ runtimeDesc, transferState: true });
            break;
        }
      }
      setDialogCause(KernelDialogCause.None);
    },
    [refreshRemoteKernels, multiServiceManager?.remote, dialogCause]
  );
  useEffect(() => {
    if (jupyterLabAdapter) {
      Promise.all([
        jupyterLabAdapter.jupyterLab.resolveOptionalService(IMarkdownParser),
        jupyterLabAdapter.jupyterLab.resolveOptionalService(ISanitizer)
      ]).then(services => {
        setLuminoServices({
          [IMarkdownParser.name]: services[0],
          [ISanitizer.name]: services[1]
        });
      });
    } else {
      setLuminoServices({});
    }
  }, [jupyterLabAdapter]);
  return (
    <>
      <ActionMenu>
        <ActionMenu.Button
          leadingVisual={() => {
            switch (kernelLocation) {
              case 'browser':
                return <BrowserIcon />;
              case 'remote':
                return <CloudIcon />;
              case undefined:
                return <EyeIcon />;
            }
            return <ArtifactIcon type="runtime" />;
          }}
          trailingVisual={() =>
            sessionConnection
              ?
                <Box sx={{ paddingTop: '5px' }}>
                  <KernelIndicator kernel={sessionConnection.kernel} />
                </Box>
              :
                <></>
          }
          size="small"
          variant="invisible"
        >
          <Tooltip text={status} direction="s">
            <Button variant="invisible" size="small">
              {sessionConnection?.kernel?.name ?? 'Runtimes'}
            </Button>
          </Tooltip>
        </ActionMenu.Button>
        <ActionMenu.Overlay width="medium">
          <ActionList selectionVariant="single" showDividers>
            <ActionList.Group>
              <ActionList.Item
                selected={kernelLocation === undefined && sessionConnection === undefined}
                onSelect={() => {
                  setKernelLocation(undefined);
                  assignKernel({ runtimeDesc: undefined });
                }}
              >
                <ActionList.LeadingVisual>
                  <EyeIcon />
                </ActionList.LeadingVisual>
                Viewer
                <ActionList.Description variant="block">
                  A simple Notebook Viewer without Runtime.
                </ActionList.Description>
              </ActionList.Item>
              <ActionList.Item
                selected={kernelLocation === 'browser'}
                onSelect={() => {
                  setKernelLocation('browser');
                  assignKernel({
                    runtimeDesc: {
                      name: 'pyodide',
                      location: 'browser',
                      language: 'python'
                    }
                  });
                }}
              >
                <ActionList.LeadingVisual>
                  <BrowserIcon />
                </ActionList.LeadingVisual>
                Browser Runtime
                <ActionList.Description variant="block">
                  A Browser Runtime based on Pyodide.
                </ActionList.Description>
              </ActionList.Item>
            </ActionList.Group>
            {remoteKernels.length > 0 && (
              <ActionList.Group>
                <ActionList.GroupHeading>Cloud Runtimes</ActionList.GroupHeading>
                {remoteKernels.map(kernelModel => {
                  return (
                    <ActionList.Item
                      selected={sessionConnection?.kernel?.id === kernelModel.id}
                      onSelect={() => {
                        setKernelLocation('remote');
                        assignKernel({
                          runtimeDesc: {
                            name: kernelModel.environment_name,
                            language: '',
                            location: 'remote',
                            displayName: kernelModel.given_name,
                            kernelId: kernelModel.id,
                            burningRate: kernelModel.burning_rate,
                            podName: kernelModel.pod_name
                          },
                          runtimeModel: kernelModel
                        });
                      }}
                      key={kernelModel.id}
                    >
                      <ActionList.LeadingVisual>
                        <ArtifactIcon type="runtime"/>
                      </ActionList.LeadingVisual>
                      {kernelModel.given_name}
                      <ActionList.Description variant="block">
                        {kernelModel.environment_name}
                      </ActionList.Description>
                    </ActionList.Item>
                  );
                })}
              </ActionList.Group>
            )}
            <ActionList.Divider />
            <ActionList.Group>
              <ActionList.Item
                selected={false}
                onSelect={handleLaunchRemoteKernel}
              >
                <ActionList.LeadingVisual>
                  <PlusIcon />
                </ActionList.LeadingVisual>
                Launch a new Runtime…
              </ActionList.Item>
              <ActionList.Item
                disabled={kernelLocation !== 'browser'}
                selected={false}
                onSelect={() => {
                  setDialogCause(KernelDialogCause.Transfer);
                }}
                title="Transfer the state of the current Runtime to a new Remote Runtime."
              >
                <ActionList.LeadingVisual>
                  <UnfoldIcon/>
                </ActionList.LeadingVisual>
                Transfer state to a new Runtime…
              </ActionList.Item>
            </ActionList.Group>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      {multiServiceManager?.remote && dialogCause > 0 && (
        <KernelLauncherDialog
          dialogTitle={
            dialogCause === KernelDialogCause.Transfer
              ? 'Switch to a new Cloud Runtime'
              : undefined
          }
          manager={multiServiceManager.remote}
          onSubmit={handleCloseDialog}
          markdownParser={luminoServices[IMarkdownParser.name]}
          sanitizer={luminoServices[ISanitizer.name]}
          startKernel={
            dialogCause === KernelDialogCause.Transfer
              ? 'defer'
              : dialogCause === KernelDialogCause.New
          }
        />
      )}
    </>
  );
}
