/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * @module renderer/components/app/UserMenu
 * @description User profile dropdown menu component with GitHub user display and logout.
 */

import React, { useEffect } from 'react';
import { Header, Button, Avatar, Box, Text } from '@primer/react';
import { SignOutIcon } from '@primer/octicons-react';
import { UserMenuProps } from '../../../shared/types';

/**
 * User menu dropdown component for the application header.
 * Displays GitHub user profile information and provides logout functionality.
 * @component
 * @param props - Component props
 * @param props.githubUser - GitHub user information
 * @param props.isOpen - Whether the menu is currently open
 * @param props.onOpenChange - Callback to toggle menu open state
 * @param props.onLogout - Callback when user logs out
 * @returns Rendered user menu dropdown
 */
const UserMenu: React.FC<UserMenuProps> = ({
  githubUser,
  isOpen,
  onOpenChange,
  onLogout,
}) => {
  /**
   * Handle Escape key press to close user menu.
   * Captures escape key at document level when menu is open.
   */
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        event.preventDefault();
        event.stopPropagation();
        onOpenChange(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey, true);
      return () => {
        document.removeEventListener('keydown', handleEscapeKey, true);
      };
    }

    return undefined;
  }, [isOpen, onOpenChange]);

  /**
   * Handle user logout action.
   * Triggers logout callback and closes menu.
   */
  const handleLogout = () => {
    onLogout();
    onOpenChange(false);
  };

  /**
   * Toggle user menu visibility.
   */
  const handleMenuToggle = () => {
    onOpenChange(!isOpen);
  };

  return (
    <Header.Item sx={{ position: 'relative' }}>
      <Button
        variant="invisible"
        onClick={handleMenuToggle}
        aria-label={`User menu for ${githubUser.name || githubUser.login}`}
        aria-describedby="user-menu-description"
        aria-expanded={isOpen}
        sx={{
          p: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          borderRadius: '50%',
          cursor: 'pointer',
          '&:hover': {
            opacity: 0.8,
          },
        }}
      >
        <Avatar
          src={githubUser.avatar_url}
          size={32}
          alt=""
          sx={{
            borderRadius: '50%',
            objectFit: 'cover',
            flexShrink: 0,
          }}
        />
      </Button>

      {isOpen && (
        <Box
          sx={{
            position: 'fixed',
            top: '60px',
            right: '16px',
            width: '280px',
            bg: 'canvas.default',
            border: '1px solid',
            borderColor: 'border.default',
            borderRadius: 2,
            boxShadow: 'shadow.large',
            zIndex: 9999,
            overflow: 'hidden',
          }}
          role="menu"
          aria-labelledby="user-menu-description"
        >
          <Box
            sx={{
              p: 3,
              borderBottom: '1px solid',
              borderColor: 'border.default',
              display: 'flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Avatar
              src={githubUser.avatar_url}
              size={32}
              alt=""
              sx={{
                borderRadius: '50%',
                objectFit: 'cover',
                flexShrink: 0,
              }}
            />
            <Box>
              <Text
                sx={{
                  fontWeight: 'semibold',
                  display: 'block',
                  color: 'fg.default',
                }}
              >
                {githubUser.name || githubUser.login}
              </Text>
              <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                @{githubUser.login}
              </Text>
            </Box>
          </Box>

          <Box sx={{ p: 1 }}>
            <Button
              variant="invisible"
              onClick={handleLogout}
              sx={{
                width: '100%',
                justifyContent: 'flex-start',
                color: 'danger.fg',
                px: 3,
                py: 2,
                '&:hover': {
                  bg: 'canvas.subtle',
                  color: 'danger.fg',
                },
              }}
            >
              <SignOutIcon size={16} />
              <Text sx={{ ml: 2 }}>Sign out</Text>
            </Button>
          </Box>
        </Box>
      )}
    </Header.Item>
  );
};

export default UserMenu;
