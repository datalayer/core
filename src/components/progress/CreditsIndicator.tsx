/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { useState, useEffect } from "react";
import { Box } from "@datalayer/primer-addons";
// import { ArtifactIcon } from "../../components/icons";
import { ConsumptionBar } from "../../components/progress";
import type { IRemoteServicesManager, IRuntimeModel } from "../../api";

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
   * Callback on progress bar click event
   */
  onClick?: () => void;
  /**
   * Callback on progress update.
   *
   * Progress is a percentage between 0 and 100.
   * Duration is the kernel max duration
   */
  onUpdate?: (progress: number, duration: number) => void;
}

/**
 * Credits indicator component.
 */
export function CreditsIndicator(props: ICreditsIndicatorProps): JSX.Element | null {
  const { serviceManager, kernelId, onClick, onUpdate } = props;
  const [model, setModel] = useState<IRuntimeModel>();
  useEffect(() => {
    serviceManager.runtimesManager.findById(kernelId).then(model => {
      setModel(model);
    });
  }, [kernelId, serviceManager]);
  return model ? 
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
        onClick={onClick}
        onUpdate={onUpdate}
        style={{ cursor: 'pointer' }}
      />
    </Box>
  :
    <></>
}
