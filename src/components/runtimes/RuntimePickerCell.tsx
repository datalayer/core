/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ISessionContext } from '@jupyterlab/apputils';
import { CodeCellModel, ICellModel } from '@jupyterlab/cells';
import type { IMarkdownParser, IRenderMime } from '@jupyterlab/rendermime';
import { nullTranslator } from '@jupyterlab/translation';
import { ActionList } from '@primer/react';
import { CloudUploadIcon } from '@datalayer/icons-react';
import type { ISnippet } from '../../models';
import { useCoreStore, useIAMStore } from '../../state';
import { IRuntimeDesc } from '../../models';
import { isRuntimeRemote, RuntimeSnippetsFacade } from '../../api';
import { ExternalTokenSilentLogin } from '../../components/iam';
import { SnippetDialog } from './../snippets/SnippetDialog';
import { IRuntimePickerBaseProps } from './RuntimePickerBase';
import { RuntimeLauncherDialog } from './RuntimeLauncherDialog';
import { RuntimePickerBase } from './RuntimePickerBase';
import { RuntimeCellVariablesDialog } from './RuntimeCellVariablesDialog';

/**
 * {@link RuntimePickerCell} properties
 */
export type IRuntimePickerCellProps = Pick<
  IRuntimePickerBaseProps,
  'multiServiceManager' | 'preference' | 'translator'
> & {
  /**
   * Callback to allow the user to login
   */
  logIn?: () => void;
  /**
   * Code cell model
   */
  model: CodeCellModel;
  /**
   * Document session context
   */
  sessionContext?: ISessionContext;
  /**
   * Markdown parser
   */
  markdownParser?: IMarkdownParser;
  /**
   * HTML sanitizer; if not provided the produced HTML will not be sanitized.
   */
  sanitizer?: IRenderMime.ISanitizer;
};

/**
 * Kernel picker component for a cell.
 */
