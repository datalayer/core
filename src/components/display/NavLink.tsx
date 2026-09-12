/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { forwardRef, useCallback, type ReactNode } from 'react';
import { useNavigate } from '../../hooks';

// Taken from https://primer.style/react/storybook/?path=/story/components-navlist--with-react-router-link

export type NavLinkProps = {
  to: string;
  children: ReactNode;
  [key: string]: any;
};
/**
 * Navigation link for primer NavList
 * Works with React Router, Next.js, or native browser navigation
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ to, children, ...props }, ref) => {
    const navigate = useNavigate();
    // The hook decides: a plain click navigates here, a modifier click lets
    // the browser open the link in a new tab.
    const onClick = useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        navigate(to, e);
      },
      [to, navigate],
    );
    return (
      <a ref={ref} href={to} {...props} onClick={onClick}>
        {children}
      </a>
    );
  },
);
