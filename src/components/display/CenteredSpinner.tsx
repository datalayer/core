/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Spinner, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';

declare const sizeMap: {
  small: string;
  medium: string;
  large: string;
};

type ICenteredSpinnerProps = {
  message?: string;
  size?: keyof typeof sizeMap;
};

export const CenteredSpinner = ({
  message,
  size = 'medium',
}: ICenteredSpinnerProps) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '40px',
      }}
    >
      <Spinner size={size} />
      {message && <Text sx={{ marginLeft: 3 }}>{message}</Text>}
    </Box>
  );
};

export default CenteredSpinner;