export function RuntimePickerCell(props: IRuntimePickerCellProps): JSX.Element {
  const {
    logIn,
    markdownParser,
    model,
    preference,
    sanitizer,
    multiServiceManager,
    sessionContext,
    translator,
  } = props;
  const { token } = useIAMStore();
  const { configuration } = useCoreStore();
  const [isForeign, setIsForeign] = useState(false);
  const [hasCellKernel, setHasCellKernel] = useState(false);
  const [isKernelDialogOpen, setIsKernelDialogOpen] = useState(false);
  const [isVariableDialogOpen, setIsVariableDialogOpen] = useState(false);
  const [language, setLanguage] = useState<string>('');
  const [snippets, setSnippets] = useState<ISnippet[]>([]);
  const [isSnippetDialogOpen, setIsSnippetDialogOpen] = useState(false);
  const trans = useMemo(
    () => (translator ?? nullTranslator).load('jupyterlab'),
    [translator],
  );
  useEffect(() => {
    const updateState = (model: ICellModel) => {
      const datalayerMeta = model.getMetadata('datalayer') ?? {};
      const kernel = datalayerMeta.kernel as IRuntimeDesc | undefined;
      setIsForeign(!!kernel);
      setHasCellKernel(kernel?.params?.notebook === false);
      const newSnippets = new Array<ISnippet>();
      if (kernel) {
        const spec = multiServiceManager.remote?.environments
          .get()
          .find(env => env.name === kernel.name);
        setLanguage(spec?.language ?? '');
        if (spec?.snippets) {
          newSnippets.push(...spec.snippets);
        }
      }
      setSnippets(newSnippets);
    };
    updateState(model);
    model.metadataChanged.connect(updateState);
    return () => {
      model.metadataChanged.disconnect(updateState);
    };
  }, [model]);
  const filterKernel = useCallback(
    (desc: IRuntimeDesc) => {
      return (
        !!desc.kernelId &&
        isRuntimeRemote(desc.location) &&
        (!preference?.language || desc.language === preference?.language)
      );
    },
    [preference],
  );
  const setSelectedKernelDesc = useCallback(
    (kernel?: IRuntimeDesc): void => {
      const datalayerMeta = model.getMetadata('datalayer') ?? {
        kernel: undefined,
      };
      if (!kernel) {
        delete datalayerMeta.kernel;
        model.setMetadata('datalayer', datalayerMeta);
      } else {
        model.setMetadata(
          'datalayer',
          Object.assign(datalayerMeta, { kernel }),
        );
      }
    },
    [model],
  );
  const closeVariableDialog = useCallback(() => {
    setIsVariableDialogOpen(false);
  }, []);
  const openVariableDialog = useCallback(() => {
    setIsVariableDialogOpen(true);
  }, []);
  const closeSnippetDialog = useCallback(() => {
    setIsSnippetDialogOpen(false);
  }, []);
  const openSnippetDialog = useCallback(() => {
    setIsSnippetDialogOpen(true);
  }, []);
  const setCell = useCallback(() => {
    setIsKernelDialogOpen(true);
  }, []);
  const onStartRemote = useCallback(
    (desc?: IRuntimeDesc) => {
      if (desc) {
        desc.params = {
          ...desc.params,
          notebook: false,
        };
        setSelectedKernelDesc(desc);
      }
      setIsKernelDialogOpen(false);
    },
    [setSelectedKernelDesc],
  );
  const datalayerMeta = model.getMetadata('datalayer') ?? {};
  return (
    <>
      <RuntimePickerBase
        display="menu"
        filterKernel={filterKernel}
        preference={preference}
        multiServiceManager={multiServiceManager}
        runtimeDesc={datalayerMeta.kernel ? datalayerMeta.kernel : undefined}
        setRuntimeDesc={setSelectedKernelDesc}
        variant={'cell'}
        preActions={
          <ActionList.Item
            disabled={!multiServiceManager.remote}
            onSelect={setCell}
            selected={hasCellKernel}
            title={
              !multiServiceManager.remote
                ? 'You are not connected with Datalayer.'
                : 'Assign a new temporary Runtime on each Cell execution.'
            }
          >
            <ActionList.LeadingVisual>
              <CloudUploadIcon />
            </ActionList.LeadingVisual>
            {trans.__('Assign a Cell Runtime')}
          </ActionList.Item>
        }
        postActions={
          token || !logIn ? (
            <>
              {RuntimeSnippetsFacade.supports(preference?.language ?? '') && (
                <ActionList.Item
                  onSelect={openVariableDialog}
                  disabled={!isForeign}
                  title={trans.__(
                    'Define variables to transfer between the document kernel and the cell kernel.',
                  )}
                >
                  {trans.__('Define Cell Variables Transfer')}
                </ActionList.Item>
              )}
              {!configuration.whiteLabel && (
                <ActionList.Item
                  onSelect={openSnippetDialog}
                  disabled={snippets.length === 0}
                  title={trans.__(
                    'Inject a code snippet at the end of the cell.',
                  )}
                >
                  {trans.__('Inject Code Snippet')}
                </ActionList.Item>
              )}
            </>
          ) : (
            <ActionList.Item
              onSelect={props.logIn}
              title={'Connect to the Runtime provider.'}
            >
              <ExternalTokenSilentLogin message="Connect to the Runtime provider" />
            </ActionList.Item>
          )
        }
        translator={translator}
      />
      {isVariableDialogOpen && (
        <RuntimeCellVariablesDialog
          model={model}
          onClose={closeVariableDialog}
          preference={preference}
          sessionContext={sessionContext}
          translator={translator}
        />
      )}
      {isSnippetDialogOpen && (
        <SnippetDialog
          language={language}
          model={model}
          snippets={snippets}
          onClose={closeSnippetDialog}
          markdownParser={markdownParser}
          sanitizer={sanitizer}
        />
      )}
      {isKernelDialogOpen && (
        <RuntimeLauncherDialog
          manager={multiServiceManager.remote!}
          onSubmit={onStartRemote}
          startRuntime={false}
          markdownParser={markdownParser}
          sanitizer={sanitizer}
        />
      )}
    </>
  );
}

export default RuntimePickerCell;
