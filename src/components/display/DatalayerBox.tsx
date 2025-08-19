/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { Link, Text } from '@primer/react';
import { Box } from '@datalayer/primer-addons';
import { ArrowRightIcon } from '@primer/octicons-react';
import { useNavigate } from '../../hooks';

type DatalayerBoxProps = {
  id?: string;
  title: string;
  linkLabel?: string;
  linkRoute?: string;
};

export const DatalayerBox = (
  props: React.PropsWithChildren<DatalayerBoxProps>,
) => {
  const { title, linkLabel, linkRoute, children } = props;
  const navigate = useNavigate();
  return (
    <>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingRight: 4,
        }}
      >
        <Text as="h2" sx={{ borderLeft: '6px solid #28b899', paddingLeft: 2 }}>
          {title}
        </Text>
        {linkRoute && linkLabel && (
          <Link
            href="javascript: return false;"
            onClick={e => navigate(linkRoute)}
          >
            {linkLabel}
            <ArrowRightIcon />
          </Link>
        )}
      </Box>
      <Box
        sx={{
          borderColor: 'border.default',
          borderStyle: 'solid',
          borderWidth: '1',
          borderRadius: '2',
          padding: 4,
          marginTop: 2,
        }}
      >
        {children}
      </Box>
    </>
  );
};

export default DatalayerBox;
