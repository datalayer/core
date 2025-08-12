/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActionList, FormControl, ToggleSwitch, Tooltip, IconButton } from '@primer/react';
import { Box } from "@datalayer/primer-addons";
import { AlertIcon } from '@primer/octicons-react';
import { ITranslator } from '@jupyterlab/translation';
import { JSONExt } from '@lumino/coreutils';
import { CommandRegistry } from '@lumino/commands';
import { KernelExecutor } from '@datalayer/jupyter-react';
import type { IRuntimeOptions, IMultiServiceManager, IDatalayerSessionContext } from '../../api';
import { DatalayerThemeProvider } from '../../theme';
import { RuntimeSnippetsFacade } from '../../api';
import { IRuntimeDesc } from '../../models';
import { ExternalTokenSilentLogin } from '../../components/iam';
import { useCoreStore, useIAMStore } from '../../state';
import { RuntimeReservationControl, MAXIMAL_RUNTIME_TIME_RESERVATION_MINUTES } from './RuntimeReservationControl';
import { RuntimeVariables } from './RuntimeVariables';
import { RuntimePickerBase } from './RuntimePickerBase';
import { RuntimeTransfer } from './RuntimeTransfer';

/**
 * {@link RuntimePickerNotebook} properties
 */
export interface IRuntimePickerNotebookProps {
  /**
   * Callback to allow the user to login
   */
  logIn?: () => void;
  /**
   * Document session context
   */
  sessionContext: IDatalayerSessionContext;
  /**
   * Multi service manager
   */
  multiServiceManager: IMultiServiceManager;
  /**
   * Set the selected kernel
   */
  setValue: (v: RuntimeTransfer | Error) => void;
  /**
   * Close the dialog
   */
  close: () => void;
  /**
   * Command registry
   */
  commands: CommandRegistry;
  /**
   * Application translator
   */
  translator?: ITranslator;
}

/**
 * Runtime Picker components for a Notebook.
 */
