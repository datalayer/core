/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Represents a workspace or project space in Datalayer
 * @interface Space
 */
export interface Space {
  uid: string;
  name_t: string;
  handle_s: string;
  variant_s: string;
  description_t: string;
  tags_ss?: string[];
  members?: any[];
  items?: any[];
}

/**
 * Represents a Jupyter notebook document
 * @interface Notebook
 */
export interface Notebook {
  id: string;
  uid: string;
  name_t: string;
  description_t: string;
  type_s: string;
  notebook_extension_s: string;
  s3_path_s: string;
  s3_url_s: string;
  cdn_url_s: string;
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
 * Response from getting a collaboration session ID
 * @interface CollaborationSessionResponse
 */
export interface CollaborationSessionResponse {
  success: boolean;
  sessionId?: string;
  error?: string;
}

/**
 * Response from creating a space
 * @interface CreateSpaceResponse
 */
export interface CreateSpaceResponse {
  success: boolean;
  message: string;
  space?: Space;
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
  notebook?: Notebook;
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
  notebook?: Notebook;
}

/**
 * Represents an item within a space
 * @interface SpaceItem
 */
export interface SpaceItem {
  id: string;
  type_s: 'notebook' | 'lexical';
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
  name?: string; // May not be present in API response
  name_t?: string; // Text field for name
  content?: any;
  space_id?: string; // May not be present, extracted from s3_path_s
  owner_id?: string; // May not be present
  creator_uid?: string; // Creator UID from API
  creator_handle_s?: string; // Creator handle from API
  created_at?: string; // May not be present
  creation_ts_dt?: string; // Creation timestamp from API
  updated_at?: string; // May not be present
  last_update_ts_dt?: string; // Last update timestamp from API
  cdn_url_s: string;
  // Additional fields from actual API response
  type_s?: string;
  public_b?: boolean;
  description_t?: string;
  document_name_s?: string;
  document_extension_s: string;
  document_format_s?: string;
  content_length_i?: number;
  content_type_s?: string;
  mime_type_s?: string;
  s3_path_s?: string;
  s3_url_s?: string;
  model_s?: string;
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
  document?: Lexical;
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

/**
 * Response from getting a single space item
 * @interface GetSpaceItemResponse
 */
export interface GetSpaceItemResponse {
  success: boolean;
  message: string;
  item?: any; // Item data when found (various types: notebook, lexical, etc.)
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
