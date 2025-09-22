/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { ApiClient } from '../../base/client';
import {
  spacesApi,
  notebooksApi,
  cellsApi,
  coursesApi,
  enrollmentsApi,
  assignmentsApi,
  exercisesApi,
  datasetsApi,
} from './api';
import type {
  Space,
  Notebook,
  Cell,
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
} from '../../types/spacer';

export class SpacesClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateSpaceRequest): Promise<Space> {
    const response = await spacesApi.create(this.client, data);
    return response.data;
  }

  async list(params?: SpacesListParams): Promise<Space[]> {
    const response = await spacesApi.list(this.client, params);
    return response.data.spaces;
  }

  async get(spaceId: string): Promise<Space> {
    const response = await spacesApi.get(this.client, spaceId);
    return response.data;
  }

  async update(
    spaceId: string,
    data: Partial<CreateSpaceRequest>,
  ): Promise<Space> {
    const response = await spacesApi.update(this.client, spaceId, data);
    return response.data;
  }

  async delete(spaceId: string): Promise<void> {
    await spacesApi.delete(this.client, spaceId);
  }

  async export(spaceId: string): Promise<Blob> {
    const response = await spacesApi.export(this.client, spaceId);
    return response.data;
  }

  async addMember(
    spaceId: string,
    userId: string,
    role?: string,
  ): Promise<void> {
    await spacesApi.addMember(this.client, spaceId, userId, role);
  }

  async removeMember(spaceId: string, userId: string): Promise<void> {
    await spacesApi.removeMember(this.client, spaceId, userId);
  }

  async listMembers(
    spaceId: string,
  ): Promise<Array<{ user_id: string; role: string }>> {
    const response = await spacesApi.listMembers(this.client, spaceId);
    return response.data;
  }
}

export class NotebooksClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateNotebookRequest): Promise<Notebook> {
    const response = await notebooksApi.create(this.client, data);
    return response.data;
  }

  async list(params?: NotebooksListParams): Promise<Notebook[]> {
    const response = await notebooksApi.list(this.client, params);
    return response.data.notebooks;
  }

  async get(notebookId: string): Promise<Notebook> {
    const response = await notebooksApi.get(this.client, notebookId);
    return response.data;
  }

  async getByUid(uid: string): Promise<Notebook> {
    const response = await notebooksApi.getByUid(this.client, uid);
    return response.data;
  }

  async update(
    notebookId: string,
    data: UpdateNotebookRequest,
  ): Promise<Notebook> {
    const response = await notebooksApi.update(this.client, notebookId, data);
    return response.data;
  }

  async delete(notebookId: string): Promise<void> {
    await notebooksApi.delete(this.client, notebookId);
  }

  async clone(data: CloneNotebookRequest): Promise<Notebook> {
    const response = await notebooksApi.clone(this.client, data);
    return response.data;
  }

  async getContent(notebookId: string): Promise<any> {
    const response = await notebooksApi.getContent(this.client, notebookId);
    return response.data;
  }

  async updateContent(notebookId: string, content: any): Promise<void> {
    await notebooksApi.updateContent(this.client, notebookId, content);
  }

  async execute(notebookId: string, cellId?: string): Promise<any> {
    const response = await notebooksApi.execute(
      this.client,
      notebookId,
      cellId,
    );
    return response.data;
  }

  async getCollaborationDocument(notebookUid: string): Promise<any> {
    const response = await notebooksApi.getCollaborationDocument(
      this.client,
      notebookUid,
    );
    return response.data;
  }

  async updateCollaborationDocument(
    notebookUid: string,
    update: any,
  ): Promise<void> {
    await notebooksApi.updateCollaborationDocument(
      this.client,
      notebookUid,
      update,
    );
  }
}

