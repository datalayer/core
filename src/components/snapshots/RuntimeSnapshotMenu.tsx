/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import {
  useCallback,
  useEffect,
  useState,
  type PropsWithChildren,
} from 'react';
import { CameraIcon } from '@datalayer/icons-react';
import { Kernel } from '@jupyterlab/services';
import {
  ActionList,
  ActionMenu,
  Box,
  Flash,
  FormControl,
  Select,
  Spinner,
} from '@primer/react';
import { Dialog } from '@primer/react/experimental';
import { useToast } from '../../hooks';
import { type IRuntimeSnapshot } from '../../models';
import {
  createRuntimeSnapshot,
  getRuntimeSnapshots,
  loadBrowserRuntimeSnapshot,
  loadRuntimeSnapshot,
  IMultiServiceManager,
} from '../../api';
import { useRuntimesStore } from '../../state';
import { createRuntimeSnapshotName } from '../../utils';

/**
 * Runtime snapshot menu component properties
 */
type IRuntimeSnapshotMenu = {
  /**
   * Application multi service manager.
   */
  multiServiceManager?: IMultiServiceManager;
  /**
   * Connection to the current kernel.
   *
   * It is needed only for browser kernels.
   */
  connection?: Kernel.IKernelConnection;
  /**
   * Pod name
   *
   * It is needed for remote kernels.
   */
  podName?: string;
  /**
   * Whether the menu is disabled.
   */
  disabled: boolean;
};

/**
 * Runtime Snapshot menu component.
 */
