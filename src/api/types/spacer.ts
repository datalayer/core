/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
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

export interface NotebookContent {
  cells: Cell[];
  metadata: NotebookMetadata;
  nbformat: number;
  nbformat_minor: number;
}

export interface Cell {
  id: string;
  cell_type: 'code' | 'markdown' | 'raw';
  source: string | string[];
  outputs?: CellOutput[];
  execution_count?: number | null;
  metadata?: Record<string, any>;
}

export interface CellOutput {
  output_type: 'execute_result' | 'display_data' | 'stream' | 'error';
  data?: Record<string, any>;
  text?: string | string[];
  name?: string;
  ename?: string;
  evalue?: string;
  traceback?: string[];
}

export interface NotebookMetadata {
  kernelspec?: KernelSpec;
  language_info?: LanguageInfo;
  orig_nbformat?: number;
  [key: string]: any;
}

export interface KernelSpec {
  display_name: string;
  language: string;
  name: string;
}

export interface LanguageInfo {
  name: string;
  version?: string;
  mimetype?: string;
  file_extension?: string;
}

export interface Course {
  id: string;
  name: string;
  title: string;
  description?: string;
  space_id: string;
  instructor_id: string;
  organization_id?: string;
  created_at: string;
  updated_at?: string;
  start_date?: string;
  end_date?: string;
  enrollment_count?: number;
  items?: CourseItem[];
}

export interface CourseItem {
  id: string;
  course_id: string;
  type: 'notebook' | 'exercise' | 'assignment' | 'resource';
  resource_id: string;
  title: string;
  description?: string;
  order: number;
  is_required: boolean;
  points?: number;
  due_date?: string;
}

export interface Enrollment {
  id: string;
  course_id: string;
  student_id: string;
  enrolled_at: string;
  completed_at?: string;
  grade?: number;
  progress?: number;
  status: 'active' | 'completed' | 'dropped';
}

export interface Assignment {
  id: string;
  course_id: string;
  notebook_id: string;
  title: string;
  description?: string;
  points: number;
  due_date?: string;
  created_at: string;
  updated_at?: string;
  submissions?: Submission[];
}

export interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  notebook_id: string;
  submitted_at: string;
  graded_at?: string;
  grade?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'returned';
}

export interface Exercise {
  id: string;
  notebook_id: string;
  title: string;
  description?: string;
  solution?: NotebookContent;
  points: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  tags?: string[];
  created_at: string;
  updated_at?: string;
}

export interface Dataset {
  id: string;
  name: string;
  description?: string;
  file_path?: string;
  url?: string;
  size?: number;
  format?: string;
  space_id: string;
  created_at: string;
  updated_at?: string;
  metadata?: Record<string, any>;
}

export interface CreateSpaceRequest {
  name: string;
  description?: string;
  visibility?: Space['visibility'];
  organization_id?: string;
  tags?: string[];
}

export interface CreateNotebookRequest {
  name: string;
  path?: string;
  content?: NotebookContent;
  space_id: string;
  kernel_spec?: KernelSpec;
  metadata?: Record<string, any>;
}

export interface UpdateNotebookRequest {
  name?: string;
  content?: NotebookContent;
  metadata?: Record<string, any>;
}

export interface CloneNotebookRequest {
  source_id: string;
  name: string;
  space_id: string;
}

export interface CreateCourseRequest {
  name: string;
  title: string;
  description?: string;
  space_id: string;
  organization_id?: string;
  start_date?: string;
  end_date?: string;
}

export interface CreateAssignmentRequest {
  course_id: string;
  notebook_id: string;
  title: string;
  description?: string;
  points: number;
  due_date?: string;
}

export interface GradeSubmissionRequest {
  grade: number;
  feedback?: string;
}

export interface CreateExerciseRequest {
  notebook_id: string;
  title: string;
  description?: string;
  solution?: NotebookContent;
  points: number;
  difficulty?: Exercise['difficulty'];
  tags?: string[];
}

export interface CreateDatasetRequest {
  name: string;
  description?: string;
  file_path?: string;
  url?: string;
  space_id: string;
  format?: string;
  metadata?: Record<string, any>;
}

export interface SpacesListParams {
  visibility?: Space['visibility'];
  owner_id?: string;
  organization_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

export interface NotebooksListParams {
  space_id?: string;
  owner_id?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

// API Response types that match actual server responses
export interface SpacesListResponse {
  success: boolean;
  message: string;
  spaces: Space[];
}

export interface NotebooksListResponse {
  success: boolean;
  message: string;
  notebooks: Notebook[];
}
