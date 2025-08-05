/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { SxProp, sx } from '@primer/react';
import styled from 'styled-components';

export interface IVisuallyHiddenProps {
  isVisible?: boolean;
}

export const VisuallyHidden = styled.span<IVisuallyHiddenProps & SxProp>`
  ${({ isVisible = false }) => {
    if (isVisible) {
      return sx;
    }

    return `
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border-width: 0;
    `;
  }}
`;
