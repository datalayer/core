/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { PropsWithChildren } from "react";

type IHorizontalCenterProps = {
  margin?: string;
}

export const HorizontalCenter = (props: PropsWithChildren<IHorizontalCenterProps>) => {
  const { children, margin } = props;
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
}

HorizontalCenter.defaultProps = {
  margin: "0px",
} as IHorizontalCenterProps

export default HorizontalCenter;
