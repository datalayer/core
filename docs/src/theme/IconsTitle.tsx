import React from "react";
import { Box } from '@primer/react';

import '@primer/react-brand/lib/css/main.css'

type Props = {
  icon1: JSX.Element,
  icon2: JSX.Element,
  title: string,
}

export const IconsTitle = (props: Props) => {
  const { icon1, icon2, title } = props;
  return (
    <>
      <Box display="flex">
        <Box>
          {icon1}
        </Box>
        <Box>
          {icon2}
        </Box>
        <Box>
          {title}
        </Box>
      </Box>
    </>
  )
}

export default IconsTitle;
