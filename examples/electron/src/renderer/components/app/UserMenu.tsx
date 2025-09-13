/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useEffect } from 'react';
import {
  Header,
  Button,
  Avatar,
  ActionMenu,
  ActionList,
  Box,
  Text,
} from '@primer/react';
import { SignOutIcon } from '@primer/octicons-react';
import { COLORS } from '../../constants/colors';
import { UserMenuProps } from '../../../shared/types';

const UserMenu: React.FC<UserMenuProps> = ({
  githubUser,
  isOpen,
  onOpenChange,
  onLogout,
}) => {
  // Handle Escape key for user menu
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

  const handleLogout = () => {
    onLogout();
    onOpenChange(false);
  };

  return (
    <Header.Item>
      <ActionMenu open={isOpen} onOpenChange={onOpenChange}>
        <ActionMenu.Anchor>
          <Button
            variant="invisible"
            aria-label={`User menu for ${githubUser.name || githubUser.login}`}
            aria-describedby="user-menu-description"
            aria-expanded={isOpen}
            sx={{
              p: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              borderRadius: '50%',
              '&:focus-visible': {
                outline: '2px solid',
                outlineColor: COLORS.brand.primary,
                outlineOffset: '2px',
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
        </ActionMenu.Anchor>

        <ActionMenu.Overlay
          width="medium"
          role="menu"
          aria-labelledby="user-menu-description"
        >
          <div
            id="user-menu-description"
            style={{
              position: 'absolute',
              width: '1px',
              height: '1px',
              padding: '0',
              margin: '-1px',
              overflow: 'hidden',
              clip: 'rect(0, 0, 0, 0)',
              whiteSpace: 'nowrap',
              border: '0',
            }}
          >
            User account menu with profile information and sign out option
          </div>
          <ActionList>
            <ActionList.Item
              disabled
              sx={{ py: 3 }}
              role="menuitem"
              aria-label={`Profile information for ${githubUser.name || githubUser.login}`}
            >
              <ActionList.LeadingVisual>
                <Avatar
                  src={githubUser.avatar_url}
                  size={24}
                  alt=""
                  sx={{
                    borderRadius: '50%',
                    objectFit: 'cover',
                    flexShrink: 0,
                  }}
                />
              </ActionList.LeadingVisual>
              <Box>
                <Text sx={{ fontWeight: 'semibold', display: 'block' }}>
                  {githubUser.name || githubUser.login}
                </Text>
                <Text sx={{ fontSize: 0, color: 'fg.muted' }}>
                  @{githubUser.login}
                </Text>
              </Box>
            </ActionList.Item>

            <ActionList.Divider />

            <ActionList.Item
              onSelect={handleLogout}
              role="menuitem"
              aria-label="Sign out of your account"
              sx={{
                color: 'danger.fg',
                '&:hover': {
                  bg: 'canvas.subtle',
                  color: 'danger.fg',
                },
                '&:active': {
                  bg: 'canvas.subtle',
                },
                '&:focus-visible': {
                  outline: '2px solid',
                  outlineColor: COLORS.brand.primary,
                  outlineOffset: '-2px',
                },
              }}
            >
              <ActionList.LeadingVisual>
                <SignOutIcon />
              </ActionList.LeadingVisual>
              Sign out
            </ActionList.Item>
          </ActionList>
        </ActionMenu.Overlay>
      </ActionMenu>
    </Header.Item>
  );
};

export default UserMenu;
