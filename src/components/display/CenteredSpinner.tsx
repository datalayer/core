/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { Spinner, Text } from "@primer/react";
import { Box } from "@datalayer/primer-addons";

declare const sizeMap: {
  small: string;
  medium: string;
  large: string;
};

type ICenteredSpinnerProps = {
  message?: string;
  size?:  keyof typeof sizeMap;
}

export const CenteredSpinner = (props: ICenteredSpinnerProps) => {
  const { message, size } = props;
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40px'
      }}
    >
      <Spinner size={size} />
      { message && <Text sx={{ marginLeft: 3 }}>{message}</Text> }
    </Box>
  )
}

CenteredSpinner.defaultProps = {
  size: "medium",
} as Partial<ICenteredSpinnerProps>;

export default CenteredSpinner;
