/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient, ApiResponse } from '../../base/client';
import { handleSpacerApiCall } from '../../utils/error-handling';
import {
  Space,
  Notebook,
  Course,
  CourseItem,
  Enrollment,
  Assignment,
  Submission,
  Exercise,
  Dataset,
  CreateSpaceRequest,
  CreateNotebookRequest,
  UpdateNotebookRequest,
  CloneNotebookRequest,
  CreateCourseRequest,
  CreateAssignmentRequest,
  GradeSubmissionRequest,
  CreateExerciseRequest,
  CreateDatasetRequest,
  SpacesListParams,
  NotebooksListParams,
  Cell,
  SpacesListResponse,
  NotebooksListResponse,
} from '../../types/spacer';

const BASE_PATH = '/api/spacer/v1';

export const spacesApi = {
  create: async (
    client: ApiClient,
    data: CreateSpaceRequest,
  ): Promise<ApiResponse<Space>> => {
    return client.post(`${BASE_PATH}/spaces`, data);
  },

  list: async (
    client: ApiClient,
    params?: SpacesListParams,
  ): Promise<ApiResponse<SpacesListResponse>> => {
    return handleSpacerApiCall(
      () => client.get(`${BASE_PATH}/spaces`, { params }),
      'list spaces',
      { success: true, message: 'Empty list', spaces: [] },
    );
  },

  get: async (
    client: ApiClient,
    spaceId: string,
  ): Promise<ApiResponse<Space>> => {
    return client.get(`${BASE_PATH}/spaces/${spaceId}`);
  },

  update: async (
    client: ApiClient,
    spaceId: string,
    data: Partial<CreateSpaceRequest>,
  ): Promise<ApiResponse<Space>> => {
    return client.patch(`${BASE_PATH}/spaces/${spaceId}`, data);
  },

  delete: async (
    client: ApiClient,
    spaceId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/spaces/${spaceId}`);
  },

  export: async (
    client: ApiClient,
    spaceId: string,
  ): Promise<ApiResponse<Blob>> => {
    return client.get(`${BASE_PATH}/spaces/${spaceId}/export`, {
      headers: { Accept: 'application/zip' },
    });
  },

  addMember: async (
    client: ApiClient,
    spaceId: string,
    userId: string,
    role?: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/spaces/${spaceId}/members`, {
      user_id: userId,
      role,
    });
  },

  removeMember: async (
    client: ApiClient,
    spaceId: string,
    userId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/spaces/${spaceId}/members/${userId}`);
  },

  listMembers: async (
    client: ApiClient,
    spaceId: string,
  ): Promise<ApiResponse<Array<{ user_id: string; role: string }>>> => {
    return client.get(`${BASE_PATH}/spaces/${spaceId}/members`);
  },
};

export const notebooksApi = {
  create: async (
    client: ApiClient,
    data: CreateNotebookRequest,
  ): Promise<ApiResponse<Notebook>> => {
    return client.post(`${BASE_PATH}/notebooks`, data);
  },

  list: async (
    client: ApiClient,
    params?: NotebooksListParams,
  ): Promise<ApiResponse<NotebooksListResponse>> => {
    return handleSpacerApiCall(
      () => client.get(`${BASE_PATH}/notebooks`, { params }),
      'list notebooks',
      { success: true, message: 'Empty list', notebooks: [] },
    );
  },

  get: async (
    client: ApiClient,
    notebookId: string,
  ): Promise<ApiResponse<Notebook>> => {
    return client.get(`${BASE_PATH}/notebooks/${notebookId}`);
  },

  getByUid: async (
    client: ApiClient,
    uid: string,
  ): Promise<ApiResponse<Notebook>> => {
    return client.get(`${BASE_PATH}/notebooks/uid/${uid}`);
  },

  update: async (
    client: ApiClient,
    notebookId: string,
    data: UpdateNotebookRequest,
  ): Promise<ApiResponse<Notebook>> => {
    return client.patch(`${BASE_PATH}/notebooks/${notebookId}`, data);
  },

  delete: async (
    client: ApiClient,
    notebookId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/notebooks/${notebookId}`);
  },

  clone: async (
    client: ApiClient,
    data: CloneNotebookRequest,
  ): Promise<ApiResponse<Notebook>> => {
    return client.post(`${BASE_PATH}/notebooks/clone`, data);
  },

  getContent: async (
    client: ApiClient,
    notebookId: string,
  ): Promise<ApiResponse<any>> => {
    return client.get(`${BASE_PATH}/notebooks/${notebookId}/content`);
  },

  updateContent: async (
    client: ApiClient,
    notebookId: string,
    content: any,
  ): Promise<ApiResponse<void>> => {
    return client.put(`${BASE_PATH}/notebooks/${notebookId}/content`, content);
  },

  execute: async (
    client: ApiClient,
    notebookId: string,
    cellId?: string,
  ): Promise<ApiResponse<any>> => {
    return client.post(`${BASE_PATH}/notebooks/${notebookId}/execute`, {
      cell_id: cellId,
    });
  },

  getCollaborationDocument: async (
    client: ApiClient,
    notebookUid: string,
  ): Promise<ApiResponse<any>> => {
    return client.get(`${BASE_PATH}/documents/${notebookUid}`);
  },

  updateCollaborationDocument: async (
    client: ApiClient,
    notebookUid: string,
    update: any,
  ): Promise<ApiResponse<void>> => {
    return client.put(`${BASE_PATH}/documents/${notebookUid}`, update);
  },
};

