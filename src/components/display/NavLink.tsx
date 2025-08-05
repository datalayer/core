/*
 * Copyright (c) 2021-2024 Datalayer, Inc.
 *
 * Datalayer License
 */

import { forwardRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from '../../hooks';

// Taken from https://primer.style/react/storybook/?path=/story/components-navlist--with-react-router-link

export type NavLinkProps = { to: string; children: ReactNode };
/**
 * React router Link for primer NavList
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, children, ...props }, ref) => {
    const navigate = useNavigate();
    const onClick = useCallback(() => {
      navigate(to);
    }, [to]);
    return (
      <a ref={ref} {...props} onClick={onClick}>
        {children}
      </a>
    );
  }
);
