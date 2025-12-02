/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { forwardRef, useCallback } from 'react';
import { useNavigate } from '../hooks/useNavigate';

// Simple type definition for NavigationLink props
export interface NavigationLinkProps extends Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  'href'
> {
  to: string;
  replace?: boolean;
  state?: any;
}

/**
 * Navigation link component that works with any routing solution
 */
export const NavigationLink = forwardRef<
  HTMLAnchorElement,
  NavigationLinkProps
>(({ to, children, replace = false, state, onClick, ...props }, ref) => {
  const navigate = useNavigate();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow custom onClick handler
      if (onClick) {
        onClick(e);
      }

      // If not prevented, navigate
      if (!e.defaultPrevented) {
        e.preventDefault();
        navigate(to, e, true, { replace, state });
      }
    },
    [to, replace, state, navigate, onClick],
  );

  return (
    <a ref={ref} href={to} onClick={handleClick} {...props}>
      {children}
    </a>
  );
});

NavigationLink.displayName = 'NavigationLink';

/**
 * Compatibility export for react-router-dom Link
 * @deprecated Use NavigationLink
 */
export const Link = NavigationLink;

/**
 * Compatibility export for react-router-dom NavLink
 * @deprecated Use NavigationLink with custom styling
 */
export const NavLink = NavigationLink;