export const cellsApi = {
  create: async (
    client: ApiClient,
    notebookId: string,
    cell: Cell,
  ): Promise<ApiResponse<Cell>> => {
    return client.post(`${BASE_PATH}/notebooks/${notebookId}/cells`, cell);
  },

  get: async (
    client: ApiClient,
    notebookId: string,
    cellId: string,
  ): Promise<ApiResponse<Cell>> => {
    return client.get(`${BASE_PATH}/notebooks/${notebookId}/cells/${cellId}`);
  },

  update: async (
    client: ApiClient,
    notebookId: string,
    cellId: string,
    data: Partial<Cell>,
  ): Promise<ApiResponse<Cell>> => {
    return client.patch(
      `${BASE_PATH}/notebooks/${notebookId}/cells/${cellId}`,
      data,
    );
  },

  delete: async (
    client: ApiClient,
    notebookId: string,
    cellId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(
      `${BASE_PATH}/notebooks/${notebookId}/cells/${cellId}`,
    );
  },

  execute: async (
    client: ApiClient,
    notebookId: string,
    cellId: string,
  ): Promise<ApiResponse<any>> => {
    return client.post(
      `${BASE_PATH}/notebooks/${notebookId}/cells/${cellId}/execute`,
    );
  },
};

export const coursesApi = {
  create: async (
    client: ApiClient,
    data: CreateCourseRequest,
  ): Promise<ApiResponse<Course>> => {
    return client.post(`${BASE_PATH}/courses`, data);
  },

  list: async (
    client: ApiClient,
    params?: {
      space_id?: string;
      instructor_id?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ApiResponse<Course[]>> => {
    return client.get(`${BASE_PATH}/courses`, { params });
  },

  get: async (
    client: ApiClient,
    courseId: string,
  ): Promise<ApiResponse<Course>> => {
    return client.get(`${BASE_PATH}/courses/${courseId}`);
  },

  update: async (
    client: ApiClient,
    courseId: string,
    data: Partial<CreateCourseRequest>,
  ): Promise<ApiResponse<Course>> => {
    return client.patch(`${BASE_PATH}/courses/${courseId}`, data);
  },

  delete: async (
    client: ApiClient,
    courseId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/courses/${courseId}`);
  },

  addItem: async (
    client: ApiClient,
    courseId: string,
    item: Omit<CourseItem, 'id' | 'course_id'>,
  ): Promise<ApiResponse<CourseItem>> => {
    return client.post(`${BASE_PATH}/courses/${courseId}/items`, item);
  },

  removeItem: async (
    client: ApiClient,
    courseId: string,
    itemId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/courses/${courseId}/items/${itemId}`);
  },

  updateItem: async (
    client: ApiClient,
    courseId: string,
    itemId: string,
    data: Partial<CourseItem>,
  ): Promise<ApiResponse<CourseItem>> => {
    return client.patch(
      `${BASE_PATH}/courses/${courseId}/items/${itemId}`,
      data,
    );
  },
};

export const enrollmentsApi = {
  enroll: async (
    client: ApiClient,
    courseId: string,
    studentId?: string,
  ): Promise<ApiResponse<Enrollment>> => {
    return client.post(`${BASE_PATH}/courses/${courseId}/enrollments`, {
      student_id: studentId,
    });
  },

  list: async (
    client: ApiClient,
    courseId: string,
    params?: { status?: Enrollment['status']; limit?: number; offset?: number },
  ): Promise<ApiResponse<Enrollment[]>> => {
    return client.get(`${BASE_PATH}/courses/${courseId}/enrollments`, {
      params,
    });
  },

  get: async (
    client: ApiClient,
    courseId: string,
    enrollmentId: string,
  ): Promise<ApiResponse<Enrollment>> => {
    return client.get(
      `${BASE_PATH}/courses/${courseId}/enrollments/${enrollmentId}`,
    );
  },

  update: async (
    client: ApiClient,
    courseId: string,
    enrollmentId: string,
    data: Partial<Enrollment>,
  ): Promise<ApiResponse<Enrollment>> => {
    return client.patch(
      `${BASE_PATH}/courses/${courseId}/enrollments/${enrollmentId}`,
      data,
    );
  },

  drop: async (
    client: ApiClient,
    courseId: string,
    enrollmentId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(
      `${BASE_PATH}/courses/${courseId}/enrollments/${enrollmentId}`,
    );
  },

  getStudentEnrollments: async (
    client: ApiClient,
    studentId: string,
  ): Promise<ApiResponse<Enrollment[]>> => {
    return client.get(`${BASE_PATH}/students/${studentId}/enrollments`);
  },
};

export const assignmentsApi = {
  create: async (
    client: ApiClient,
    data: CreateAssignmentRequest,
  ): Promise<ApiResponse<Assignment>> => {
    return client.post(`${BASE_PATH}/assignments`, data);
  },

  list: async (
    client: ApiClient,
    params?: { course_id?: string; limit?: number; offset?: number },
  ): Promise<ApiResponse<Assignment[]>> => {
    return client.get(`${BASE_PATH}/assignments`, { params });
  },

  get: async (
    client: ApiClient,
    assignmentId: string,
  ): Promise<ApiResponse<Assignment>> => {
    return client.get(`${BASE_PATH}/assignments/${assignmentId}`);
  },

  update: async (
    client: ApiClient,
    assignmentId: string,
    data: Partial<CreateAssignmentRequest>,
  ): Promise<ApiResponse<Assignment>> => {
    return client.patch(`${BASE_PATH}/assignments/${assignmentId}`, data);
  },

  delete: async (
    client: ApiClient,
    assignmentId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/assignments/${assignmentId}`);
  },

  submit: async (
    client: ApiClient,
    assignmentId: string,
    notebookId: string,
  ): Promise<ApiResponse<Submission>> => {
    return client.post(`${BASE_PATH}/assignments/${assignmentId}/submissions`, {
      notebook_id: notebookId,
    });
  },

  getSubmissions: async (
    client: ApiClient,
    assignmentId: string,
  ): Promise<ApiResponse<Submission[]>> => {
    return client.get(`${BASE_PATH}/assignments/${assignmentId}/submissions`);
  },

  gradeSubmission: async (
    client: ApiClient,
    submissionId: string,
    data: GradeSubmissionRequest,
  ): Promise<ApiResponse<Submission>> => {
    return client.post(`${BASE_PATH}/submissions/${submissionId}/grade`, data);
  },

  returnSubmission: async (
    client: ApiClient,
    submissionId: string,
  ): Promise<ApiResponse<Submission>> => {
    return client.post(`${BASE_PATH}/submissions/${submissionId}/return`);
  },

  resetStudentAssignment: async (
    client: ApiClient,
    assignmentId: string,
    studentId: string,
  ): Promise<ApiResponse<void>> => {
    return client.post(`${BASE_PATH}/assignments/${assignmentId}/reset`, {
      student_id: studentId,
    });
  },
};

export const exercisesApi = {
  create: async (
    client: ApiClient,
    data: CreateExerciseRequest,
  ): Promise<ApiResponse<Exercise>> => {
    return client.post(`${BASE_PATH}/exercises`, data);
  },

  list: async (
    client: ApiClient,
    params?: {
      difficulty?: Exercise['difficulty'];
      tags?: string[];
      limit?: number;
      offset?: number;
    },
  ): Promise<ApiResponse<Exercise[]>> => {
    return client.get(`${BASE_PATH}/exercises`, { params });
  },

  get: async (
    client: ApiClient,
    exerciseId: string,
  ): Promise<ApiResponse<Exercise>> => {
    return client.get(`${BASE_PATH}/exercises/${exerciseId}`);
  },

  update: async (
    client: ApiClient,
    exerciseId: string,
    data: Partial<CreateExerciseRequest>,
  ): Promise<ApiResponse<Exercise>> => {
    return client.patch(`${BASE_PATH}/exercises/${exerciseId}`, data);
  },

  delete: async (
    client: ApiClient,
    exerciseId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/exercises/${exerciseId}`);
  },

  clone: async (
    client: ApiClient,
    exerciseId: string,
    title: string,
  ): Promise<ApiResponse<Exercise>> => {
    return client.post(`${BASE_PATH}/exercises/${exerciseId}/clone`, { title });
  },

  getSolution: async (
    client: ApiClient,
    exerciseId: string,
  ): Promise<ApiResponse<any>> => {
    return client.get(`${BASE_PATH}/exercises/${exerciseId}/solution`);
  },
};

