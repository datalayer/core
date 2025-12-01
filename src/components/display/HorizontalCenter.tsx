/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { PropsWithChildren } from 'react';

type IHorizontalCenterProps = {
  margin?: string;
};

export const HorizontalCenter = ({
  children,
  margin = '0px',
}: PropsWithChildren<IHorizontalCenterProps>) => {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin,
      }}
    >
      {children}
    </div>
  );
};

export default HorizontalCenter;
