/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { AlertIcon } from '@primer/octicons-react';
import { Box, Button, Flash } from '@primer/react';
import { useNavigate } from '../../hooks';

export const FlashMock = () => {
  const navigate = useNavigate();
  return (
    <Flash variant="warning" style={{ marginBottom: 10 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 3,
          width: '100%',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <AlertIcon />
          <span>
            This is placeholder content. Contact us to learn more about this
            feature.
          </span>
        </Box>
        <Button size="small" onClick={() => navigate('/contact')}>
          Contact Us
        </Button>
      </Box>
    </Flash>
  );
};

export default FlashMock;
