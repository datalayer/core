/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { registerPortalRoot } from '@primer/react';
// import { render } from 'react-dom';
// import { Styles } from './Styles';

const PRIMER_PORTAL_ROOT_ID = '__primerPortalRoot__';

import '@primer/react-brand/lib/css/main.css';

/**
 * Ensure we define a root for Primer portal root.
 *
 *  @see https://github.com/primer/react/blob/main/packages/react/src/Portal/Portal.tsx#L23
 *  @see https://github.com/primer/react/blob/030fe020b48b7f12c2994c6614e5d4191fe764ee/src/Portal/Portal.tsx#L33
 */
export const setupPrimerPortals = () => {
  const div = document.body;
  div.dataset['portalRoot'] = 'true';
  div.dataset['colorMode'] = 'light';
  div.dataset['lightTheme'] = 'light';
  div.dataset['darkTheme'] = 'dark';
  div.id = PRIMER_PORTAL_ROOT_ID;
  registerPortalRoot(div);
  //  render(<Styles/>, div);
};

export default setupPrimerPortals;