export class CellsClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(notebookId: string, cell: Cell): Promise<Cell> {
    const response = await cellsApi.create(this.client, notebookId, cell);
    return response.data;
  }

  async get(notebookId: string, cellId: string): Promise<Cell> {
    const response = await cellsApi.get(this.client, notebookId, cellId);
    return response.data;
  }

  async update(
    notebookId: string,
    cellId: string,
    data: Partial<Cell>,
  ): Promise<Cell> {
    const response = await cellsApi.update(
      this.client,
      notebookId,
      cellId,
      data,
    );
    return response.data;
  }

  async delete(notebookId: string, cellId: string): Promise<void> {
    await cellsApi.delete(this.client, notebookId, cellId);
  }

  async execute(notebookId: string, cellId: string): Promise<any> {
    const response = await cellsApi.execute(this.client, notebookId, cellId);
    return response.data;
  }
}

export class CoursesClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateCourseRequest): Promise<Course> {
    const response = await coursesApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    space_id?: string;
    instructor_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Course[]> {
    const response = await coursesApi.list(this.client, params);
    return response.data;
  }

  async get(courseId: string): Promise<Course> {
    const response = await coursesApi.get(this.client, courseId);
    return response.data;
  }

  async update(
    courseId: string,
    data: Partial<CreateCourseRequest>,
  ): Promise<Course> {
    const response = await coursesApi.update(this.client, courseId, data);
    return response.data;
  }

  async delete(courseId: string): Promise<void> {
    await coursesApi.delete(this.client, courseId);
  }

  async addItem(
    courseId: string,
    item: Omit<CourseItem, 'id' | 'course_id'>,
  ): Promise<CourseItem> {
    const response = await coursesApi.addItem(this.client, courseId, item);
    return response.data;
  }

  async removeItem(courseId: string, itemId: string): Promise<void> {
    await coursesApi.removeItem(this.client, courseId, itemId);
  }

  async updateItem(
    courseId: string,
    itemId: string,
    data: Partial<CourseItem>,
  ): Promise<CourseItem> {
    const response = await coursesApi.updateItem(
      this.client,
      courseId,
      itemId,
      data,
    );
    return response.data;
  }
}

export class EnrollmentsClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async enroll(courseId: string, studentId?: string): Promise<Enrollment> {
    const response = await enrollmentsApi.enroll(
      this.client,
      courseId,
      studentId,
    );
    return response.data;
  }

  async list(
    courseId: string,
    params?: { status?: Enrollment['status']; limit?: number; offset?: number },
  ): Promise<Enrollment[]> {
    const response = await enrollmentsApi.list(this.client, courseId, params);
    return response.data;
  }

  async get(courseId: string, enrollmentId: string): Promise<Enrollment> {
    const response = await enrollmentsApi.get(
      this.client,
      courseId,
      enrollmentId,
    );
    return response.data;
  }

  async update(
    courseId: string,
    enrollmentId: string,
    data: Partial<Enrollment>,
  ): Promise<Enrollment> {
    const response = await enrollmentsApi.update(
      this.client,
      courseId,
      enrollmentId,
      data,
    );
    return response.data;
  }

  async drop(courseId: string, enrollmentId: string): Promise<void> {
    await enrollmentsApi.drop(this.client, courseId, enrollmentId);
  }

  async getStudentEnrollments(studentId: string): Promise<Enrollment[]> {
    const response = await enrollmentsApi.getStudentEnrollments(
      this.client,
      studentId,
    );
    return response.data;
  }
}

export class AssignmentsClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateAssignmentRequest): Promise<Assignment> {
    const response = await assignmentsApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    course_id?: string;
    limit?: number;
    offset?: number;
  }): Promise<Assignment[]> {
    const response = await assignmentsApi.list(this.client, params);
    return response.data;
  }

  async get(assignmentId: string): Promise<Assignment> {
    const response = await assignmentsApi.get(this.client, assignmentId);
    return response.data;
  }

  async update(
    assignmentId: string,
    data: Partial<CreateAssignmentRequest>,
  ): Promise<Assignment> {
    const response = await assignmentsApi.update(
      this.client,
      assignmentId,
      data,
    );
    return response.data;
  }

  async delete(assignmentId: string): Promise<void> {
    await assignmentsApi.delete(this.client, assignmentId);
  }

  async submit(assignmentId: string, notebookId: string): Promise<Submission> {
    const response = await assignmentsApi.submit(
      this.client,
      assignmentId,
      notebookId,
    );
    return response.data;
  }

  async getSubmissions(assignmentId: string): Promise<Submission[]> {
    const response = await assignmentsApi.getSubmissions(
      this.client,
      assignmentId,
    );
    return response.data;
  }

  async gradeSubmission(
    submissionId: string,
    data: GradeSubmissionRequest,
  ): Promise<Submission> {
    const response = await assignmentsApi.gradeSubmission(
      this.client,
      submissionId,
      data,
    );
    return response.data;
  }

  async returnSubmission(submissionId: string): Promise<Submission> {
    const response = await assignmentsApi.returnSubmission(
      this.client,
      submissionId,
    );
    return response.data;
  }

  async resetStudentAssignment(
    assignmentId: string,
    studentId: string,
  ): Promise<void> {
    await assignmentsApi.resetStudentAssignment(
      this.client,
      assignmentId,
      studentId,
    );
  }
}

