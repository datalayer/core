/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

export interface NotebookItem {
  id: string;
  uid?: string;
  name: string;
  path: string;
  createdAt: string;
  modifiedAt: string;
  size?: number;
  kernel?: string;
  cdnUrl?: string;
  description?: string;
}

export interface DocumentItem extends NotebookItem {
  type?: string;
  type_s?: string;
  item_type?: string;
}

export interface SpaceInfo {
  id: string;
  uid?: string;
  name: string;
  handle?: string;
}

export interface GroupedDocuments {
  notebooks: DocumentItem[];
  documents: DocumentItem[];
}

export interface DocumentsListProps {
  onNotebookSelect?: (notebook: {
    id: string;
    name: string;
    path: string;
    cdnUrl?: string;
    description?: string;
  }) => void;
  onDocumentSelect?: (document: {
    id: string;
    name: string;
    path: string;
    cdnUrl?: string;
    description?: string;
  }) => void;
}

export interface HeaderProps {
  selectedSpace: SpaceInfo | null;
  userSpaces: SpaceInfo[];
  loading: boolean;
  isRefreshing: boolean;
  onSpaceChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onRefresh: () => void;
}

export interface NotebooksSectionProps {
  notebooks: DocumentItem[];
  loading: boolean;
  selectedNotebook: string | null;
  onNotebookSelect: (notebook: DocumentItem) => void;
  onDownloadNotebook: (notebook: DocumentItem) => void;
  onDeleteNotebook: (notebook: DocumentItem) => void;
}

export interface DocumentsSectionProps {
  documents: DocumentItem[];
  loading: boolean;
  selectedNotebook: string | null;
  onDocumentSelect: (document: DocumentItem) => void;
  onDownloadDocument: (document: DocumentItem) => void;
  onDeleteDocument: (document: DocumentItem) => void;
}

export interface NotebookItemProps {
  notebook: DocumentItem;
  isSelected: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export interface DocumentItemProps {
  document: DocumentItem;
  isSelected: boolean;
  onSelect: () => void;
  onDownload: () => void;
  onDelete: () => void;
}

export interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  item: NotebookItem | null;
  confirmationText: string;
  isDeleting: boolean;
  error: string | null;
  onConfirmationTextChange: (text: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface ErrorMessageProps {
  error: string | null;
  warning?: string | null;
}

export interface LoadingSpinnerProps {
  message: string;
}

export interface EmptyStateProps {
  icon: React.ComponentType<{ size: number }>;
  message: string;
}
