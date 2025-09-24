/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a workspace or project space in Datalayer
 * @interface Space
 */
export interface Space {
  id?: string; // Optional for backward compatibility
  uid: string;
  name?: string; // Optional for backward compatibility
  name_t?: string; // New field from API
  handle_s?: string; // New field from API
  variant_s?: string; // New field from API
  description?: string;
  description_t?: string; // New field from API
  visibility?: 'public' | 'private' | 'organization';
  owner_id?: string;
  organization_id?: string;
  created_at?: string;
  updated_at?: string;
  notebooks_count?: number;
  members_count?: number;
  tags?: string[];
  tags_ss?: string[]; // New field from API
  items?: any[]; // New field from API
  members?: any[]; // New field from API
}

/**
 * Represents a Jupyter notebook document
 * @interface Notebook
 */
export interface Notebook {
  id: string;
  uid: string;
  name: string;
  path: string;
  content?: any; // Simplified - NotebookContent type removed
  space_id: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  version?: number;
  kernel_spec?: any; // Simplified - KernelSpec type removed
  metadata?: Record<string, any>;
}

/**
 * Represents a single cell in a Jupyter notebook
 * @interface Cell
 */
export interface Cell {
  id: string;
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  outputs?: any[]; // Simplified - CellOutput type removed
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Request payload for creating a new space
 * @interface CreateSpaceRequest
 */
export interface CreateSpaceRequest {
  name: string;
  description: string;
  variant: string;
  spaceHandle: string;
  organizationId: string;
  seedSpaceId: string;
  public: boolean;
}

/**
 * Response from creating a space
 * @interface CreateSpaceResponse
 */
export interface CreateSpaceResponse {
  success: boolean;
  message: string;
  space: Space;
}

/**
 * Request payload for creating a new notebook (multipart/form-data)
 * @interface CreateNotebookRequest
 */
export interface CreateNotebookRequest {
  spaceId: string;
  notebookType: string;
  name: string;
  description: string;
  file?: File | Blob; // Optional file for notebook content
}

/**
 * Response from creating a notebook
 * @interface CreateNotebookResponse
 */
export interface CreateNotebookResponse {
  success: boolean;
  message: string;
  notebook: Notebook;
}

/**
 * Response from getting a notebook
 * @interface GetNotebookResponse
 */
export interface GetNotebookResponse {
  success: boolean;
  message: string;
  notebook?: Notebook; // Optional - not present in 404 response
}

/**
 * Request payload for creating a notebook
 * @interface CreateNotebookRequest
 */
export interface CreateNotebookRequest {
  spaceId: string;
  notebookType: string;
  name: string;
  description: string;
  file?: File | Blob;
}

/**
 * Request payload for updating a notebook
 * @interface UpdateNotebookRequest
 */
export interface UpdateNotebookRequest {
  name?: string;
  description?: string;
}

/**
 * Response from updating a notebook
 * @interface UpdateNotebookResponse
 */
export interface UpdateNotebookResponse {
  success: boolean;
  message: string;
  notebook: Notebook;
}

/**
 * Represents an item within a space
 * @interface SpaceItem
 */
export interface SpaceItem {
  id: string;
  type: 'notebook' | 'lexical' | 'cell';
  space_id: string;
  item_id: string;
  name: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Represents a Lexical document (rich text editor)
 * @interface Lexical
 */
export interface Lexical {
  id: string;
  uid: string;
  name: string;
  content?: any;
  space_id: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
}

/**
 * Request payload for creating a Lexical document
 * @interface CreateLexicalRequest
 */
export interface CreateLexicalRequest {
  spaceId: string;
  documentType: string;
  name: string;
  description: string;
  file?: File | Blob;
}

/**
 * Response from creating a Lexical document
 * @interface CreateLexicalResponse
 */
export interface CreateLexicalResponse {
  success: boolean;
  message: string;
  document: Lexical;
}

/**
 * Response from getting a Lexical document
 * @interface GetLexicalResponse
 */
export interface GetLexicalResponse {
  success: boolean;
  message: string;
  document?: Lexical; // Optional - not present in 404 response
}

/**
 * Request payload for updating a Lexical document
 * @interface UpdateLexicalRequest
 */
export interface UpdateLexicalRequest {
  name?: string;
  description?: string;
}

/**
 * Response from updating a Lexical document
 * @interface UpdateLexicalResponse
 */
export interface UpdateLexicalResponse {
  success: boolean;
  message: string;
  document: Lexical;
}

/**
 * Response from getting space items
 * @interface GetSpaceItemsResponse
 */
export interface GetSpaceItemsResponse {
  success: boolean;
  message: string;
  items: SpaceItem[];
}

/**
 * Response from deleting a space item
 * @interface DeleteSpaceItemResponse
 */
export interface DeleteSpaceItemResponse {
  success: boolean;
  message: string;
}

// API Response types that match actual server responses
/**
 * Response from getting spaces for a user
 * @interface SpacesForUserResponse
 */
export interface SpacesForUserResponse {
  success: boolean;
  message: string;
  spaces: Space[];
}