export class ExercisesClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateExerciseRequest): Promise<Exercise> {
    const response = await exercisesApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    difficulty?: Exercise['difficulty'];
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<Exercise[]> {
    const response = await exercisesApi.list(this.client, params);
    return response.data;
  }

  async get(exerciseId: string): Promise<Exercise> {
    const response = await exercisesApi.get(this.client, exerciseId);
    return response.data;
  }

  async update(
    exerciseId: string,
    data: Partial<CreateExerciseRequest>,
  ): Promise<Exercise> {
    const response = await exercisesApi.update(this.client, exerciseId, data);
    return response.data;
  }

  async delete(exerciseId: string): Promise<void> {
    await exercisesApi.delete(this.client, exerciseId);
  }

  async clone(exerciseId: string, title: string): Promise<Exercise> {
    const response = await exercisesApi.clone(this.client, exerciseId, title);
    return response.data;
  }

  async getSolution(exerciseId: string): Promise<any> {
    const response = await exercisesApi.getSolution(this.client, exerciseId);
    return response.data;
  }
}

export class DatasetsClient {
  constructor(client: ApiClient) {
    this.client = client;
  }

  private client: ApiClient;

  async create(data: CreateDatasetRequest): Promise<Dataset> {
    const response = await datasetsApi.create(this.client, data);
    return response.data;
  }

  async list(params?: {
    space_id?: string;
    format?: string;
    limit?: number;
    offset?: number;
  }): Promise<Dataset[]> {
    const response = await datasetsApi.list(this.client, params);
    return response.data;
  }

  async get(datasetId: string): Promise<Dataset> {
    const response = await datasetsApi.get(this.client, datasetId);
    return response.data;
  }

  async update(
    datasetId: string,
    data: Partial<CreateDatasetRequest>,
  ): Promise<Dataset> {
    const response = await datasetsApi.update(this.client, datasetId, data);
    return response.data;
  }

  async delete(datasetId: string): Promise<void> {
    await datasetsApi.delete(this.client, datasetId);
  }

  async download(datasetId: string): Promise<Blob> {
    const response = await datasetsApi.download(this.client, datasetId);
    return response.data;
  }

  async upload(
    file: File,
    metadata: Partial<CreateDatasetRequest>,
  ): Promise<Dataset> {
    const response = await datasetsApi.upload(this.client, file, metadata);
    return response.data;
  }
}

export class SpacerService {
  public readonly spaces: SpacesClient;
  public readonly notebooks: NotebooksClient;
  public readonly cells: CellsClient;
  public readonly courses: CoursesClient;
  public readonly enrollments: EnrollmentsClient;
  public readonly assignments: AssignmentsClient;
  public readonly exercises: ExercisesClient;
  public readonly datasets: DatasetsClient;

  constructor(client: ApiClient) {
    this.spaces = new SpacesClient(client);
    this.notebooks = new NotebooksClient(client);
    this.cells = new CellsClient(client);
    this.courses = new CoursesClient(client);
    this.enrollments = new EnrollmentsClient(client);
    this.assignments = new AssignmentsClient(client);
    this.exercises = new ExercisesClient(client);
    this.datasets = new DatasetsClient(client);
  }
}
