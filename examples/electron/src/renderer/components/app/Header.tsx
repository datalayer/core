/**
 * @module renderer/components/app/Header
 * @description Application header component with navigation and user menu.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React, { useState } from 'react';
import { Header, Text } from '@primer/react';
import { COLORS } from '../../../shared/constants/colors';
import NavigationTabs from './NavigationTabs';
import UserMenu from './UserMenu';
import { AppHeaderProps } from '../../../shared/types';

/**
 * Application header component.
 * Displays the app title, navigation tabs, and user menu.
 * @component
 * @param props - Component props
 * @param props.currentView - Currently active view
 * @param props.isNotebookEditorActive - Whether notebook editor is active
 * @param props.isDocumentEditorActive - Whether document editor is active
 * @param props.isAuthenticated - User authentication status
 * @param props.githubUser - GitHub user information
 * @param props.onViewChange - Callback for view navigation
 * @param props.onLogout - Callback for logout action
 * @returns Rendered header component
 */
const AppHeader: React.FC<AppHeaderProps> = ({
  currentView,
  isNotebookEditorActive,
  isDocumentEditorActive,
  isAuthenticated,
  githubUser,
  onViewChange,
  onLogout,
}) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  return (
    <Header
      sx={{
        backgroundColor: COLORS.background.secondary, // Light gray background
        borderBottom: '1px solid',
        borderColor: 'border.default',
      }}
    >
      <Header.Item>
        <Text
          sx={{
            fontSize: 3,
            fontWeight: 'bold',
            color: COLORS.brand.primary,
            mr: 4,
          }}
        >
          Datalayer Desktop
        </Text>
      </Header.Item>

      <NavigationTabs
        currentView={currentView}
        isNotebookEditorActive={isNotebookEditorActive}
        isDocumentEditorActive={isDocumentEditorActive}
        onViewChange={onViewChange}
      />

      {isAuthenticated && githubUser && (
        <UserMenu
          githubUser={githubUser}
          isOpen={isUserMenuOpen}
          onOpenChange={setIsUserMenuOpen}
          onLogout={onLogout}
        />
      )}
    </Header>
  );
};

export default AppHeader;