export const datasetsApi = {
  create: async (
    client: ApiClient,
    data: CreateDatasetRequest,
  ): Promise<ApiResponse<Dataset>> => {
    return client.post(`${BASE_PATH}/datasets`, data);
  },

  list: async (
    client: ApiClient,
    params?: {
      space_id?: string;
      format?: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<ApiResponse<Dataset[]>> => {
    return client.get(`${BASE_PATH}/datasets`, { params });
  },

  get: async (
    client: ApiClient,
    datasetId: string,
  ): Promise<ApiResponse<Dataset>> => {
    return client.get(`${BASE_PATH}/datasets/${datasetId}`);
  },

  update: async (
    client: ApiClient,
    datasetId: string,
    data: Partial<CreateDatasetRequest>,
  ): Promise<ApiResponse<Dataset>> => {
    return client.patch(`${BASE_PATH}/datasets/${datasetId}`, data);
  },

  delete: async (
    client: ApiClient,
    datasetId: string,
  ): Promise<ApiResponse<void>> => {
    return client.delete(`${BASE_PATH}/datasets/${datasetId}`);
  },

  download: async (
    client: ApiClient,
    datasetId: string,
  ): Promise<ApiResponse<Blob>> => {
    return client.get(`${BASE_PATH}/datasets/${datasetId}/download`, {
      headers: { Accept: 'application/octet-stream' },
    });
  },

  upload: async (
    client: ApiClient,
    file: File,
    metadata: Partial<CreateDatasetRequest>,
  ): Promise<ApiResponse<Dataset>> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('metadata', JSON.stringify(metadata));

    return client.post(`${BASE_PATH}/datasets/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
