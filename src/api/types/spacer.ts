/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a workspace or project space in Datalayer
 * @interface Space
 */
export interface Space {
  id: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private' | 'organization';
  owner_id: string;
  organization_id?: string;
  created_at: string;
  updated_at?: string;
  notebooks_count?: number;
  members_count?: number;
  tags?: string[];
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
  content?: NotebookContent;
  space_id: string;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  version?: number;
  kernel_spec?: KernelSpec;
  metadata?: Record<string, any>;
}

/**
 * The content structure of a Jupyter notebook
 * @interface NotebookContent
 */
export interface NotebookContent {
  cells: Cell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}

/**
 * Represents a single cell in a Jupyter notebook
 * @interface Cell
 */
export interface Cell {
  id: string;
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  outputs?: CellOutput[];
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

/**
 * Output from executing a notebook cell
 * @interface CellOutput
 */
export interface CellOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  data?: Record<string, any>;
  text?: string | string[];
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

/**
 * Metadata associated with a notebook
 * @interface NotebookMetadata
 */
export interface NotebookMetadata {
  kernelspec?: KernelSpec;
  language_info?: LanguageInfo;
  orig_nbformat?: number;
  [key: string]: any;
}

/**
 * Specification for a Jupyter kernel
 * @interface KernelSpec
 */
export interface KernelSpec {
  display_name: string;
  language: string;
  name: string;
}

/**
 * Information about the programming language used in a notebook
 * @interface LanguageInfo
 */
export interface LanguageInfo {
  name: string;
  version?: string;
  mimetype?: string;
  file_extension?: string;
}

/**
 * Request payload for creating a new space
 * @interface CreateSpaceRequest
 */
export interface CreateSpaceRequest {
  name: string;
  description?: string;
  visibility?: Space['visibility'];
  organization_id?: string;
  tags?: string[];
}

/**
 * Request payload for creating a new notebook
 * @interface CreateNotebookRequest
 */
export interface CreateNotebookRequest {
  name: string;
  path?: string;
  content?: NotebookContent;
  space_id: string;
  kernel_spec?: KernelSpec;
  metadata?: Record<string, any>;
}

/**
 * Request payload for updating a notebook
 * @interface UpdateNotebookRequest
 */
export interface UpdateNotebookRequest {
  name?: string;
  content?: NotebookContent;
  metadata?: Record<string, any>;
}

/**
 * Request payload for cloning a notebook
 * @interface CloneNotebookRequest
 */
export interface CloneNotebookRequest {
  source_id: string;
  name: string;
  space_id: string;
}

/**
 * Query parameters for listing spaces
 * @interface SpacesListParams
 */
export interface SpacesListParams {
  visibility?: Space['visibility'];
  owner_id?: string;
  organization_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

/**
 * Query parameters for listing notebooks
 * @interface NotebooksListParams
 */
export interface NotebooksListParams {
  space_id?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
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
  name: string;
  content?: any;
  space_id: string;
}

/**
 * Request payload for updating a Lexical document
 * @interface UpdateLexicalRequest
 */
export interface UpdateLexicalRequest {
  name?: string;
  content?: any;
}

/**
 * Request payload for creating a notebook cell
 * @interface CreateCellRequest
 */
export interface CreateCellRequest {
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  notebook_id: string;
  metadata?: Record<string, any>;
}

/**
 * Request payload for updating a notebook cell
 * @interface UpdateCellRequest
 */
export interface UpdateCellRequest {
  source?: string | string[];
  outputs?: CellOutput[];
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

// API Response types that match actual server responses
/**
 * Response from listing spaces
 * @interface SpacesListResponse
 */
export interface SpacesListResponse {
  success: boolean;
  message: string;
  spaces: Space[];
}

/**
 * Response from listing notebooks
 * @interface NotebooksListResponse
 */
export interface NotebooksListResponse {
  success: boolean;
  message: string;
  notebooks: Notebook[];
}
