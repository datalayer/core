/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Header } from '@primer/react';
import { DatabaseIcon, BookIcon, PencilIcon } from '@primer/octicons-react';
import NavigationTab from './NavigationTab';
import { NavigationTabsProps } from '../../../shared/types';

const NavigationTabs: React.FC<NavigationTabsProps> = ({
  currentView,
  isNotebookEditorActive,
  isDocumentEditorActive,
  onViewChange,
}) => {
  return (
    <>
      <NavigationTab
        label="Environments"
        icon={DatabaseIcon}
        isActive={currentView === 'environments'}
        onClick={() => onViewChange('environments')}
      />

      <NavigationTab
        label="Documents"
        icon={BookIcon}
        isActive={currentView === 'notebooks'}
        onClick={() => onViewChange('notebooks')}
      />

      {isNotebookEditorActive && (
        <NavigationTab
          label="Notebook Editor"
          icon={PencilIcon}
          isActive={currentView === 'notebook'}
          onClick={() => onViewChange('notebook')}
        />
      )}

      {isDocumentEditorActive && (
        <NavigationTab
          label="Document Editor"
          icon={PencilIcon}
          isActive={currentView === 'document'}
          onClick={() => onViewChange('document')}
        />
      )}

      <Header.Item full />
    </>
  );
};

export default NavigationTabs;
