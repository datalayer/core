/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useEffect, useMemo, useState, ReactElement, ReactNode } from 'react';
import { ISessionContext } from '@jupyterlab/apputils';
import { ITranslator } from '@jupyterlab/translation';
import { nullTranslator } from '@jupyterlab/translation';
//import { kernelIcon } from '@jupyterlab/ui-components';
import { ActionList, ActionMenu, IconButton, Text, RadioGroup, Radio, FormControl, LabelGroup, Label } from '@primer/react';
import CloudUploadIcon from '@datalayer/icons-react/data1/CloudUploadIcon';
import { Box } from "@datalayer/primer-addons";
import { CpuIcon} from '@primer/octicons-react'
import { BrowserIcon, LaptopSimpleIcon } from '@datalayer/icons-react';
import { CreditsIndicator } from '../../components/progress';
import { IRuntimeDesc } from '../../api';
import { IMultiServiceManager } from '../../api';
import { isRuntimeRemote } from '../../api';
import { getGroupedRuntimeDescs, IDatalayerRuntimeDesc } from './RuntimeUtils';

/**
 * Maximal runtime display name length after which it is trimmed.
 */
const RUNTIME_DISPLAY_NAME_MAX_LENGTH = 25;

type Height = 'large';

type Width =
| 'auto'
| 'small'
;

type IDisplayMode =
| 'menu'
| 'radio'
;

/**
 * {@link RuntimePickerBase} properties
 */
export interface IRuntimePickerBaseProps {
  /**
   * The display mode.
   */
  display: IDisplayMode;
  /**
   * Additional actions items to be placed at the top of the picker
   */
  preActions?: ReactNode;
  /**
   * Additional actions items to be placed at the bottom of the picker
   */
  postActions?: ReactNode;
  /**
   * Whether the picker is disabled or not.
   */
  disabled?: boolean;
  /**
   * Runtime description passing this filter function will be displayed.
   */
  filterKernel?: (desc: IRuntimeDesc) => boolean;
  /**
   * Session preference.
   */
  preference?: {
    id?: string;
    kernelDisplayName?: string;
    language?: string;
    location?: string;
  };
  /**
   * Runtime description.
   */
  runtimeDesc?: IRuntimeDesc;
  /**
   * Set runtime description.
   */
  setRuntimeDesc: (desc?: IRuntimeDesc) => void;
  /**
   * Document session context.
   */
  sessionContext?: ISessionContext;
  /**
   * Application service manager
   */
  multiServiceManager: IMultiServiceManager;
  /**
   * Application translator.
   */
  translator?: ITranslator;
  /**
   * Change the look depending on the menu integration.
   */
  variant?: 'document' | 'cell';
}

/**
 * Base Kernel Picker component.
 */
