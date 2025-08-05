/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Button } from '@primer/react';
import { DownloadIcon } from '@primer/octicons-react';
import { downloadJson } from '../../utils';
import { VariantType } from './VariantType';

type IDownloadJsonButtonProps = {
  data?: {};
  fileName: string;
  extension: string;
  variant: VariantType;
}

export const DownloadJsonButton = (props: IDownloadJsonButtonProps) => {
  const { data, fileName, variant, extension } = props;
  return (
    <Button
      variant={variant}
      leadingVisual={DownloadIcon}
      onClick={e => downloadJson(data, fileName, extension)}
    >
      Download
    </Button>
  );
}

DownloadJsonButton.defaultProps = {
  variant: 'default',
  name: 'data',
  extension: 'json',
}

export default DownloadJsonButton;
