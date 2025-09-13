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
    <Header>
      <Header.Item>
        <Text
          sx={{
            fontSize: 3,
            fontWeight: 'bold',
            color: COLORS.brand.primary,
            mr: 4,
          }}
        >
          Datalayer Electron Example
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
