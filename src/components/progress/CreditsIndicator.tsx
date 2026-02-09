/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { useState, useEffect } from 'react';
import { Box } from '@datalayer/primer-addons';
import { ConsumptionBar } from '../../components/progress';
import useNavigate from '../../hooks/useNavigate';
import type { IRemoteServicesManager } from '../../stateful/runtimes';
import type { IRuntimeModel } from '../../models';

type ICreditsIndicatorProps = {
  /**
   * Kernel service manager
   */
  serviceManager: IRemoteServicesManager;
  /**
   * Kernel ID
   */
  kernelId: string;
  /**
   * Route to navigate to when the indicator is clicked.
   * Ignored if `onClick` is provided.
   */
  navigateTo?: string;
  /**
   * Callback on progress bar click event.
   * Takes precedence over `navigateTo`.
   */
  onClick?: () => void;
  /**
   * Callback on progress update.
   *
   * Progress is a percentage between 0 and 100.
   * Duration is the kernel max duration
   */
  onUpdate?: (progress: number, duration: number) => void;
};

/**
 * Credits indicator component.
 */
export function CreditsIndicator(
  props: ICreditsIndicatorProps,
): JSX.Element | null {
  const { serviceManager, kernelId, navigateTo, onClick, onUpdate } = props;
  const navigate = useNavigate();
  const [model, setModel] = useState<IRuntimeModel>();
  useEffect(() => {
    serviceManager.runtimesManager.findById(kernelId).then(model => {
      setModel(model);
    });
  }, [kernelId, serviceManager]);
  return model ? (
    <Box display="flex" style={{ alignItems: 'center' }}>
      {/*
      <Box style={{ padding: '0px 6px 12px 0px', userSelect: 'none' }} color="fg.subtle">
        <ArtifactIcon type="credits"/>
      </Box>
      */}
      <ConsumptionBar
        startedAt={parseFloat(model.started_at)}
        expiredAt={model.expired_at ? parseFloat(model.expired_at) : undefined}
        burningRate={model.burning_rate}
        onClick={
          onClick ?? (navigateTo ? () => navigate(navigateTo) : undefined)
        }
        onUpdate={onUpdate}
        style={{ cursor: 'pointer' }}
      />
    </Box>
  ) : (
    <></>
  );
}
