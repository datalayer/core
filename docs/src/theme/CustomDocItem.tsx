/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from "react";
import { ThemeProvider } from '@primer/react-brand';
import DocItem from "@theme/DocItem";

import '@primer/react-brand/lib/css/main.css'

export const CustomDocItem = (props: any) => {
  return (
    <>
      <ThemeProvider>
        <DocItem {...props}/>
      </ThemeProvider>
    </>
  )
}

export default CustomDocItem;
