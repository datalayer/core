/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

// import { AlertIcon } from '@primer/octicons-react';
// import { Box, Flash as PrimerFlash, Link } from '@primer/react';
import { Link } from '@primer/react';
import { Banner } from '@primer/react/experimental';
import { QuestionIcon } from "@primer/octicons-react";
import { useNavigate } from '../../hooks';

export const FlashUnauthorized = (): JSX.Element => {
  const navigate = useNavigate();
  return (
    <>
      <Banner
        title="Warning"
        variant="warning"
  //    onDismiss={action('onDismiss')}
        description={
        <>
            Your current roles does not allow you to access this feature.
            Please <Link inline href="javascript: return false;" onClick={e => navigate("/support", e)}>contact support</Link> for more information.
        </>
        }
        primaryAction={
          <Banner.PrimaryAction onClick={e => navigate("/support/request", e)} leadingVisual={QuestionIcon}>
            Contact support
          </Banner.PrimaryAction>
        }
      />
      {/*
      <PrimerFlash variant='warning'>
        <Box display="flex">
          <Box
            sx={{
              display: 'grid',
              paddingBlock: 'var(--base-size-8)',
              alignSelf: 'center',
              gridArea: 'visual',
            }}
            
          >
            <AlertIcon/>
          </Box>
          <Box
            sx={{
              alignSelf: 'center',
              display: 'grid',
              gridArea: 'message'
            }}
          >
            Your role does not allow you to access this feature. Please contact our support for more information.
          </Box>
        </Box>
      </PrimerFlash>
      */}
    </>
  )
}

export default FlashUnauthorized;
