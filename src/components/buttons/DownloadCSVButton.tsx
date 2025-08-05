/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Button } from '@primer/react';
import { DownloadIcon } from '@primer/octicons-react';
import { downloadCSV } from '../../utils';
import { VariantType } from './VariantType';

type IDownloadCSVButtonProps = {
  data?: {};
  fileName: string;
  variant: VariantType;
}

export const DownloadCSVButton = (props: IDownloadCSVButtonProps) => {
  const { data, fileName, variant } = props;
  return (
    <Button
      variant={variant}
      leadingVisual={DownloadIcon}
      onClick={e => downloadCSV(data, fileName)}
    >
      Download
    </Button>
  );
}

DownloadCSVButton.defaultProps = {
  variant: "default",
}

export default DownloadCSVButton;