export function RuntimeSnapshotMenu(
  props: PropsWithChildren<IRuntimeSnapshotMenu>,
): JSX.Element {
  const { children, connection, podName, multiServiceManager, disabled } =
    props;
  const {
    addRuntimeSnapshot,
    runtimesRunUrl,
    runtimeSnapshots,
    setRuntimeSnapshots,
  } = useRuntimesStore();
  const { trackAsyncTask } = useToast();
  const [openLoadDialog, setOpenLoadDialog] = useState(false);
  const [loadingKernelSnapshot, setLoadingKernelSnapshot] = useState(false);
  const [takingKernelSnapshot, setTakingSnapshot] = useState(false);
  const [selection, setSelection] = useState(runtimeSnapshots[0]?.id ?? '');
  const [error, setError] = useState<string>();
  useEffect(() => {
    getRuntimeSnapshots()
      .then(snapshots => {
        setRuntimeSnapshots(snapshots);
        if (!selection && snapshots.length > 0) {
          setSelection(snapshots[0].id);
        }
      })
      .catch(reason => {
        console.error(`Failed to fetch remote kernel snapshots; ${reason}`);
      });
  }, [runtimesRunUrl]);
  const onLoadKernelSnapshot = useCallback(() => {
    setError(undefined);
    setOpenLoadDialog(true);
  }, []);
  const onKerenelSnapshotChanged = useCallback(event => {
    setSelection(event.target.value);
  }, []);
  const onLoadKernelSnapshotSubmit = useCallback(
    async ({
      id,
      connection,
      podName,
    }: {
      id: string;
      connection?: Kernel.IKernelConnection;
      podName?: string;
    }) => {
      if (podName) {
        await loadRuntimeSnapshot({ id: podName, from: id });
      } else if (connection) {
        await loadBrowserRuntimeSnapshot({ connection, id });
      }
    },
    [],
  );
  const onTakeKernelSnapshot = useCallback(async () => {
    try {
      setTakingSnapshot(true);
      let snapshot: IRuntimeSnapshot | undefined;
      let task: Promise<any> | undefined;
      let ref = '';
      let snapshotName = '';
      if (podName && multiServiceManager?.remote) {
        snapshotName = createRuntimeSnapshotName('cloud');
        task = multiServiceManager.remote.runtimesManager.snapshot({
          podName,
          name: snapshotName,
          description: snapshotName,
          stop: false,
        });
        ref = podName.split('-', 2).reverse()[0];
        task.then(s => {
          snapshot = s;
        });
      } else if (connection && multiServiceManager?.browser) {
        const model = connection.model;
        ref = model.id;
        snapshotName = createRuntimeSnapshotName('browser');
        let isPending = true;
        task = createRuntimeSnapshot({
          connection: multiServiceManager.browser.kernels.connectTo({
            model,
          }),
          metadata: { filename: `${snapshotName}.data` },
          onUploadProgress: () => {
            if (isPending) {
              isPending = false;
              // Get the kernel snapshot uid.
              getRuntimeSnapshots().then(snapshots => {
                snapshot = snapshots.find(s => s.name === snapshotName);
              });
            }
          },
        });
      }
      if (task) {
        trackAsyncTask(task, {
          error: {
            message: (reason, data) => {
              const msg =
                reason === 'Empty snapshot'
                  ? `Runtime ${ref} will not be snapshotted as it does not contain any serializable state.`
                  : `Failed to pause runtime ${ref} - ${reason}`;
              return msg;
            },
          },
          pending: { message: `Taking a snapshot of runtime ${ref}…` },
          success: {
            message: () =>
              `Runtime ${ref} successfully snapshotted as ${snapshotName}.`,
          },
        });
        await task;
        if (snapshot) {
          addRuntimeSnapshot(snapshot);
        }
      }
    } finally {
      setTakingSnapshot(false);
    }
  }, [connection, podName, multiServiceManager]);
  return (
    <>
      <ActionMenu>
        <ActionMenu.Button
          leadingVisual={CameraIcon}
          variant="invisible"
          size="small"
          disabled={loadingKernelSnapshot || takingKernelSnapshot || disabled}
        >
          {children}
        </ActionMenu.Button>
        <ActionMenu.Overlay>
          <ActionList>
            <ActionList.Item
              onSelect={onLoadKernelSnapshot}
              disabled={loadingKernelSnapshot || runtimeSnapshots.length === 0}
            >
              Load a runtime snapshot…
            </ActionList.Item>
            <ActionList.Item
              onSelect={onTakeKernelSnapshot}
              disabled={takingKernelSnapshot}
            >
              Take a runtime snapshot
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
      {openLoadDialog && (
        <Dialog
          title={
            <span style={{ color: 'var(--fgColor-default)' }}>
              Choose a runtime snapshot to load
            </span>
          }
          onClose={() => {
            setOpenLoadDialog(false);
          }}
          footerButtons={[
            {
              buttonType: 'default',
              content: 'Cancel',
              onClick: event => {
                if (!event.defaultPrevented) {
                  event.preventDefault();
                  setOpenLoadDialog(false);
                }
              },
            },
            {
              buttonType: 'primary',
              content: loadingKernelSnapshot ? (
                <Spinner size="small" />
              ) : (
                'Load'
              ),
              disabled: loadingKernelSnapshot,
              onClick: async event => {
                if (!event.defaultPrevented) {
                  event.preventDefault();
                  setLoadingKernelSnapshot(true);
                  try {
                    setError(undefined);
                    const snapshot = runtimeSnapshots.find(
                      s => s.id === selection,
                    );
                    if (snapshot && (connection || podName)) {
                      await onLoadKernelSnapshotSubmit({
                        connection,
                        id: snapshot.id,
                        podName,
                      });
                    } else {
                      setError('No runtime snapshot found.');
                    }
                  } finally {
                    setLoadingKernelSnapshot(false);
                    setOpenLoadDialog(false);
                  }
                }
              },
              autoFocus: true,
            },
          ]}
        >
          <Box as="form">
            <FormControl>
              <FormControl.Label>Snapshot</FormControl.Label>
              <Select
                name="snapshot"
                value={selection}
                onChange={onKerenelSnapshotChanged}
                block
              >
                {runtimeSnapshots.map(s => (
                  <Select.Option key={s.id} value={s.id}>
                    {s.name ? `${s.name} (${s.id})` : s.id}
                  </Select.Option>
                ))}
              </Select>
            </FormControl>
            {error && <Flash variant="danger">{error}</Flash>}
          </Box>
        </Dialog>
      )}
    </>
  );
}

RuntimeSnapshotMenu.defaultProps = {
  disabled: false,
} as Partial<IRuntimeSnapshotMenu>;
