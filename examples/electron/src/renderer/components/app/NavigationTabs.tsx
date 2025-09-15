/**
 * @module renderer/components/app/NavigationTabs
 * @description Navigation tabs container component that manages tab visibility and state.
 */

/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import React from 'react';
import { Header } from '@primer/react';
import { DatabaseIcon, BookIcon, PencilIcon } from '@primer/octicons-react';
import NavigationTab from './NavigationTab';
import { NavigationTabsProps } from '../../../shared/types';

/**
 * Container component for navigation tabs in the app header.
 * Manages visibility of notebook and document editor tabs based on active state.
 * @component
 * @param props - Component props
 * @param props.currentView - Currently active view
 * @param props.isNotebookEditorActive - Whether notebook editor is active
 * @param props.isDocumentEditorActive - Whether document editor is active
 * @param props.onViewChange - Callback when view changes
 * @returns Rendered navigation tabs container
 */
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
