/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Button } from '@primer/react';
import { DownloadIcon } from '@primer/octicons-react';
import { downloadJson } from '../../utils';
import { VariantType } from './VariantType';

type IDownloadJsonButtonProps = {
  data?: object;
  fileName: string;
  extension?: string;
  variant?: VariantType;
};

export const DownloadJsonButton = ({
  data,
  fileName,
  variant = 'default',
  extension = 'json',
}: IDownloadJsonButtonProps) => {
  return (
    <Button
      variant={variant}
      leadingVisual={DownloadIcon}
      onClick={e => downloadJson(data, fileName, extension)}
    >
      Download
    </Button>
  );
};

export default DownloadJsonButton;