export function RuntimePickerNotebook(props: IRuntimePickerNotebookProps): JSX.Element {
  const { multiServiceManager, sessionContext, setValue, translator } = props;
  const { configuration } = useCoreStore();
  const { credits, refreshCredits, token } = useIAMStore();
  const [selectedRuntimeDesc, setSelectedRuntimeDesc] = useState<IRuntimeDesc>();
  const [timeLimit, setTimeLimit] = useState<number>(Math.min(credits?.available ?? 0, 10));
  const [userStorage, setUserStorage] = useState(false);
  const [canTransferFrom, setTransferFrom] = useState<boolean>(false);
  const [canTransferTo, setTransferTo] = useState<boolean>(false);
  const [transferVariables, setTransferVariables] = useState<boolean>(false);
  const [hasLoadedVariables, setHasLoadedVariables] = useState<boolean>(false);
  const [kernelVariables, setRuntimeVariables] = useState<{[name: string]: string;}>();
  const [toTransfer, setToTransfer] = useState<string[]>([]);
  useEffect(() => {
    refreshCredits();
  }, []);
  useEffect(() => {
    const specs = sessionContext.specsManager.specs?.kernelspecs;
    if (sessionContext.session?.kernel?.name && specs) {
      const spec = Object.values(specs).find(
        spec => spec?.name === sessionContext.session!.kernel!.name
      );
      if (spec) {
        setSelectedRuntimeDesc({
          name: spec.name,
          kernelId: sessionContext.session.kernel.id,
          location: (sessionContext as IDatalayerSessionContext).location,
          language: spec.language,
          displayName: sessionContext.kernelDisplayName
        });
        setTransferFrom(RuntimeSnippetsFacade.supports(spec.language));
      }
    }
  }, [sessionContext]);
  const listRuntimeVariables = useCallback(async (): Promise<void> => {
    if (hasLoadedVariables) {
      return Promise.resolve();
    }
    setHasLoadedVariables(true);
    const connection = sessionContext.session!.kernel!;
    const spec = sessionContext.specsManager.specs!.kernelspecs[connection.model.name]!;
    const snippets = new RuntimeSnippetsFacade(spec.language);
    const outputs = await new KernelExecutor({connection}).execute(snippets.listVariables());
    const content = outputs.get(0).data['text/plain'] as string;
    if (content) {
      setRuntimeVariables(
        JSON.parse(
          // We need to remove the quotes prior to parsing.
          content.slice(1, content.length - 1)
        )
      );
      if (toTransfer.length) {
        const candidates = Object.keys(kernelVariables ?? {});
        setToTransfer(toTransfer.filter(n => candidates.includes(n)));
      } else {
        // By default select all variables.
        setToTransfer(Object.keys(kernelVariables ?? {}));
      }
    } else {
      setRuntimeVariables({});
    }
  }, [hasLoadedVariables, kernelVariables, toTransfer]);
  const setSelectedVariables = useCallback(
    (l: string[]): void => {
      if (!JSONExt.deepEqual(toTransfer, l)) {
        setToTransfer(l);
      }
    },
    [toTransfer]
  );
  const setTransferVariable = useCallback(
    (value: boolean): void => {
      if (transferVariables !== value) {
        if (value) {
          listRuntimeVariables().catch(error => {
            console.error('Failed to list the runtime variable', error);
            setHasLoadedVariables(false);
          });
        }
        setTransferVariables(value);
      }
    },
    [transferVariables]
  );
  const setRuntimeDesc = useCallback((runtimeDesc?: IRuntimeDesc): void => {
    if (!runtimeDesc) {
      if (selectedRuntimeDesc) {
        setSelectedRuntimeDesc(undefined);
        setTransferTo(false);
      }
      return;
    }
    if (selectedRuntimeDesc?.displayName !== runtimeDesc.displayName || selectedRuntimeDesc?.kernelId !== runtimeDesc.kernelId) {
      setSelectedRuntimeDesc({...runtimeDesc});
      setTransferTo(RuntimeSnippetsFacade.supports(runtimeDesc.language));
    }
  },[selectedRuntimeDesc]);
  const handleUserStorageChange = useCallback(
    (e: any) => {
      (e as MouseEvent).preventDefault();
      setUserStorage(!userStorage);
    },
    [userStorage]
  );
  useEffect((): void => {
    const creditsLimit =
      selectedRuntimeDesc?.location === 'remote' && selectedRuntimeDesc.burningRate
        ? Math.min(timeLimit, MAXIMAL_RUNTIME_TIME_RESERVATION_MINUTES) *
          selectedRuntimeDesc.burningRate *
          60
        : undefined;
    setValue(
      creditsLimit !== 0 ? 
        {
          kernel: selectedRuntimeDesc
            ?
              ({
                  environmentName: ['browser', 'remote'].includes(selectedRuntimeDesc.location)
                    ? `${selectedRuntimeDesc.location}-${selectedRuntimeDesc.name}`
                    : selectedRuntimeDesc.name,
                  id: selectedRuntimeDesc.kernelId,
                  creditsLimit,
                  capabilities: userStorage ? ['user_storage'] : undefined
                } satisfies Partial<Omit<IRuntimeOptions, 'kernelType'> & { id: string;}> | null
              )
            :
              null,
          selectedVariables: toTransfer,
        }
        : new Error('Credits limit must be strictly positive.')
    );
  }, [selectedRuntimeDesc, userStorage, toTransfer, timeLimit]);
  const { kernelPreference: { canStart } } = sessionContext;
  const max = Math.floor((credits?.available ?? 0) / (selectedRuntimeDesc?.burningRate ?? -1) / 60.0);
  const outOfCredits = !credits?.available || max < Number.EPSILON;
  return (
    <DatalayerThemeProvider>
      <Box as="form" className="dla-Runtimes-picker">
        <Box sx={{ padding: 'var(--stack-padding-condensed) 0' }}>
          <RuntimePickerBase
            display="radio"
            disabled={canStart === false}
            preference={{
              id: sessionContext.session?.id,
              kernelDisplayName: sessionContext.kernelPreference.shouldStart ? sessionContext.kernelDisplayName : undefined,
            }}
            sessionContext={sessionContext}
            multiServiceManager={multiServiceManager}
            translator={translator}
            runtimeDesc={selectedRuntimeDesc}
            setRuntimeDesc={setRuntimeDesc}
            postActions={token || !props.logIn ?
              /*
              <Button
                variant="default"
                onClick={e => {
                  e.preventDefault();
                  commands.execute(CommandIDs.launchRemoteRuntime);
                  close();
                }}
              >
                Launch a New Runtime
              </Button>
              */
              <></>
            :
              <ActionList.Item onSelect={props.logIn} title={'Connect to Runtime provider.'}>
                <ExternalTokenSilentLogin message="Connect to the Runtime provider" />
              </ActionList.Item>
            }
          />
        </Box>
        {!selectedRuntimeDesc?.kernelId && selectedRuntimeDesc?.location === 'remote' &&
          <>
            <RuntimeReservationControl
              disabled={outOfCredits || selectedRuntimeDesc?.location !== 'remote'}
              label={'Time reservation'}
              max={max < 0 ? 1 : max}
              time={timeLimit}
              onTimeChange={setTimeLimit}
              error={
                outOfCredits && max >= 0 ?
                  'You must add credits to your account.'
                  : timeLimit === 0
                    ? 'You must set a time limit.'
                    : undefined
              }
              burningRate={selectedRuntimeDesc.burningRate}
            />
            {!configuration.whiteLabel &&
              <FormControl disabled={!!selectedRuntimeDesc?.kernelId || selectedRuntimeDesc?.location !== 'remote'} layout="horizontal">
                <FormControl.Label id="user-storage-picker-label">
                  User storage
                  <Tooltip text='The runtime will be slower to start.' direction="e" style={{ marginLeft: 3 }}>
                    <IconButton icon={AlertIcon} aria-label="" variant="invisible"/>
                  </Tooltip>
                </FormControl.Label>
                <ToggleSwitch
                  disabled={!!selectedRuntimeDesc?.kernelId ||selectedRuntimeDesc?.location !== 'remote'}
                  checked={userStorage}
                  size="small"
                  onClick={handleUserStorageChange}
                  aria-labelledby="user-storage-picker-label"
                />
              </FormControl>
            }
          </>
        }
        {canTransferFrom && canTransferTo &&
          <RuntimeVariables
            selectedVariables={toTransfer}
            setSelectVariable={setSelectedVariables}
            transferVariables={transferVariables}
            setTransferVariable={setTransferVariable}
            kernelVariables={kernelVariables}
            translator={translator}
          />
        }
      </Box>
    </DatalayerThemeProvider>
  );
}

export default RuntimePickerNotebook;