export function RuntimePickerBase(props: IRuntimePickerBaseProps): ReactElement {
  const {
    disabled,
    display,
    filterKernel,
    multiServiceManager,
    postActions,
    preActions,
    preference,
    runtimeDesc,
    sessionContext,
    setRuntimeDesc,
    translator,
    variant,
  } = props;
  const [groupedKernelDescs, _] = useState<{ [k: string]: IDatalayerRuntimeDesc[] } | undefined>(
    getGroupedRuntimeDescs(multiServiceManager, preference?.id, translator, filterKernel, variant)
  );
  const trans = useMemo(() => (translator ?? nullTranslator).load('jupyterlab'), [translator]);
  const [defaultSet, setDefaultSet] = useState(false);
  // Trick because overflow is an unknown prop of ActionMenu.Overlay.
  const overlayProps = {
    maxHeight: 'large' as Height,
    width: (variant === 'cell' ? 'small' : 'auto') as Width
  };
  /*
  // TODO this effect generates refresh of the react components which discards any change in the selection.
  useEffect(() => {
    const updateGroupedKernelDescs = () => {
      setGroupedKernelDescs(getGroupedRuntimeDescs(multiServiceManager, preference?.id, translator, filterKernel, variant));
    };
    multiServiceManager.browser?.kernels.runningChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.browser?.kernelspecs.specsChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.browser?.sessions.runningChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.local.kernels.runningChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.local.kernelspecs.specsChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.local.sessions.runningChanged.connect(updateGroupedKernelDescs);
    multiServiceManager.remote?.kernels.changed.connect(updateGroupedKernelDescs);
    multiServiceManager.remote?.environments.changed.connect(updateGroupedKernelDescs);
    // multiServiceManager.remote?.sessions.runningChanged.connect(updateOptions);
    return () => {
      multiServiceManager.browser?.kernels.runningChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.browser?.kernelspecs.specsChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.browser?.sessions.runningChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.local.kernels.runningChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.local.kernelspecs.specsChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.local.sessions.runningChanged.disconnect(updateGroupedKernelDescs);
      multiServiceManager.remote?.kernels.changed.disconnect(updateGroupedKernelDescs);
      multiServiceManager.remote?.environments.changed.disconnect(updateGroupedKernelDescs);
      // multiServiceManager.remote?.sessions.runningChanged.disconnect(updateOptions);
    };
  }, [multiServiceManager, preference, translator, filterKernel, variant]);
  */
  useEffect(() => {
    if (sessionContext && groupedKernelDescs) {
      const kernelId = sessionContext.session?.kernel?.id;
      if (kernelId) {
        Object.entries(groupedKernelDescs).forEach(([group, runtimeDescs]) => {
          runtimeDescs.forEach( runtimeDesc => {
            if (runtimeDesc.kernelId === kernelId) {
              setRuntimeDesc(runtimeDesc);
            }
          });
        });
      }
    }
    setDefaultSet(true);
  }, [groupedKernelDescs]);
  // For cell using submenu instead of group would be nice unfortunately the feature
  // is not yet implemented in the component there has been a not-great demo story.
  // https://github.com/primer/react/pull/3585
  return (
    <>
      {display === 'menu' ?
        /*
         * Section for Menu display.
         */
        <ActionMenu>
          {variant === 'cell' ?
            <ActionMenu.Anchor>
              <IconButton
                disabled={disabled || groupedKernelDescs === null}
//                icon={() => <kernelIcon.react className="dla-Cell-runtime-icon" tag={'span'} />}
                icon={() => <span className="dla-Cell-runtime-icon"><CpuIcon/></span>}
                aria-label={trans.__('Assign a Runtime to the Cell.')}
                title={trans.__('Assign a Runtime to the Cell.')}
                size="small"
                variant="invisible"
              />
            </ActionMenu.Anchor>
          :
            <ActionMenu.Button variant="default" disabled={disabled || groupedKernelDescs === null}>
              <Text fontWeight={'bold'}>{trans.__('Runtime:')}</Text>{' ' + (runtimeDesc?.displayName ?? trans.__('No Runtime'))}
            </ActionMenu.Button>
          }
          <ActionMenu.Overlay
            {...overlayProps}
            width="medium"
            sx={{ overflowY: 'auto' }}
            side={variant === 'cell' ? 'outside-left' : 'outside-right'}
          >
            <ActionList selectionVariant="single">
              {/* variant === 'document' &&
                <ActionList.Item key={'null'} selected={null === selection} onSelect={() => {setRuntimeDesc(null);}}>
                    {trans.__('No Runtime')}
                </ActionList.Item>
              */}
              {variant === 'cell' &&
                <ActionList.Item key={'null'} selected={runtimeDesc === undefined} onSelect={() => {setRuntimeDesc(undefined);}}>
                  {preference?.location && (
                    <ActionList.LeadingVisual>
                      {preference.location === 'local' ? <LaptopSimpleIcon /> : preference.location === 'browser' ? <BrowserIcon /> : <CloudUploadIcon />}
                    </ActionList.LeadingVisual>
                  )}
                  {trans.__('Assign the Notebook Runtime')}
                </ActionList.Item>
              }
              {!!preActions && preActions}
              {Object.entries(groupedKernelDescs ?? {}).map(([group, runtimeDescs]) => (
                <ActionList.Group key={group}>
                  <ActionList.GroupHeading>{group}</ActionList.GroupHeading>
                  {runtimeDescs.map(runtimeDesc => {
                    const annotation = runtimeDesc.podName ? ` - ${runtimeDesc.podName.split('-', 2).reverse()[0]}` : runtimeDesc.kernelId ? ` - ${runtimeDesc.kernelId}` : '';
                    const fullDisplayName = (runtimeDesc.displayName ?? '') + annotation;
                    const displayName = (runtimeDesc.displayName?.length ?? 0) > RUNTIME_DISPLAY_NAME_MAX_LENGTH ? runtimeDesc.displayName!.slice(0, RUNTIME_DISPLAY_NAME_MAX_LENGTH) + '…' : runtimeDesc.displayName ?? '';
                    return (
                      <ActionList.Item
                        key={runtimeDesc.name}
                        title={fullDisplayName}
                        selected={(runtimeDesc.location === runtimeDesc?.location || (isRuntimeRemote(runtimeDesc.location) &&
                          isRuntimeRemote(runtimeDesc?.location ?? 'local'))) && (runtimeDesc.kernelId ?? runtimeDesc.name) === (runtimeDesc?.kernelId ?? runtimeDesc?.name)
                        }
                        onSelect={() => {setRuntimeDesc(runtimeDesc)}}
                      >
                        <ActionList.LeadingVisual>
                          {runtimeDesc.location === 'local' ? <LaptopSimpleIcon /> : runtimeDesc.location === 'browser' ? <BrowserIcon /> : <CloudUploadIcon />}
                        </ActionList.LeadingVisual>
                        {displayName + annotation.slice(0, 10)}
                      </ActionList.Item>
                    );
                  })}
                </ActionList.Group>
              ))}
              {!!postActions &&
                <>
                  <ActionList.Divider />
                  {postActions}
                </>
              }
            </ActionList>
          </ActionMenu.Overlay>
        </ActionMenu>
      :
        /*
         * Section for Radio display.
         */
        <>
          {defaultSet &&
            <RadioGroup name="kernel-options" aria-labelledby="kernel-options">
              {Object.entries(groupedKernelDescs ?? {}).map(([group, runtimeDescs]) => (
                <Box key={group}>
                  <Box as="h4" style={{marginTop: 0}}>{group}</Box>
                  {runtimeDescs.map(k => {
                    return <Box key={k.kernelId} title={k.name}>
                      <FormControl>
                        <Radio
                          value={k.kernelId!}
                          onChange={() => {setRuntimeDesc(k)}}
                          checked={(k.location === k?.location || (isRuntimeRemote(k.location) &&
                            isRuntimeRemote(k?.location ?? 'local'))) && (k.kernelId ?? k.name) === (runtimeDesc?.kernelId ?? runtimeDesc?.name)
                          }
                        />
                        <FormControl.Label>
                          <Box display="flex">
                            <Box>{k.displayName}</Box>
                            {k.kernelId && k.location === "remote" &&
                              <Box ml={3} mt={1}>
                                <CreditsIndicator
                                  key="credits-indicator"
                                  kernelId={k.kernelId}
                                  serviceManager={multiServiceManager.remote!}
                                />
                              </Box>
                            }
                          </Box>
                        </FormControl.Label>
                        <FormControl.Caption>
                          <LabelGroup sx={{ marginTop: 1 }}>
                            <Label variant="secondary">{k.name}</Label> 
                            <Label variant="secondary" sx={{ marginLeft: 1}}>{k.location}</Label>
                            {k.burningRate && <Label variant="sponsors" sx={{ marginLeft: 1}}>{k.burningRate} credits/second</Label>}
                            {k.gpu && <Label variant="success" sx={{ marginLeft: 1}}>GPU</Label>}
                          </LabelGroup>
                        </FormControl.Caption>
                      </FormControl>
                      <ActionList.Divider/>
                    </Box>
                  }
                )}
                </Box>
              ))
            }
            </RadioGroup>
          }
          {!!postActions && <>{postActions}</>}
        </>
      }
    </>
  );
}

export default RuntimePickerBase;
