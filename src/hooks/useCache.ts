/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * TanStack Query-based cache hook for Datalayer API
 *
 * This is a modernized replacement for useCache.tsx that leverages TanStack Query
 * for automatic cache management, background refetching, and optimistic updates.
 *
 * Key improvements over useCache:
 * - Automatic cache management (no manual Map objects)
 * - Built-in loading/error states
 * - Automatic refetching and deduplication
 * - Optimistic updates support
 * - Better TypeScript inference
 * - React Query DevTools integration
 *
 * @example
 * ```tsx
 * const { useUser, useUpdateUser } = useCache2();
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const { data: user, isPending, isError, error } = useUser(userId);
 *   const updateUser = useUpdateUser();
 *
 *   if (isPending) return <Spinner />;
 *   if (isError) return <Error message={error.message} />;
 *
 *   return (
 *     <div>
 *       <h1>{user.displayName}</h1>
 *       <button onClick={() => updateUser.mutate({ email: 'new@email.com' })}>
 *         Update Email
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

import {
  useQuery,
  useMutation,
  useQueryClient,
  UseQueryOptions,
  UseMutationOptions,
} from '@tanstack/react-query';
import {
  BOOTSTRAP_USER_ONBOARDING,
  IAnyOrganization,
  IAnySpace,
  IAssignment,
  ICell,
  IContact,
  ICourse,
  IDataset,
  IDatasource,
  IDocument,
  IEnvironment,
  IExercise,
  IIAMToken,
  ILesson,
  INotebook,
  IOrganization,
  IOrganizationMember,
  IPage,
  ISchool,
  ISecret,
  ISpaceItem,
  IStudentItem,
  ITeam,
  IUser,
  IUserOnboarding,
  IUserSettings,
  asContact,
  asDatasource,
  asInvite,
  asOrganization,
  asPage,
  asSecret,
  asSpace,
  asTeam,
  asToken,
  asUser,
} from '../models';
import { useCoreStore, useIAMStore } from '../state';
import { asDisplayName, namesAsInitials, asArray } from '../utils';
import { newUserMock } from './../mocks';
import { useDatalayer } from './useDatalayer';
import { useAuthorization } from './useAuthorization';
import { useUploadForm } from './useUpload';
import type {
  AgentSpaceData,
  CreateAgentSpaceRequest,
  UpdateAgentSpaceRequest,
} from '../api/spacer/agentSpaces';

import { OUTPUTSHOT_PLACEHOLDER_DEFAULT_SVG } from './assets';

// ============================================================================
// Types
// ============================================================================

export type CacheProps = {
  loginRoute?: string;
};

export type ISearchOpts = {
  q: string;
  types: string[];
  max: number;
  public: boolean;
};

// Kept for potential future use

// Default query options for all queries
const DEFAULT_QUERY_OPTIONS = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  retry: 1,
  refetchOnMount: false, // Don't refetch on mount if data is still fresh
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  // Ensure queries prioritize cache over network when data is fresh
  networkMode: 'online' as const,
};

// ============================================================================
// Query Key Factories
// ============================================================================

/**
 * Centralized query key factories for all entities
 * Following TanStack Query best practices for key structure
 * @see https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
 */
export const queryKeys = {
  // Authentication & Profile
  auth: {
    me: () => ['auth', 'me'] as const,
    whoami: () => ['auth', 'whoami'] as const,
  },

  // Users
  users: {
    all: () => ['users'] as const,
    lists: () => [...queryKeys.users.all(), 'list'] as const,
    list: (filters?: string) =>
      [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.users.all(), 'handle', handle] as const,
    search: (pattern: string) =>
      [...queryKeys.users.all(), 'search', pattern] as const,
    settings: (userId: string) =>
      [...queryKeys.users.detail(userId), 'settings'] as const,
    onboarding: (userId: string) =>
      [...queryKeys.users.detail(userId), 'onboarding'] as const,
    surveys: (userId: string) =>
      [...queryKeys.users.detail(userId), 'surveys'] as const,
    credits: (userId: string) =>
      [...queryKeys.users.detail(userId), 'credits'] as const,
  },

  // Organizations
  organizations: {
    all: () => ['organizations'] as const,
    lists: () => [...queryKeys.organizations.all(), 'list'] as const,
    details: () => [...queryKeys.organizations.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.organizations.details(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.organizations.all(), 'handle', handle] as const,
    userOrgs: () => [...queryKeys.organizations.all(), 'user'] as const,
    members: (orgId: string) =>
      [...queryKeys.organizations.detail(orgId), 'members'] as const,
  },

  // Teams
  teams: {
    all: () => ['teams'] as const,
    details: () => [...queryKeys.teams.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.teams.details(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.teams.all(), 'handle', handle] as const,
    byOrganization: (orgId: string) =>
      [...queryKeys.teams.all(), 'organization', orgId] as const,
    members: (teamId: string) =>
      [...queryKeys.teams.detail(teamId), 'members'] as const,
  },

  // Spaces
  spaces: {
    all: () => ['spaces'] as const,
    details: () => [...queryKeys.spaces.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.spaces.details(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.spaces.all(), 'handle', handle] as const,
    byOrganization: (orgId: string) =>
      [...queryKeys.spaces.all(), 'organization', orgId] as const,
    orgSpaceByHandle: (orgId: string, handle: string) =>
      [
        ...queryKeys.spaces.all(),
        'organization',
        orgId,
        'handle',
        handle,
      ] as const,
    byOrganizationAndHandle: (orgHandle: string, spaceHandle: string) =>
      [
        ...queryKeys.spaces.all(),
        'organization',
        orgHandle,
        'space',
        spaceHandle,
      ] as const,
    userSpaces: () => [...queryKeys.spaces.all(), 'user'] as const,
    items: (spaceId: string) =>
      [...queryKeys.spaces.detail(spaceId), 'items'] as const,
    members: (spaceId: string) =>
      [...queryKeys.spaces.detail(spaceId), 'members'] as const,
  },

  // Notebooks
  notebooks: {
    all: () => ['notebooks'] as const,
    details: () => [...queryKeys.notebooks.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.notebooks.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.notebooks.all(), 'space', spaceId] as const,
    model: (notebookId: string) =>
      [...queryKeys.notebooks.detail(notebookId), 'model'] as const,
  },

  // Documents
  documents: {
    all: () => ['documents'] as const,
    details: () => [...queryKeys.documents.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.documents.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.documents.all(), 'space', spaceId] as const,
    model: (documentId: string) =>
      [...queryKeys.documents.detail(documentId), 'model'] as const,
  },

  // Cells
  cells: {
    all: () => ['cells'] as const,
    details: () => [...queryKeys.cells.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.cells.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.cells.all(), 'space', spaceId] as const,
  },

  // Datasets
  datasets: {
    all: () => ['datasets'] as const,
    details: () => [...queryKeys.datasets.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.datasets.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.datasets.all(), 'space', spaceId] as const,
  },

  // Lessons
  lessons: {
    all: () => ['lessons'] as const,
    details: () => [...queryKeys.lessons.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.lessons.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.lessons.all(), 'space', spaceId] as const,
  },

  // Exercises
  exercises: {
    all: () => ['exercises'] as const,
    details: () => [...queryKeys.exercises.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.exercises.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.exercises.all(), 'space', spaceId] as const,
  },

  // Assignments
  assignments: {
    all: () => ['assignments'] as const,
    details: () => [...queryKeys.assignments.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.assignments.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.assignments.all(), 'space', spaceId] as const,
    forStudent: (assignmentId: string, courseId: string, studentId: string) =>
      [
        ...queryKeys.assignments.detail(assignmentId),
        'course',
        courseId,
        'student',
        studentId,
      ] as const,
    studentVersion: (assignmentId: string) =>
      [
        ...queryKeys.assignments.detail(assignmentId),
        'studentVersion',
      ] as const,
  },

  // Environments
  environments: {
    all: () => ['environments'] as const,
    details: () => [...queryKeys.environments.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.environments.details(), id] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.environments.all(), 'space', spaceId] as const,
  },

  // Pages
  pages: {
    all: () => ['pages'] as const,
    details: () => [...queryKeys.pages.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.pages.details(), id] as const,
  },

  // Datasources
  datasources: {
    all: () => ['datasources'] as const,
    details: () => [...queryKeys.datasources.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.datasources.details(), id] as const,
  },

  // Secrets
  secrets: {
    all: () => ['secrets'] as const,
    details: () => [...queryKeys.secrets.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.secrets.details(), id] as const,
  },

  // Tokens
  tokens: {
    all: () => ['tokens'] as const,
    details: () => [...queryKeys.tokens.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.tokens.details(), id] as const,
  },

  // Contacts
  contacts: {
    all: () => ['contacts'] as const,
    lists: () => [...queryKeys.contacts.all(), 'list'] as const,
    details: () => [...queryKeys.contacts.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.contacts.details(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.contacts.all(), 'handle', handle] as const,
    search: (query: string) =>
      [...queryKeys.contacts.all(), 'search', query] as const,
  },

  // Invites
  invites: {
    all: () => ['invites'] as const,
    byToken: (token: string) =>
      [...queryKeys.invites.all(), 'token', token] as const,
    byAccount: (accountId: string) =>
      [...queryKeys.invites.all(), 'account', accountId] as const,
  },

  // Courses
  courses: {
    all: () => ['courses'] as const,
    details: () => [...queryKeys.courses.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.courses.details(), id] as const,
    public: () => [...queryKeys.courses.all(), 'public'] as const,
    instructor: (instructorId: string) =>
      [...queryKeys.courses.all(), 'instructor', instructorId] as const,
    enrollments: () =>
      [...queryKeys.courses.all(), 'enrollments', 'me'] as const,
    students: (courseId: string) =>
      [...queryKeys.courses.detail(courseId), 'students'] as const,
    student: (courseId: string, studentId: string) =>
      [...queryKeys.courses.detail(courseId), 'student', studentId] as const,
  },

  // Schools
  schools: {
    all: () => ['schools'] as const,
  },

  // Inbounds
  inbounds: {
    all: () => ['inbounds'] as const,
    detail: (id: string) => [...queryKeys.inbounds.all(), id] as const,
    byHandle: (handle: string) =>
      [...queryKeys.inbounds.all(), 'handle', handle] as const,
  },

  // Outbounds
  outbounds: {
    all: () => ['outbounds'] as const,
    detail: (id: string) => [...queryKeys.outbounds.all(), id] as const,
  },

  // Items (generic)
  items: {
    all: () => ['items'] as const,
    public: () => [...queryKeys.items.all(), 'public'] as const,
    bySpace: (spaceId: string) =>
      [...queryKeys.items.all(), 'space', spaceId] as const,
    search: (opts: ISearchOpts) =>
      [...queryKeys.items.all(), 'search', opts] as const,
  },

  // Agent Spaces
  agentSpaces: {
    all: () => ['agentSpaces'] as const,
    lists: () => [...queryKeys.agentSpaces.all(), 'list'] as const,
    details: () => [...queryKeys.agentSpaces.all(), 'detail'] as const,
    detail: (id: string) => [...queryKeys.agentSpaces.details(), id] as const,
    public: () => [...queryKeys.agentSpaces.all(), 'public'] as const,
  },

  // Layout
  layout: {
    byAccount: (accountHandle: string, spaceHandle?: string) =>
      spaceHandle
        ? (['layout', accountHandle, spaceHandle] as const)
        : (['layout', accountHandle] as const),
  },

  // Usages
  usages: {
    user: () => ['usages', 'user'] as const,
    userById: (userId: string) => ['usages', 'user', userId] as const,
    platform: () => ['usages', 'platform'] as const,
  },

  // Prices
  prices: {
    stripe: () => ['prices', 'stripe'] as const,
  },

  // Growth
  growth: {
    kpi: () => ['growth', 'kpi'] as const,
  },

  // OAuth2
  oauth2: {
    authorizationUrl: (queryArgs: Record<string, string>) =>
      ['oauth2', 'authz', 'url', queryArgs] as const,
    authorizationLinkUrl: (queryArgs: Record<string, string>) =>
      ['oauth2', 'authz', 'url', 'link', queryArgs] as const,
  },
} as const;

// ============================================================================
// Main Hook
// ============================================================================

/**
 * TanStack Query-based cache hook for Datalayer API
 *
 * This hook provides React Query-based data fetching and mutations for all
 * Datalayer entities. Unlike the original useCache hook, this returns hook
 * factories that components can use directly.
 *
 * @param options - Configuration options
 * @param options.loginRoute - Route to redirect to on authentication failure (default: '/login')
 *
 * @returns Object containing all query and mutation hook factories
 */
export const useCache = ({ loginRoute = '/login' }: CacheProps = {}) => {
  const coreStore = useCoreStore();
  const { configuration } = coreStore;
  const { user } = useIAMStore();
  const queryClient = useQueryClient();
  const { requestDatalayer } = useDatalayer({ loginRoute });
  const { checkIsOrganizationMember } = useAuthorization();

  // Hook for notebook upload/creation
  const {
    isLoading: notebookUploadLoading,
    uploadAndSubmit: uploadNotebook,
    progress: notebookUploadProgress,
    reset: resetNotebookUpload,
  } = useUploadForm(
    `${coreStore.configuration.spacerRunUrl}/api/spacer/v1/notebooks`,
  );

  // Hook for document upload/creation
  const {
    isLoading: documentUploadLoading,
    uploadAndSubmit: uploadDocument,
    progress: documentUploadProgress,
    reset: resetDocumentUpload,
  } = useUploadForm(
    `${coreStore.configuration.spacerRunUrl}/api/spacer/v1/lexicals`,
  );

  // ============================================================================
  // Transformation Functions (kept from original useCache)
  // Note: These functions use 'any' because they handle dynamic API responses
  // ============================================================================
  /* eslint-disable @typescript-eslint/no-explicit-any */

  const toUser = (u: any): IUser | undefined => {
    if (u) {
      return asUser(u);
    }
  };

  const toOrganization = (org: any): IOrganization => {
    return asOrganization(org);
  };

  const toSpace = (spc: any): IAnySpace => {
    return asSpace(spc);
  };

  const toPage = (s: any): IPage | undefined => {
    if (s) {
      return asPage(s);
    }
  };

  const toDatasource = (s: any): IDatasource | undefined => {
    if (s) {
      return asDatasource(s);
    }
  };

  const toSecret = (s: any): ISecret | undefined => {
    if (s) {
      return asSecret(s);
    }
  };

  const toToken = (s: any): IIAMToken | undefined => {
    if (s) {
      return asToken(s);
    }
  };

  const toContact = (c: any): IContact | undefined => {
    if (c) {
      return asContact(c);
    }
  };

  const toTeam = (org: unknown, organizationId: string): ITeam => {
    return asTeam(org, organizationId);
  };

  // Kept for potential future use

  // Kept for potential future use

  const toDataset = (raw_dataset: any): IDataset => {
    const owner = newUserMock();
    return {
      id: raw_dataset.uid,
      type: 'dataset',
      name: raw_dataset.name_t,
      description: raw_dataset.description_t,
      fileName: raw_dataset.file_name_s,
      datasetExtension: raw_dataset.dataset_extension_s,
      contentLength: raw_dataset.content_length_i,
      contentType: raw_dataset.content_type_s,
      mimeType: raw_dataset.mimetype_s,
      path: raw_dataset.s3_path_s,
      cdnUrl: raw_dataset.cdn_url_s,
      creationDate: new Date(raw_dataset.creation_ts_dt),
      public: raw_dataset.public_b ?? false,
      lastPublicationDate: raw_dataset.creation_ts_dt
        ? new Date(raw_dataset.creation_ts_dt)
        : undefined,
      owner,
      space: {
        handle: raw_dataset.handle_s,
      },
      organization: {
        handle: raw_dataset.handle_s,
      },
    };
  };

  const toCell = (cl: any): ICell => {
    const owner = newUserMock();
    return {
      id: cl.uid,
      type: 'cell',
      name: cl.name_t,
      description: cl.description_t,
      source: cl.source_t,
      creationDate: new Date(cl.creation_ts_dt),
      public: cl.public_b ?? false,
      lastPublicationDate: cl.last_publication_ts_dt
        ? new Date(cl.last_publication_ts_dt)
        : undefined,
      outputshotUrl: cl.outputshot_url_s || '',
      outputshotData: OUTPUTSHOT_PLACEHOLDER_DEFAULT_SVG,
      owner,
      space: {
        handle: cl.handle_s,
      },
      organization: {
        handle: cl.handle_s,
      },
    };
  };

  const toNotebook = (raw_notebook: any): INotebook => {
    const owner = newUserMock();
    return {
      id: raw_notebook.uid,
      type: 'notebook',
      name: raw_notebook.name_t,
      description: raw_notebook.description_t,
      nbformat: raw_notebook.model_s
        ? JSON.parse(raw_notebook.model_s)
        : undefined,
      public: raw_notebook.public_b ?? false,
      creationDate: new Date(raw_notebook.creation_ts_dt),
      lastUpdateDate: raw_notebook.last_update_ts_dt
        ? new Date(raw_notebook.last_update_ts_dt)
        : undefined,
      lastPublicationDate: raw_notebook.creation_ts_dt
        ? new Date(raw_notebook.creation_ts_dt)
        : undefined,
      datasets: [],
      owner,
      space: {
        handle: raw_notebook.handle_s,
      },
      organization: {
        handle: raw_notebook.handle_s,
      },
    };
  };

  const toDocument = (doc: any): IDocument => {
    const owner = newUserMock();
    return {
      id: doc.uid,
      type: 'document',
      name: doc.name_t,
      description: doc.description_t,
      model: doc.model_s ? JSON.parse(doc.model_s) : undefined,
      public: doc.public_b ?? false,
      creationDate: new Date(doc.creation_ts_dt),
      lastUpdateDate: doc.last_update_ts_dt
        ? new Date(doc.last_update_ts_dt)
        : undefined,
      lastPublicationDate: doc.creation_ts_dt
        ? new Date(doc.creation_ts_dt)
        : undefined,
      owner,
      space: {
        handle: doc.handle_s,
      },
      organization: {
        handle: doc.handle_s,
      },
    };
  };

  const toLesson = (raw_lesson: any): ILesson => {
    const owner = newUserMock();
    return {
      id: raw_lesson.uid,
      type: 'lesson',
      name: raw_lesson.name_t,
      description: raw_lesson.description_t,
      nbformat: raw_lesson.model_s ? JSON.parse(raw_lesson.model_s) : undefined,
      public: raw_lesson.public_b ?? false,
      creationDate: new Date(raw_lesson.creation_ts_dt),
      lastUpdateDate: raw_lesson.last_update_ts_dt
        ? new Date(raw_lesson.last_update_ts_dt)
        : undefined,
      lastPublicationDate: raw_lesson.creation_ts_dt
        ? new Date(raw_lesson.creation_ts_dt)
        : undefined,
      owner,
      space: {
        handle: raw_lesson.handle_s,
      },
      organization: {
        handle: raw_lesson.handle_s,
      },
      datasets: [],
    };
  };

  const toExercise = (ex: any): IExercise => {
    const owner = newUserMock();
    return {
      id: ex.uid,
      type: 'exercise',
      name: ex.name_t,
      description: ex.description_t,
      help: ex.help_t,
      codePre: ex.code_pre_t,
      codeQuestion: ex.code_question_t,
      codeSolution: ex.code_solution_t,
      codeTest: ex.code_test_t,
      public: ex.public_b ?? false,
      creationDate: new Date(ex.creation_ts_dt),
      lastUpdateDate: ex.last_update_ts_dt
        ? new Date(ex.last_update_ts_dt)
        : undefined,
      lastPublicationDate: ex.creation_ts_dt
        ? new Date(ex.creation_ts_dt)
        : undefined,
      owner,
      space: {
        handle: ex.handle_s,
      },
      organization: {
        handle: ex.handle_s,
      },
      datasets: [],
    };
  };

  const toAssignment = (raw_assignment: any): IAssignment => {
    const owner = newUserMock();
    let studentItem: IStudentItem | undefined = undefined;
    if (raw_assignment.student_items) {
      raw_assignment.student_items.forEach((student_item: any) => {
        studentItem = {
          id: student_item.uid,
          type: 'student_item',
          itemId: student_item.item_uid,
          itemType: student_item.item_type_s,
          nbgrades: student_item.nbgrades,
          nbgradesTotalPoints: student_item.nbgrades_total_points_f,
          nbgradesTotalScore: student_item.nbgrades_total_score_f,
        };
      });
    }
    return {
      id: raw_assignment.uid,
      type: 'assignment',
      name: raw_assignment.name_t,
      description: raw_assignment.description_t,
      nbformat: raw_assignment.model_s
        ? JSON.parse(raw_assignment.model_s)
        : undefined,
      public: raw_assignment.public_b ?? false,
      creationDate: new Date(raw_assignment.creation_ts_dt),
      lastUpdateDate: raw_assignment.last_update_ts_dt
        ? new Date(raw_assignment.last_update_ts_dt)
        : undefined,
      lastPublicationDate: raw_assignment.creation_ts_dt
        ? new Date(raw_assignment.creation_ts_dt)
        : undefined,
      studentItem,
      datasets: [],
      owner,
      space: {
        handle: raw_assignment.handle_s,
      },
      organization: {
        handle: raw_assignment.handle_s,
      },
    };
  };

  const toEnvironment = (env: any): IEnvironment => {
    const owner = newUserMock();
    return {
      id: env.uid,
      type: 'environment',
      name: env.name_t,
      description: env.description_t,
      creationDate: new Date(env.creation_ts_dt),
      public: env.public_b ?? false,
      lastPublicationDate: env.creation_ts_dt
        ? new Date(env.creation_ts_dt)
        : undefined,
      owner,
      space: {
        handle: env.handle_s,
      },
      organization: {
        handle: env.handle_s,
      },
    };
  };

  const toItem = (item: any): any => {
    if (!item.type_s) {
      console.error('No type_s found on item', item);
      return {};
    }
    switch (item.type_s) {
      case 'assignment':
        return toAssignment(item);
      case 'cell':
        return toCell(item);
      case 'dataset':
        return toDataset(item);
      case 'document':
        return toDocument(item);
      case 'exercise':
        return toExercise(item);
      case 'lesson':
        return toLesson(item);
      case 'notebook':
        return toNotebook(item);
      case 'page':
        return toPage(item);
      default:
        return {};
    }
  };

  const toCourse = (raw_course: any): ICourse => {
    const owner = newUserMock();
    let instructor: IUser | undefined = undefined;
    if (raw_course.members) {
      let raw_instructor = raw_course.members;
      if (Array.isArray(raw_instructor)) {
        raw_instructor = raw_instructor[0];
      }
      instructor = {
        id: raw_instructor.uid,
        handle: raw_instructor.handle_s,
        email: raw_instructor.email_s,
        firstName: raw_instructor.first_name_t,
        lastName: raw_instructor.last_name_t,
        initials: namesAsInitials(
          raw_instructor.to_first_name_t,
          raw_instructor.to_last_name_t,
        ),
        displayName: asDisplayName(
          raw_instructor.first_name_t,
          raw_instructor.last_name_t,
        ),
        roles: [],
        iamProviders: [],
        setRoles: (_roles: string[]) => {},
        unsubscribedFromOutbounds: false,
        onboarding: BOOTSTRAP_USER_ONBOARDING,
        linkedContactId: undefined,
        events: [],
        settings: {},
      };
    }

    let students: Map<string, IUser> | undefined = undefined;
    if (raw_course.students) {
      students = new Map<string, IUser>();
      raw_course.students.forEach((raw_stud: any) => {
        const student = toUser(raw_stud);
        if (student && students) {
          students.set(student.id, student);
        }
      });
    }

    let itemIds = new Array<string>();
    let raw_item_uids: string = raw_course.item_uids_s;
    if (raw_item_uids && raw_item_uids !== '()') {
      raw_item_uids = raw_item_uids.replace('(', '').replace(')', '');
      itemIds = raw_item_uids.split(' ');
    }

    const items = new Array<ISpaceItem>();
    if (raw_course.items) {
      raw_course.items.forEach((item: any) => {
        const i = toItem(item);
        items.push(i);
      });
    }

    return {
      id: raw_course.uid,
      handle: raw_course.handle_s,
      type: 'space',
      variant: 'course',
      name: raw_course.name_t,
      description: raw_course.description_t,
      creationDate: new Date(raw_course.creation_ts_dt),
      public: raw_course.public_b ?? false,
      items,
      itemIds,
      instructor,
      students,
      owner,
    };
  };

  /* eslint-enable @typescript-eslint/no-explicit-any */

  // ============================================================================
  // Authentication & Profile Hooks
  // ============================================================================

  /**
   * Login mutation
   * @example
   * ```tsx
   * const login = useLogin();
   * login.mutate({ handle: 'user', password: 'pass' });
   * ```
   */
  const useLogin = () => {
    const iamStore = useIAMStore();
    return useMutation({
      mutationFn: async ({
        handle,
        password,
      }: {
        handle: string;
        password: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/login`,
          method: 'POST',
          body: { handle, password },
        });
      },
      onSuccess: async resp => {
        // Set the token in IAM state
        if (resp.token) {
          await iamStore.refreshUserByToken(resp.token);
        }
        // Invalidate all queries on successful login
        queryClient.invalidateQueries();
      },
    });
  };

  /**
   * Logout mutation
   * @example
   * ```tsx
   * const logout = useLogout();
   * logout.mutate();
   * ```
   */
  const useLogout = () => {
    return useMutation({
      mutationFn: async () => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/logout`,
          method: 'GET',
        });
      },
      onSuccess: () => {
        // Clear all queries on logout
        queryClient.clear();
      },
    });
  };

  /**
   * Get current user profile
   * @example
   * ```tsx
   * const { data: user, isPending } = useMe();
   * ```
   */
  const useMe = (token?: string) => {
    return useQuery({
      queryKey: queryKeys.auth.me(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/me`,
          method: 'GET',
          token,
        });
        if (resp.me) {
          return toUser(resp.me);
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Update current user profile
   */
  const useUpdateMe = () => {
    return useMutation({
      mutationFn: async ({
        email,
        firstName,
        lastName,
      }: {
        email: string;
        firstName: string;
        lastName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/me`,
          method: 'PUT',
          body: { email, firstName, lastName },
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      },
    });
  };

  /**
   * Whoami query
   */
  const useWhoami = () => {
    return useQuery({
      queryKey: queryKeys.auth.whoami(),
      queryFn: async () => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/whoami`,
          method: 'GET',
        });
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  // ============================================================================
  // User Hooks
  // ============================================================================

  /**
   * Get user by ID
   * @param userId - User ID
   * @example
   * ```tsx
   * const { data: user, isPending, isError } = useUser('user-123');
   * ```
   */
  const useUser = (userId: string) => {
    return useQuery({
      queryKey: queryKeys.users.detail(userId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}`,
          method: 'GET',
        });
        if (resp.success && resp.user) {
          const user = toUser(resp.user);
          // Also populate handle cache if available
          if (user) {
            queryClient.setQueryData(
              queryKeys.users.byHandle(user.handle),
              user,
            );
          }
          return user;
        }
        throw new Error(resp.message || 'Failed to fetch user');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!userId,
    });
  };

  /**
   * Get user by handle
   * @param handle - User handle
   */
  const useUserByHandle = (handle: string) => {
    return useQuery({
      queryKey: queryKeys.users.byHandle(handle),
      queryFn: async () => {
        // Implementation depends on your API
        // For now, using search as workaround
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/search`,
          method: 'POST',
          body: { namingPattern: handle },
        });
        if (resp.success && resp.users) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const users = resp.users.map((u: any) => toUser(u));
          const user = users.find((u: IUser) => u.handle === handle);
          if (user) {
            // Populate ID cache
            queryClient.setQueryData(queryKeys.users.detail(user.id), user);
          }
          return user;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!handle,
    });
  };

  /**
   * Search users by naming pattern
   */
  const useSearchUsers = (namingPattern: string) => {
    return useQuery({
      queryKey: queryKeys.users.search(namingPattern),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/search`,
          method: 'POST',
          body: { namingPattern },
        });
        if (resp.success && resp.users) {
          const users = resp.users.map((u: unknown) => {
            const user = toUser(u);
            // Pre-populate individual caches
            if (user) {
              queryClient.setQueryData(queryKeys.users.detail(user.id), user);
              queryClient.setQueryData(
                queryKeys.users.byHandle(user.handle),
                user,
              );
            }
            return user;
          });
          return users.filter(Boolean) as IUser[];
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: namingPattern !== undefined && namingPattern !== null,
    });
  };

  /**
   * Update user onboarding
   */
  const useUpdateUserOnboarding = () => {
    return useMutation({
      mutationFn: async (onboarding: IUserOnboarding) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/onboardings`,
          method: 'PUT',
          body: { onboarding },
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      },
    });
  };

  /**
   * Update user settings
   */
  const useUpdateUserSettings = () => {
    return useMutation({
      mutationFn: async ({
        userId,
        settings,
      }: {
        userId: string;
        settings: IUserSettings;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/settings`,
          method: 'PUT',
          body: {
            aiagents_url_s: settings.aiAgentsUrl,
            can_invite_b: settings.canInvite || false,
          },
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(variables.userId),
        });
      },
    });
  };

  // ============================================================================
  // Organization Hooks
  // ============================================================================

  /**
   * Get organization by ID
   */
  const useOrganization = (organizationId: string) => {
    return useQuery({
      queryKey: queryKeys.organizations.detail(organizationId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}`,
          method: 'GET',
        });
        if (resp.success && resp.organization) {
          const org = toOrganization(resp.organization);
          // Also populate handle cache
          queryClient.setQueryData(
            queryKeys.organizations.byHandle(org.handle),
            org,
          );
          return org;
        }
        throw new Error(resp.message || 'Failed to fetch organization');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!organizationId && !!user,
    });
  };

  /**
   * Get organization by handle
   */
  const useOrganizationByHandle = (handle: string) => {
    return useQuery({
      queryKey: queryKeys.organizations.byHandle(handle),
      queryFn: async () => {
        // Fetch via account endpoint
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/accounts/${handle}`,
          method: 'GET',
        });
        if (resp.success && resp.organization) {
          const org = toOrganization(resp.organization);
          // Populate ID cache
          queryClient.setQueryData(queryKeys.organizations.detail(org.id), org);
          return org;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!handle,
    });
  };

  /**
   * Get user's organizations
   */
  const useUserOrganizations = () => {
    return useQuery({
      queryKey: queryKeys.organizations.userOrgs(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations`,
          method: 'GET',
        });
        if (resp.success && resp.organizations) {
          const orgs = resp.organizations.map((org: any) => {
            const organization = toOrganization(org);
            // Pre-populate caches
            queryClient.setQueryData(
              queryKeys.organizations.detail(organization.id),
              organization,
            );
            queryClient.setQueryData(
              queryKeys.organizations.byHandle(organization.handle),
              organization,
            );
            return organization;
          });
          return orgs.filter((org: IAnyOrganization) =>
            user ? checkIsOrganizationMember(user, org) : false,
          );
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!user,
    });
  };

  /**
   * Create organization
   */
  const useCreateOrganization = () => {
    return useMutation({
      mutationFn: async (organization: Partial<IOrganization>) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations`,
          method: 'POST',
          body: {
            handle: organization.handle,
            name: organization.name,
            description: organization.description,
          },
        });
      },
      onSuccess: resp => {
        if (resp.organization) {
          const org = toOrganization(resp.organization);
          // Set detail cache
          queryClient.setQueryData(queryKeys.organizations.detail(org.id), org);
          // Invalidate all organization queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.organizations.all(),
          });
        }
      },
    });
  };

  /**
   * Update organization with optimistic update
   */
  const useUpdateOrganization = () => {
    return useMutation({
      mutationFn: async (organization: Partial<IAnyOrganization>) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organization.id}`,
          method: 'PUT',
          body: {
            name: organization.name,
            description: organization.description,
          },
        });
      },
      onSuccess: (_, organization) => {
        const orgId = organization.id ?? '';
        // Invalidate detail cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(orgId),
        });
        // Invalidate all organization queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.all(),
        });
      },
    });
  };

  // ============================================================================
  // Team Hooks
  // ============================================================================

  /**
   * Get team by ID
   */
  const useTeam = (teamId: string, organizationId: string) => {
    return useQuery({
      queryKey: queryKeys.teams.detail(teamId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}`,
          method: 'GET',
        });
        if (resp.success && resp.team) {
          const team = toTeam(resp.team, organizationId);
          queryClient.setQueryData(queryKeys.teams.byHandle(team.handle), team);
          return team;
        }
        throw new Error(resp.message || 'Failed to fetch team');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!teamId && !!organizationId,
    });
  };

  /**
   * Get teams by organization
   */
  const useTeamsByOrganization = (organizationId: string) => {
    return useQuery({
      queryKey: queryKeys.teams.byOrganization(organizationId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/teams`,
          method: 'GET',
        });
        if (resp.success && resp.teams) {
          const teams = resp.teams.map((t: unknown) => {
            const team = toTeam(t, organizationId);
            // Pre-populate caches
            queryClient.setQueryData(queryKeys.teams.detail(team.id), team);
            queryClient.setQueryData(
              queryKeys.teams.byHandle(team.handle),
              team,
            );
            return team;
          });
          return teams;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!organizationId,
    });
  };

  /**
   * Create team
   */
  const useCreateTeam = () => {
    return useMutation({
      mutationFn: async ({
        team,
        organization,
      }: {
        team: Partial<ITeam>;
        organization: IAnyOrganization;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams`,
          method: 'POST',
          body: {
            handle: team.handle,
            name: team.name,
            description: team.description,
            organizationId: organization.id,
          },
        });
      },
      onSuccess: (resp, _variables) => {
        if (resp.team) {
          const team = toTeam(resp.team, _variables.organization.id);
          // Set detail cache
          queryClient.setQueryData(queryKeys.teams.detail(team.id), team);
          // Invalidate all team queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.teams.all(),
          });
        }
      },
    });
  };

  /**
   * Update team
   */
  const useUpdateTeam = () => {
    return useMutation({
      mutationFn: async (team: Partial<ITeam>) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${team.id}`,
          method: 'PUT',
          body: {
            name: team.name,
            description: team.description,
          },
        });
      },
      onSuccess: (_, team) => {
        // Invalidate detail cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.detail(team.id ?? ''),
        });
        // Invalidate all team queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.all(),
        });
      },
    });
  };

  // ============================================================================
  // Space Hooks
  // ============================================================================

  /**
   * Get space by ID
   */
  const useSpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.spaces.detail(spaceId),
      queryFn: async () => {
        // Note: This might need organization context
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}`,
          method: 'GET',
        });
        if (resp.success && resp.space) {
          const space = toSpace(resp.space);
          queryClient.setQueryData(
            queryKeys.spaces.byHandle(space.handle),
            space,
          );
          return space;
        }
        throw new Error(resp.message || 'Failed to fetch space');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!spaceId,
    });
  };

  /**
   * Get organization space
   */
  const useOrganizationSpace = (organizationId: string, spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.spaces.detail(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}`,
          method: 'GET',
        });
        if (resp.success && resp.space) {
          return toSpace(resp.space);
        }
        throw new Error(resp.message || 'Failed to fetch space');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!spaceId && !!organizationId,
    });
  };

  /**
   * Get spaces by organization
   */
  const useOrganizationSpaces = (organizationId: string) => {
    return useQuery({
      queryKey: queryKeys.spaces.byOrganization(organizationId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/organizations/${organizationId}`,
          method: 'GET',
        });
        if (resp.success && resp.spaces) {
          const spaces = resp.spaces.map((spc: unknown) => {
            const space = toSpace(spc);
            queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
            return space;
          });
          return spaces;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!organizationId,
    });
  };

  /**
   * Get user spaces
   */
  const useUserSpaces = () => {
    return useQuery({
      queryKey: queryKeys.spaces.userSpaces(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/users/me`,
          method: 'GET',
        });
        if (resp.success && resp.spaces) {
          const spaces = resp.spaces.map((spc: unknown) => {
            const space = toSpace(spc);
            queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
            queryClient.setQueryData(
              queryKeys.spaces.byHandle(space.handle),
              space,
            );
            return space;
          });
          return spaces;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!user,
    });
  };

  /**
   * Create space
   */
  const useCreateSpace = () => {
    return useMutation({
      mutationFn: async ({
        space,
        organization,
      }: {
        space: Partial<IAnySpace>;
        organization?: IAnyOrganization;
      }) => {
        const seedSpaceId =
          space.variant === 'course'
            ? (space as ICourse).seedSpace?.id
            : undefined;
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces`,
          method: 'POST',
          body: {
            name: space.name,
            description: space.description,
            variant: space.variant,
            public: space.public,
            spaceHandle: space.handle,
            organizationId: organization?.id,
            seedSpaceId,
          },
        });
      },
      onSuccess: (resp, _variables) => {
        if (resp.space) {
          const space = toSpace(resp.space);
          // Set detail cache
          queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
          // Invalidate all space queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.spaces.all(),
          });
        }
      },
    });
  };

  /**
   * Update space with optimistic update
   */
  const useUpdateSpace = () => {
    return useMutation({
      mutationFn: async (space: Partial<IAnySpace>) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${space.id}/users/${user?.id}`,
          method: 'PUT',
          body: {
            name: space.name,
            description: space.description,
          },
        });
      },
      onSuccess: (_, space) => {
        const spaceId = space.id ?? '';
        // Invalidate detail cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
        // Invalidate all space queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.all(),
        });
      },
    });
  };

  // ============================================================================
  // Agent Spaces Hooks
  // ============================================================================

  /**
   * Get agent space by ID
   */
  const useAgentSpace = (uid: string | undefined) => {
    return useQuery({
      queryKey: queryKeys.agentSpaces.detail(uid || ''),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/${uid}`,
          method: 'GET',
        });
        if (resp.success && resp.agentSpace) {
          return resp.agentSpace as AgentSpaceData;
        }
        throw new Error(resp.message || 'Failed to fetch agent space');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!uid,
    });
  };

  /**
   * List user's agent spaces
   */
  const useAgentSpaces = () => {
    return useQuery({
      queryKey: queryKeys.agentSpaces.lists(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces`,
          method: 'GET',
        });
        if (resp.success && resp.agentSpaces) {
          const agentSpaces = resp.agentSpaces as AgentSpaceData[];
          // Set detail cache for each agent space
          agentSpaces.forEach((agentSpace: AgentSpaceData) => {
            queryClient.setQueryData(
              queryKeys.agentSpaces.detail(agentSpace.id),
              agentSpace,
            );
          });
          return agentSpaces;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!user,
    });
  };

  /**
   * List public agent spaces (Library)
   */
  const usePublicAgentSpaces = () => {
    return useQuery({
      queryKey: queryKeys.agentSpaces.public(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/public`,
          method: 'GET',
        });
        if (resp.success && resp.agentSpaces) {
          return resp.agentSpaces as AgentSpaceData[];
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Create agent space
   */
  const useCreateAgentSpace = () => {
    return useMutation({
      mutationFn: async (data: CreateAgentSpaceRequest) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces`,
          method: 'POST',
          body: data,
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.agentSpace) {
          const agentSpace = resp.agentSpace as AgentSpaceData;
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.agentSpaces.detail(agentSpace.id),
            agentSpace,
          );
          // Invalidate all agent space queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.all(),
          });
        }
      },
    });
  };

  /**
   * Update agent space
   */
  const useUpdateAgentSpace = () => {
    return useMutation({
      mutationFn: async ({
        uid,
        data,
      }: {
        uid: string;
        data: UpdateAgentSpaceRequest;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/${uid}`,
          method: 'PUT',
          body: data,
        });
      },
      onSuccess: (resp, { uid }) => {
        if (resp.success) {
          // Invalidate detail cache
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.detail(uid),
          });
          // Invalidate all agent space queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.all(),
          });
        }
      },
    });
  };

  /**
   * Delete agent space
   */
  const useDeleteAgentSpace = () => {
    return useMutation({
      mutationFn: async (uid: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/${uid}`,
          method: 'DELETE',
        });
      },
      onSuccess: () => {
        // Invalidate all agent space queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.agentSpaces.all(),
        });
      },
    });
  };

  /**
   * Make agent space public
   */
  const useMakeAgentSpacePublic = () => {
    return useMutation({
      mutationFn: async (uid: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/${uid}/public`,
          method: 'POST',
        });
      },
      onSuccess: (resp, uid) => {
        if (resp.success) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.detail(uid),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.all(),
          });
        }
      },
    });
  };

  /**
   * Make agent space private
   */
  const useMakeAgentSpacePrivate = () => {
    return useMutation({
      mutationFn: async (uid: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/agent-spaces/${uid}/private`,
          method: 'POST',
        });
      },
      onSuccess: (resp, uid) => {
        if (resp.success) {
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.detail(uid),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.agentSpaces.all(),
          });
        }
      },
    });
  };

  /**
   * Refresh agent space data
   */
  const useRefreshAgentSpace = () => {
    return (uid: string) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentSpaces.detail(uid),
      });
    };
  };

  /**
   * Refresh agent spaces list
   */
  const useRefreshAgentSpaces = () => {
    return () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentSpaces.all(),
      });
    };
  };

  /**
   * Refresh public agent spaces list
   */
  const useRefreshPublicAgentSpaces = () => {
    return () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.agentSpaces.public(),
      });
    };
  };

  // ============================================================================
  // Notebook Hooks
  // ============================================================================

  /**
   * Get notebook by ID
   */
  const useNotebook = (notebookId: string) => {
    return useQuery({
      queryKey: queryKeys.notebooks.detail(notebookId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}`,
          method: 'GET',
        });
        if (resp.success && resp.notebook) {
          return toNotebook(resp.notebook);
        }
        throw new Error(resp.message || 'Failed to fetch notebook');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!notebookId,
    });
  };

  /**
   * Get notebooks by space
   */
  const useNotebooksBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.notebooks.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/notebook`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          const notebooks = resp.items.map((n: unknown) => {
            const notebook = toNotebook(n);
            queryClient.setQueryData(
              queryKeys.notebooks.detail(notebook.id),
              notebook,
            );
            return notebook;
          });
          return notebooks;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!spaceId,
    });
  };

  /**
   * Create notebook
   */
  const useCreateNotebook = () => {
    return useMutation({
      mutationFn: async ({
        spaceId,
        name,
        description,
        notebookType = 'notebook',
        file,
      }: {
        spaceId: string;
        name: string;
        description?: string;
        notebookType?: string;
        file?: File;
      }) => {
        const formData = new FormData();
        formData.append('spaceId', spaceId);
        formData.append('notebookType', notebookType);
        formData.append('name', name);
        formData.append('description', description || '');
        if (file) {
          formData.append('file', file);
        }

        const resp = await uploadNotebook(formData);
        return resp;
      },
      onSuccess: (resp, _variables) => {
        if (resp.success && resp.notebook) {
          const notebook = toNotebook(resp.notebook);
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.notebooks.detail(notebook.id),
            notebook,
          );
          // Refetch all notebook queries immediately (including bySpace)
          queryClient.refetchQueries({
            queryKey: queryKeys.notebooks.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  /**
   * Update notebook with optimistic update
   */
  const useUpdateNotebook = () => {
    return useMutation({
      mutationFn: async ({
        id,
        name,
        description,
      }: {
        id: string;
        name: string;
        description: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${id}`,
          method: 'PUT',
          body: { name, description },
        });
      },
      onSuccess: (resp, notebook) => {
        if (resp.success) {
          // Invalidate detail query
          queryClient.invalidateQueries({
            queryKey: queryKeys.notebooks.detail(notebook.id),
          });
          // Invalidate all notebook lists (including bySpace queries)
          queryClient.invalidateQueries({
            queryKey: queryKeys.notebooks.all(),
          });
        }
      },
    });
  };

  /**
   * Update notebook model
   */
  const useUpdateNotebookModel = () => {
    return useMutation({
      mutationFn: async ({
        notebookId,
        nbformat,
      }: {
        notebookId: string;
        nbformat: unknown;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}/model`,
          method: 'PUT',
          body: { nbformat },
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notebooks.detail(variables.notebookId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.notebooks.model(variables.notebookId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.notebooks.all(),
        });
      },
    });
  };

  /**
   * Clone notebook
   */
  const useCloneNotebook = () => {
    return useMutation({
      mutationFn: async (notebookId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.notebook) {
          const notebook = toNotebook(resp.notebook);
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.notebooks.detail(notebook.id),
            notebook,
          );
          // Refetch all notebook queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.notebooks.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  // ============================================================================
  // Document Hooks
  // ============================================================================

  /**
   * Get document by ID
   */
  const useDocument = (documentId: string) => {
    return useQuery({
      queryKey: queryKeys.documents.detail(documentId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${documentId}`,
          method: 'GET',
        });
        if (resp.success && resp.document) {
          return toDocument(resp.document);
        }
        throw new Error(resp.message || 'Failed to fetch document');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!documentId,
    });
  };

  /**
   * Get documents by space
   */
  const useDocumentsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.documents.bySpace(spaceId),
      queryFn: async () => {
        if (!spaceId) {
          return [];
        }
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/document`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          const documents = resp.items.map((d: unknown) => {
            const doc = toDocument(d);
            queryClient.setQueryData(queryKeys.documents.detail(doc.id), doc);
            return doc;
          });
          return documents;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!spaceId,
    });
  };

  /**
   * Update document
   */
  const useUpdateDocument = () => {
    return useMutation({
      mutationFn: async ({
        id,
        name,
        description,
      }: {
        id: string;
        name: string;
        description: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${id}`,
          method: 'PUT',
          body: { name, description },
        });
      },
      onSuccess: (resp, doc) => {
        if (resp.success) {
          // Invalidate detail query
          queryClient.invalidateQueries({
            queryKey: queryKeys.documents.detail(doc.id),
          });
          // Invalidate all document lists (including bySpace queries)
          queryClient.invalidateQueries({
            queryKey: queryKeys.documents.all(),
          });
        }
      },
    });
  };

  /**
   * Update document model
   */
  const useUpdateDocumentModel = () => {
    return useMutation({
      mutationFn: async ({ id, model }: { id: string; model: unknown }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${id}/model`,
          method: 'PUT',
          body: { model },
        });
      },
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.detail(variables.id),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.all(),
        });
      },
    });
  };

  /**
   * Create document
   */
  const useCreateDocument = () => {
    return useMutation({
      mutationFn: async ({
        spaceId,
        name,
        description,
        documentType = 'document',
        file,
      }: {
        spaceId: string;
        name: string;
        description?: string;
        documentType?: string;
        file?: File;
      }) => {
        const formData = new FormData();
        formData.append('spaceId', spaceId);
        formData.append('documentType', documentType);
        formData.append('name', name);
        formData.append('description', description || '');
        if (file) {
          formData.append('file', file);
        }

        const resp = await uploadDocument(formData);
        return resp;
      },
      onSuccess: (resp, _variables) => {
        if (resp.success && resp.document) {
          const document = toDocument(resp.document);
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.documents.detail(document.id),
            document,
          );
          // Refetch all document queries immediately (including bySpace)
          queryClient.refetchQueries({
            queryKey: queryKeys.documents.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  /**
   * Clone document
   */
  const useCloneDocument = () => {
    return useMutation({
      mutationFn: async (documentId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${documentId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.document) {
          const doc = toDocument(resp.document);
          // Set detail cache
          queryClient.setQueryData(queryKeys.documents.detail(doc.id), doc);
          // Refetch all document queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.documents.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  // ============================================================================
  // Page Hooks
  // ============================================================================

  /**
   * Get page by ID
   */
  const usePage = (pageId: string) => {
    return useQuery({
      queryKey: queryKeys.pages.detail(pageId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/pages/${pageId}`,
          method: 'GET',
        });
        if (resp.success && resp.page) {
          return toPage(resp.page);
        }
        throw new Error(resp.message || 'Failed to fetch page');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!pageId,
    });
  };

  /**
   * Get all pages
   */
  const usePages = () => {
    return useQuery({
      queryKey: queryKeys.pages.all(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/pages`,
          method: 'GET',
        });
        if (resp.success && resp.pages) {
          const pages = resp.pages
            .map((p: unknown) => {
              const page = toPage(p);
              if (page) {
                queryClient.setQueryData(queryKeys.pages.detail(page.id), page);
              }
              return page;
            })
            .filter(Boolean);
          return pages;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Create page
   */
  const useCreatePage = () => {
    return useMutation({
      mutationFn: async (page: Omit<IPage, 'id'>) => {
        return requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/pages`,
          method: 'POST',
          body: { ...page },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.page) {
          const page = toPage(resp.page);
          if (page) {
            // Set detail cache
            queryClient.setQueryData(queryKeys.pages.detail(page.id), page);
            // Invalidate list to refetch
            queryClient.invalidateQueries({
              queryKey: queryKeys.pages.all(),
            });
          }
        }
      },
    });
  };

  /**
   * Update page
   */
  const useUpdatePage = () => {
    return useMutation({
      mutationFn: async (
        page: Pick<IPage, 'id' | 'name' | 'description' | 'tags'>,
      ) => {
        return requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/pages/${page.id}`,
          method: 'PUT',
          body: {
            name: page.name,
            description: page.description,
            tags: page.tags,
          },
        });
      },
      onSuccess: (resp, page) => {
        if (resp.success) {
          // Invalidate detail and list queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.pages.detail(page.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.pages.all(),
          });
        }
      },
    });
  };

  /**
   * Delete page
   */
  const useDeletePage = () => {
    return useMutation({
      mutationFn: async (pageId: string) => {
        return requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/pages/${pageId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, pageId) => {
        // Remove from detail cache
        queryClient.removeQueries({ queryKey: queryKeys.pages.detail(pageId) });
        // Invalidate list to refetch
        queryClient.invalidateQueries({
          queryKey: queryKeys.pages.all(),
        });
      },
    });
  };

  // ============================================================================
  // Datasource, Secret, Token Hooks
  // ============================================================================

  /**
   * Get all datasources
   */
  const useDatasources = () => {
    return useQuery({
      queryKey: queryKeys.datasources.all(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/datasources`,
          method: 'GET',
        });
        if (resp.success && resp.datasources) {
          const datasources = resp.datasources
            .map((d: unknown) => {
              const datasource = toDatasource(d);
              if (datasource) {
                queryClient.setQueryData(
                  queryKeys.datasources.detail(datasource.id),
                  datasource,
                );
              }
              return datasource;
            })
            .filter(Boolean);
          return datasources;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Create datasource
   */
  const useCreateDatasource = () => {
    return useMutation({
      mutationFn: async (datasource: Omit<IDatasource, 'id'>) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/datasources`,
          method: 'POST',
          body: { ...datasource },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.datasource) {
          const ds = toDatasource(resp.datasource);
          if (ds) {
            queryClient.setQueryData(queryKeys.datasources.detail(ds.id), ds);
          }
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.datasources.all(),
        });
      },
    });
  };

  /**
   * Get all secrets
   */
  // TODO: Previously this hook pre-populated individual secret caches with setQueryData,
  // but this prevented useSecret from fetching fresh data (e.g., the value field).
  // Consider re-adding cache pre-population if the list endpoint returns full secret data,
  // or use a different query key pattern for partial vs full secret data.
  const useSecrets = () => {
    return useQuery({
      queryKey: queryKeys.secrets.all(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/secrets`,
          method: 'GET',
        });
        if (resp.success && resp.secrets) {
          const secrets = resp.secrets
            .map((s: unknown) => toSecret(s))
            .filter(Boolean);
          return secrets;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      refetchOnMount: true, // Override to refetch when stale after invalidation
    });
  };

  /**
   * Create secret
   */
  const useCreateSecret = () => {
    return useMutation({
      mutationFn: async (secret: Omit<ISecret, 'id'>) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/secrets`,
          method: 'POST',
          body: { ...secret },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.secret) {
          const sec = toSecret(resp.secret);
          if (sec) {
            queryClient.setQueryData(queryKeys.secrets.detail(sec.id), sec);
          }
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.secrets.all() });
      },
    });
  };

  /**
   * Delete secret
   */
  const useDeleteSecret = () => {
    return useMutation({
      mutationFn: async (secretId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secretId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, secretId) => {
        queryClient.removeQueries({
          queryKey: queryKeys.secrets.detail(secretId),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.secrets.all() });
      },
    });
  };

  /**
   * Get all tokens
   */
  const useTokens = () => {
    return useQuery({
      queryKey: queryKeys.tokens.all(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/tokens`,
          method: 'GET',
        });
        if (resp.success && resp.tokens) {
          const tokens = resp.tokens
            .map((t: unknown) => {
              const token = toToken(t);
              if (token) {
                queryClient.setQueryData(
                  queryKeys.tokens.detail(token.id),
                  token,
                );
              }
              return token;
            })
            .filter(Boolean);
          return tokens;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      refetchOnMount: true, // Override to refetch when stale after invalidation
    });
  };

  /**
   * Create token
   */
  const useCreateToken = () => {
    return useMutation({
      mutationFn: async (token: Omit<IIAMToken, 'id' | 'value'>) => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/tokens`,
          method: 'POST',
          body: {
            ...token,
            expirationDate: token.expirationDate.getTime(),
          },
        });
        // Transform the token in the response
        if (resp.success && resp.token) {
          resp.token = toToken(resp.token);
        }
        return resp;
      },
      onSuccess: resp => {
        if (resp.success && resp.token) {
          queryClient.setQueryData(
            queryKeys.tokens.detail(resp.token.id),
            resp.token,
          );
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tokens.all() });
      },
    });
  };

  // ============================================================================
  // Contact Hooks
  // ============================================================================

  /**
   * Get contact by ID
   */
  const useContact = (contactId: string, options?: { enabled?: boolean }) => {
    return useQuery({
      queryKey: queryKeys.contacts.detail(contactId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
          method: 'GET',
        });
        if (resp.success && resp.contact) {
          const contact = toContact(resp.contact);
          if (contact) {
            queryClient.setQueryData(
              queryKeys.contacts.byHandle(contact.handle),
              contact,
            );
          }
          return contact;
        }
        throw new Error(resp.message || 'Failed to fetch contact');
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: options?.enabled ?? !!contactId,
    });
  };

  /**
   * Search contacts
   */
  const useSearchContacts = (query: string) => {
    return useQuery({
      queryKey: queryKeys.contacts.search(query),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/search`,
          method: 'POST',
          body: { query },
        });
        if (resp.success && resp.contacts) {
          const contacts = resp.contacts
            .map((c: unknown) => {
              const contact = toContact(c);
              if (contact) {
                queryClient.setQueryData(
                  queryKeys.contacts.detail(contact.id),
                  contact,
                );
                queryClient.setQueryData(
                  queryKeys.contacts.byHandle(contact.handle),
                  contact,
                );
              }
              return contact;
            })
            .filter(Boolean);
          return contacts;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!query && query.length > 0,
    });
  };

  /**
   * Create contact
   */
  const useCreateContact = () => {
    return useMutation({
      mutationFn: async (contact: IContact) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts`,
          method: 'POST',
          body: { contact },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.contact) {
          const contact = toContact(resp.contact);
          if (contact) {
            // Set detail cache
            queryClient.setQueryData(
              queryKeys.contacts.detail(contact.id),
              contact,
            );
            // Invalidate all contact queries
            queryClient.invalidateQueries({
              queryKey: queryKeys.contacts.all(),
            });
          }
        }
      },
    });
  };

  /**
   * Update contact
   */
  const useUpdateContact = () => {
    return useMutation({
      mutationFn: async ({
        contactId,
        contact,
      }: {
        contactId: string;
        contact: IContact;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
          method: 'PUT',
          body: { contact },
        });
      },
      onSuccess: (_, variables) => {
        // Invalidate detail cache
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.detail(variables.contactId),
        });
        // Invalidate contact list queries (avoid re-fetching deleted detail)
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.lists(),
        });
      },
    });
  };

  /**
   * Delete contact
   */
  const useDeleteContact = () => {
    return useMutation({
      mutationFn: async (contactId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, contactId) => {
        // Remove detail cache
        queryClient.removeQueries({
          queryKey: queryKeys.contacts.detail(contactId),
        });
        // Invalidate all contact queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.all(),
        });
      },
    });
  };

  // ============================================================================
  // Delete Item Hook (generic)
  // ============================================================================

  /**
   * Delete any item (notebook, document, cell, etc.)
   */
  const useDeleteItem = () => {
    return useMutation({
      mutationFn: async (itemId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${itemId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, itemId) => {
        // Remove from all possible item caches
        queryClient.removeQueries({
          queryKey: queryKeys.notebooks.detail(itemId),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.documents.detail(itemId),
        });
        queryClient.removeQueries({ queryKey: queryKeys.cells.detail(itemId) });
        queryClient.removeQueries({
          queryKey: queryKeys.datasets.detail(itemId),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.lessons.detail(itemId),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.exercises.detail(itemId),
        });
        queryClient.removeQueries({
          queryKey: queryKeys.assignments.detail(itemId),
        });

        // Invalidate all artifact type queries
        queryClient.invalidateQueries({ queryKey: queryKeys.notebooks.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.documents.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.cells.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.datasets.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.lessons.all() });
        queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all() });
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.all(),
        });
        // Invalidate space items lists
        queryClient.invalidateQueries({ queryKey: queryKeys.items.all() });
      },
    });
  };

  // ============================================================================
  // Core CRUD Operations - Refresh & Get Methods
  // ============================================================================

  /**
   * Get single datasource by ID
   */
  const useDatasource = (datasourceId: string) => {
    return useQuery({
      queryKey: queryKeys.datasources.detail(datasourceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/datasources/${datasourceId}`,
          method: 'GET',
        });
        if (resp.success && resp.datasource) {
          return toDatasource(resp.datasource);
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!datasourceId,
    });
  };

  /**
   * Update datasource
   */
  const useUpdateDatasource = () => {
    return useMutation({
      mutationFn: async (datasource: IDatasource) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/datasources/${datasource.id}`,
          method: 'PUT',
          body: { ...datasource },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.datasource) {
          const ds = toDatasource(resp.datasource);
          if (ds) {
            queryClient.setQueryData(queryKeys.datasources.detail(ds.id), ds);
          }
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.datasources.all(),
        });
      },
    });
  };

  /**
   * Get single secret by ID
   */
  const useSecret = (
    secretId: string,
    options?: {
      enabled?: boolean;
      refetchOnMount?: boolean | 'always';
      staleTime?: number;
      gcTime?: number;
    },
  ) => {
    return useQuery({
      queryKey: queryKeys.secrets.detail(secretId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secretId}`,
          method: 'GET',
        });
        if (resp.success && resp.secret) {
          return toSecret(resp.secret);
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: options?.enabled ?? !!secretId,
      refetchOnMount:
        options?.refetchOnMount ?? DEFAULT_QUERY_OPTIONS.refetchOnMount,
      staleTime: options?.staleTime ?? DEFAULT_QUERY_OPTIONS.staleTime,
      gcTime: options?.gcTime ?? DEFAULT_QUERY_OPTIONS.gcTime,
    });
  };

  /**
   * Update secret
   */
  const useUpdateSecret = () => {
    return useMutation({
      mutationFn: async (secret: ISecret) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/secrets/${secret.id}`,
          method: 'PUT',
          body: { ...secret },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.secret) {
          const sec = toSecret(resp.secret);
          if (sec) {
            queryClient.setQueryData(queryKeys.secrets.detail(sec.id), sec);
          }
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.secrets.all() });
      },
    });
  };

  /**
   * Get single token by ID
   */
  const useToken = (tokenId: string) => {
    return useQuery({
      queryKey: queryKeys.tokens.detail(tokenId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/tokens/${tokenId}`,
          method: 'GET',
        });
        if (resp.success && resp.token) {
          return toToken(resp.token);
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!tokenId,
    });
  };

  /**
   * Update token
   */
  const useUpdateToken = () => {
    return useMutation({
      mutationFn: async (token: IIAMToken) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/tokens/${token.id}`,
          method: 'PUT',
          body: { ...token },
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.token) {
          const tok = toToken(resp.token);
          if (tok) {
            queryClient.setQueryData(queryKeys.tokens.detail(tok.id), tok);
          }
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.tokens.all() });
      },
    });
  };

  /**
   * Get contact by handle
   */
  const useContactByHandle = (handle: string) => {
    return useQuery({
      queryKey: queryKeys.contacts.byHandle(handle),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/handle/${handle}`,
          method: 'GET',
        });
        if (resp.success && resp.contact) {
          const contact = toContact(resp.contact);
          if (contact) {
            queryClient.setQueryData(
              queryKeys.contacts.detail(contact.id),
              contact,
            );
          }
          return contact;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!handle,
    });
  };

  /**
   * Get team by handle
   */
  const useTeamByHandle = (handle: string) => {
    return useQuery({
      queryKey: queryKeys.teams.byHandle(handle),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/handle/${handle}`,
          method: 'GET',
        });
        if (resp.success && resp.team) {
          const team = toTeam(resp.team, resp.team.organization?.id || '');
          if (team) {
            queryClient.setQueryData(queryKeys.teams.detail(team.id), team);
          }
          return team;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!handle,
    });
  };

  /**
   * Get organization space by handle
   */
  const useOrganizationSpaceByHandle = (
    organizationId: string,
    handle: string,
  ) => {
    return useQuery({
      queryKey: queryKeys.spaces.orgSpaceByHandle(organizationId, handle),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/organizations/${organizationId}/spaces/handle/${handle}`,
          method: 'GET',
        });
        if (resp.success && resp.space) {
          const space = toSpace(resp.space);
          if (space) {
            queryClient.setQueryData(queryKeys.spaces.detail(space.id), space);
          }
          return space;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!organizationId && !!handle,
    });
  };

  /**
   * Get user space (personal space)
   */
  const useUserSpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.spaces.detail(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}`,
          method: 'GET',
        });
        if (resp.success && resp.space) {
          return toSpace(resp.space);
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!spaceId,
    });
  };

  /**
   * Get user space by handle (personal space)
   * This reads from the cache populated by useUserSpaces()
   */
  const useUserSpaceByHandle = (handle: string) => {
    return useQuery({
      queryKey: queryKeys.spaces.byHandle(handle),
      queryFn: async () => {
        // First check if we have it in the cache from useUserSpaces()
        const cached = queryClient.getQueryData(
          queryKeys.spaces.byHandle(handle),
        );
        if (cached) {
          return cached;
        }

        // If not in cache, fetch all user spaces which will populate it
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/users/me`,
          method: 'GET',
        });

        if (resp.success && resp.spaces) {
          let targetSpace: IAnySpace | null = null;
          resp.spaces.forEach((spc: unknown) => {
            const space = toSpace(spc);
            if (space) {
              queryClient.setQueryData(
                queryKeys.spaces.detail(space.id),
                space,
              );
              queryClient.setQueryData(
                queryKeys.spaces.byHandle(space.handle),
                space,
              );
              if (space.handle === handle) {
                targetSpace = space;
              }
            }
          });
          return targetSpace;
        }
        return null;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!handle && !!user,
    });
  };

  /**
   * Update organization space
   */
  const useUpdateOrganizationSpace = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        spaceId,
        updates,
      }: {
        organizationId: string;
        spaceId: string;
        updates: Partial<IAnySpace>;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/organizations/${organizationId}/spaces/${spaceId}`,
          method: 'PUT',
          body: updates,
        });
      },
      onSuccess: (_, { spaceId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.all(),
        });
      },
    });
  };

  // ============================================================================
  // Member Management & User Extensions
  // ============================================================================

  /**
   * Refresh user data by ID (re-fetch from API)
   */
  const useRefreshUser = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, userId) => {
        if (resp.success && resp.user) {
          const user = toUser(resp.user);
          if (user) {
            queryClient.setQueryData(queryKeys.users.detail(userId), user);
            if (user.handle) {
              queryClient.setQueryData(
                queryKeys.users.byHandle(user.handle),
                user,
              );
            }
          }
        }
        queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
      },
    });
  };

  /**
   * Get user credits
   */
  const useUserCredits = (userId: string) => {
    return useQuery({
      queryKey: [...queryKeys.users.detail(userId), 'credits'] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits/users/${userId}`,
          method: 'GET',
        });
        if (resp.success) {
          return resp.credits || 0;
        }
        return 0;
      },
      ...DEFAULT_QUERY_OPTIONS,
      enabled: !!userId,
    });
  };

  /**
   * Update user credits
   */
  const useUpdateUserCredits = () => {
    return useMutation({
      mutationFn: async ({
        userId,
        credits,
        brand,
      }: {
        userId: string;
        credits: number;
        brand?: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits/users/${userId}`,
          method: 'PUT',
          body: { credits, brand },
        });
      },
      onSuccess: (_, { userId }) => {
        queryClient.invalidateQueries({
          queryKey: [...queryKeys.users.detail(userId), 'credits'],
        });
      },
    });
  };

  /**
   * Add member to organization
   */
  const useAddMemberToOrganization = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        userId,
      }: {
        organizationId: string;
        userId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(organizationId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(organizationId),
        });
      },
    });
  };

  /**
   * Remove member from organization
   */
  const useRemoveMemberFromOrganization = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        userId,
      }: {
        organizationId: string;
        userId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(organizationId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.detail(organizationId),
        });
      },
    });
  };

  /**
   * Add role to organization member
   */
  const useAddRoleToOrganizationMember = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        userId,
        roleName,
      }: {
        organizationId: string;
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}/roles/${roleName}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(organizationId),
        });
      },
    });
  };

  /**
   * Remove role from organization member
   */
  const useRemoveRoleFromOrganizationMember = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        userId,
        roleName,
      }: {
        organizationId: string;
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/members/${userId}/roles/${roleName}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { organizationId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.members(organizationId),
        });
      },
    });
  };

  /**
   * Add member to team
   */
  const useAddMemberToTeam = () => {
    return useMutation({
      mutationFn: async ({
        teamId,
        userId,
      }: {
        teamId: string;
        userId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { teamId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.detail(teamId),
        });
      },
    });
  };

  /**
   * Remove member from team
   */
  const useRemoveMemberFromTeam = () => {
    return useMutation({
      mutationFn: async ({
        teamId,
        userId,
      }: {
        teamId: string;
        userId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { teamId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.detail(teamId),
        });
      },
    });
  };

  /**
   * Add role to team member
   */
  const useAddRoleToTeamMember = () => {
    return useMutation({
      mutationFn: async ({
        teamId,
        userId,
        roleName,
      }: {
        teamId: string;
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}/roles/${roleName}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { teamId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
        });
      },
    });
  };

  /**
   * Remove role from team member
   */
  const useRemoveRoleFromTeamMember = () => {
    return useMutation({
      mutationFn: async ({
        teamId,
        userId,
        roleName,
      }: {
        teamId: string;
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}/members/${userId}/roles/${roleName}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { teamId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.members(teamId),
        });
      },
    });
  };

  /**
   * Add member to organization space
   */
  const useAddMemberToOrganizationSpace = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        spaceId,
        accountId,
      }: {
        organizationId: string;
        spaceId: string;
        accountId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}/members/${accountId}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { spaceId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.members(spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
      },
    });
  };

  /**
   * Remove member from organization space
   */
  const useRemoveMemberFromOrganizationSpace = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        spaceId,
        accountId,
      }: {
        organizationId: string;
        spaceId: string;
        accountId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/organizations/${organizationId}/members/${accountId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { spaceId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.members(spaceId),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
      },
    });
  };

  /**
   * Make space public
   */
  const useMakeSpacePublic = () => {
    return useMutation({
      mutationFn: async (spaceId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/public`,
          method: 'PUT',
        });
      },
      onSuccess: (_, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
      },
    });
  };

  /**
   * Make space private
   */
  const useMakeSpacePrivate = () => {
    return useMutation({
      mutationFn: async (spaceId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/private`,
          method: 'PUT',
        });
      },
      onSuccess: (_, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(spaceId),
        });
      },
    });
  };

  // ============================================================================
  // Authentication, Roles, Schools, and Refresh Methods
  // ============================================================================

  /**
   * Change user password
   */
  const useChangePassword = () => {
    return useMutation({
      mutationFn: async ({
        handle,
        password,
        passwordConfirm,
      }: {
        handle: string;
        password: string;
        passwordConfirm: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/password`,
          method: 'PUT',
          body: { handle, password, passwordConfirm },
        });
      },
    });
  };

  /**
   * Request email update
   */
  const useRequestEmailUpdate = () => {
    return useMutation({
      mutationFn: async (email: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/me/email`,
          method: 'PUT',
          body: { email },
        });
      },
    });
  };

  /**
   * Confirm email update with token
   */
  const useConfirmEmailUpdate = () => {
    return useMutation({
      mutationFn: async (token: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/me/email`,
          method: 'POST',
          body: { token },
        });
      },
      onSuccess: () => {
        // Invalidate current user cache
        queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      },
    });
  };

  /**
   * Assign role to user
   */
  const useAssignRoleToUser = () => {
    return useMutation({
      mutationFn: async ({
        userId,
        roleName,
      }: {
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/roles/${roleName}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { userId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(userId),
        });
      },
    });
  };

  /**
   * Unassign role from user
   */
  const useUnassignRoleFromUser = () => {
    return useMutation({
      mutationFn: async ({
        userId,
        roleName,
      }: {
        userId: string;
        roleName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/users/${userId}/roles/${roleName}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { userId }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.users.detail(userId),
        });
      },
    });
  };

  /**
   * Get all schools
   */
  const useSchools = () => {
    return useQuery({
      queryKey: ['schools'] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/schools`,
          method: 'GET',
        });
        if (resp.success && resp.orgs) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const schools: ISchool[] = resp.orgs.map((s: any) => ({
            id: s.uid,
            type: 'school' as const,
            handle: s.handle_s,
            name: s.name_t,
            description: s.description_t,
            dean: undefined,
            members: [] as IOrganizationMember[],
            students: [],
            courses: [],
            public: s.public_b,
            creationDate: new Date(s.creation_ts_dt),
            setMembers(members: IOrganizationMember[]) {
              this.members = members;
            },
          }));
          return schools;
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Refresh organization data
   */
  const useRefreshOrganization = () => {
    return useMutation({
      mutationFn: async (organizationId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, organizationId) => {
        if (resp.success && resp.organization) {
          const org = toOrganization(resp.organization);
          if (org) {
            queryClient.setQueryData(
              queryKeys.organizations.detail(organizationId),
              org,
            );
            if (org.handle) {
              queryClient.setQueryData(
                queryKeys.organizations.byHandle(org.handle),
                org,
              );
            }
          }
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.all(),
        });
      },
    });
  };

  /**
   * Refresh user organizations
   */
  const useRefreshUserOrganizations = () => {
    return useMutation({
      mutationFn: async () => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations`,
          method: 'GET',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.organizations) {
          resp.organizations.forEach((org: unknown) => {
            const organization = toOrganization(org);
            if (organization) {
              queryClient.setQueryData(
                queryKeys.organizations.detail(organization.id),
                organization,
              );
              if (organization.handle) {
                queryClient.setQueryData(
                  queryKeys.organizations.byHandle(organization.handle),
                  organization,
                );
              }
            }
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.organizations.userOrgs(),
        });
      },
    });
  };

  /**
   * Refresh team data
   */
  const useRefreshTeam = () => {
    return useMutation({
      mutationFn: async ({
        teamId,
        organizationId: _organizationId,
      }: {
        teamId: string;
        organizationId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/teams/${teamId}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, { teamId, organizationId }) => {
        if (resp.success && resp.team) {
          const team = toTeam(resp.team, organizationId);
          if (team) {
            queryClient.setQueryData(queryKeys.teams.detail(teamId), team);
            if (team.handle) {
              queryClient.setQueryData(
                queryKeys.teams.byHandle(team.handle),
                team,
              );
            }
          }
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.byOrganization(organizationId),
        });
      },
    });
  };

  /**
   * Refresh teams for organization
   */
  const useRefreshTeams = () => {
    return useMutation({
      mutationFn: async (organizationId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/${organizationId}/teams`,
          method: 'GET',
        });
      },
      onSuccess: (resp, organizationId) => {
        if (resp.success && resp.teams) {
          resp.teams.forEach((t: unknown) => {
            const team = toTeam(t, organizationId);
            if (team) {
              queryClient.setQueryData(queryKeys.teams.detail(team.id), team);
              if (team.handle) {
                queryClient.setQueryData(
                  queryKeys.teams.byHandle(team.handle),
                  team,
                );
              }
            }
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.teams.byOrganization(organizationId),
        });
      },
    });
  };

  /**
   * Refresh organization space
   */
  const useRefreshOrganizationSpace = () => {
    return useMutation({
      mutationFn: async ({
        organizationId,
        spaceId,
      }: {
        organizationId: string;
        spaceId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/organizations/${organizationId}/spaces/${spaceId}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, { organizationId, spaceId }) => {
        if (resp.success && resp.space) {
          const space = toSpace(resp.space);
          if (space) {
            queryClient.setQueryData(queryKeys.spaces.detail(spaceId), space);
          }
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.byOrganization(organizationId),
        });
      },
    });
  };

  /**
   * Refresh organization spaces
   */
  const useRefreshOrganizationSpaces = () => {
    return useMutation({
      mutationFn: async (organizationId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/organizations/${organizationId}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, organizationId) => {
        if (resp.success && resp.spaces) {
          resp.spaces.forEach((s: unknown) => {
            const space = toSpace(s);
            if (space) {
              queryClient.setQueryData(
                queryKeys.spaces.detail(space.id),
                space,
              );
            }
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.byOrganization(organizationId),
        });
      },
    });
  };

  /**
   * Refresh user spaces
   */
  const useRefreshUserSpaces = () => {
    return useMutation({
      mutationFn: async () => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/users/me`,
          method: 'GET',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.spaces) {
          resp.spaces.forEach((s: unknown) => {
            const space = toSpace(s);
            if (space) {
              queryClient.setQueryData(
                queryKeys.spaces.detail(space.id),
                space,
              );
            }
          });
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.userSpaces(),
        });
      },
    });
  };

  // ============================================================================
  // Courses, Space Items, and Advanced Features
  // ============================================================================

  /**
   * Get course by ID
   */
  const useCourse = (courseId: string) => {
    return useQuery({
      queryKey: ['courses', 'detail', courseId] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}`,
          method: 'GET',
        });
        if (resp.success && resp.course) {
          return toCourse(resp.course);
        }
        return undefined;
      },
      enabled: !!courseId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Update course
   */
  const useUpdateCourse = () => {
    return useMutation({
      mutationFn: async ({
        courseId,
        name,
        description,
      }: {
        courseId: string;
        name: string;
        description: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}`,
          method: 'PUT',
          body: { name, description },
        });
      },
      onSuccess: (_, { courseId }) => {
        // Invalidate detail cache
        queryClient.invalidateQueries({
          queryKey: ['courses', 'detail', courseId],
        });
        // Invalidate all course queries
        queryClient.invalidateQueries({
          queryKey: ['courses'],
        });
      },
    });
  };

  /**
   * Get public courses
   */
  const usePublicCourses = () => {
    return useQuery({
      queryKey: ['courses', 'public'] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/courses/public`,
          method: 'GET',
        });
        if (resp.success && resp.courses) {
          return resp.courses.map((course: unknown) => toCourse(course));
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get instructor courses
   */
  const useInstructorCourses = (userId?: string) => {
    return useQuery({
      queryKey: ['courses', 'instructor', userId] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/instructors/${userId}/courses`,
          method: 'GET',
        });
        if (resp.success && resp.courses) {
          return resp.courses.map((course: unknown) => toCourse(course));
        }
        return [];
      },
      enabled: !!userId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get course enrollments for current user
   */
  const useCourseEnrollments = () => {
    return useQuery({
      queryKey: ['courses', 'enrollments', 'me'] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/enrollments/me`,
          method: 'GET',
        });
        if (resp.success && resp.enrollments) {
          return resp.enrollments.map((enrollment: unknown) =>
            toCourse(enrollment),
          );
        }
        return [];
      },
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Enroll student to course
   */
  const useEnrollStudentToCourse = () => {
    return useMutation({
      mutationFn: async ({
        courseId,
        studentId,
      }: {
        courseId: string;
        studentId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentId}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { courseId }) => {
        queryClient.invalidateQueries({
          queryKey: ['courses', 'detail', courseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['courses', 'enrollments'],
        });
      },
    });
  };

  /**
   * Remove student from course
   */
  const useRemoveStudentFromCourse = () => {
    return useMutation({
      mutationFn: async ({
        courseId,
        studentId,
      }: {
        courseId: string;
        studentId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { courseId }) => {
        queryClient.invalidateQueries({
          queryKey: ['courses', 'detail', courseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['courses', 'enrollments'],
        });
      },
    });
  };

  /**
   * Get space items
   */
  const useSpaceItems = (spaceId: string) => {
    return useQuery({
      queryKey: ['spaces', spaceId, 'items'] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return asArray(resp.items).map((itm: any) => toItem(itm));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Make item public
   */
  const useMakeItemPublic = () => {
    return useMutation({
      mutationFn: async (itemId: string) => {
        return requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/items/${itemId}/public`,
          method: 'PUT',
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['spaces'] });
      },
    });
  };

  /**
   * Make item private
   */
  const useMakeItemPrivate = () => {
    return useMutation({
      mutationFn: async (itemId: string) => {
        return requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/items/${itemId}/private`,
          method: 'PUT',
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['spaces'] });
      },
    });
  };

  /**
   * Get user organization by ID (helper method)
   */
  const useUserOrganizationById = (organizationId: string) => {
    const { data: userOrganizations } = useUserOrganizations();
    return userOrganizations?.find(org => org.id === organizationId);
  };

  /**
   * Refresh layout (loads user, organization, and space data)
   */
  const useRefreshLayout = () => {
    return useMutation({
      mutationFn: async ({
        accountHandle,
        spaceHandle,
      }: {
        accountHandle: string;
        spaceHandle?: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/layouts/accounts/${accountHandle}${spaceHandle !== undefined ? '/spaces/' + spaceHandle : ''}`,
          method: 'GET',
        });
      },
      onSuccess: (resp, variables) => {
        if (resp.success) {
          // Transform raw API data to typed models
          const transformedUser = resp.user ? toUser(resp.user) : undefined;
          const transformedOrganization = resp.organization
            ? toOrganization(resp.organization)
            : undefined;
          const transformedSpace = resp.space ? toSpace(resp.space) : undefined;

          // Set data directly into cache instead of just invalidating
          if (transformedUser) {
            queryClient.setQueryData(
              queryKeys.users.byHandle(variables.accountHandle),
              transformedUser,
            );
            queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });
          }
          if (transformedOrganization) {
            queryClient.setQueryData(
              queryKeys.organizations.byHandle(variables.accountHandle),
              transformedOrganization,
            );
            queryClient.invalidateQueries({
              queryKey: queryKeys.organizations.all(),
            });
          }
          if (transformedSpace) {
            // Set both user and org space queries based on which type it is
            if (transformedUser && variables.spaceHandle) {
              queryClient.setQueryData(
                queryKeys.spaces.byHandle(variables.spaceHandle),
                transformedSpace,
              );
            }
            if (transformedOrganization && variables.spaceHandle) {
              queryClient.setQueryData(
                queryKeys.spaces.orgSpaceByHandle(
                  transformedOrganization.id,
                  variables.spaceHandle,
                ),
                transformedSpace,
              );
            }
            queryClient.invalidateQueries({ queryKey: queryKeys.spaces.all() });
          }
        }
      },
    });
  };

  /**
   * Export space
   */
  const useExportSpace = () => {
    return useMutation({
      mutationFn: async (spaceId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/export`,
          method: 'GET',
        });
      },
    });
  };

  // ============================================================================
  // Cells, Datasets, Environments, and Lessons
  // ============================================================================

  /**
   * Get cell by ID
   */
  const useCell = (cellId: string) => {
    return useQuery({
      queryKey: queryKeys.cells.detail(cellId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${cellId}`,
          method: 'GET',
        });
        if (resp.success && resp.item) {
          return toCell(resp.item);
        }
        return undefined;
      },
      enabled: !!cellId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get cells by space
   */
  const useCellsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.cells.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/cell`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toCell(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Update cell
   */
  const useUpdateCell = () => {
    return useMutation({
      mutationFn: async (cell: {
        id: string;
        name: string;
        description: string;
        source: string;
        outputshotUrl?: string;
        outputshotData?: string;
        spaceId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/cells/${cell.id}`,
          method: 'PUT',
          body: cell,
        });
      },
      onSuccess: (resp, cell) => {
        if (resp.success) {
          // Invalidate detail and list queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.cells.detail(cell.id),
          });
          queryClient.invalidateQueries({
            queryKey: queryKeys.cells.bySpace(cell.spaceId),
          });
        }
      },
    });
  };

  /**
   * Clone cell
   */
  const useCloneCell = () => {
    return useMutation({
      mutationFn: async (cellId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/cells/${cellId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: (resp, _cellId) => {
        if (resp.success && resp.cell) {
          const cell = toCell(resp.cell);
          // Set detail cache
          queryClient.setQueryData(queryKeys.cells.detail(cell.id), cell);
          // Refetch all cell queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.cells.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  /**
   * Get dataset by ID
   */
  const useDataset = (datasetId: string) => {
    return useQuery({
      queryKey: queryKeys.datasets.detail(datasetId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${datasetId}`,
          method: 'GET',
        });
        if (resp.success && resp.item) {
          return toDataset(resp.item);
        }
        return undefined;
      },
      enabled: !!datasetId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get datasets by space
   */
  const useDatasetsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.datasets.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/dataset`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toDataset(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Update dataset
   */
  const useUpdateDataset = () => {
    return useMutation({
      mutationFn: async ({
        id,
        name,
        description,
      }: {
        id: string;
        name: string;
        description: string;
        spaceId?: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/datasets/${id}`,
          method: 'PUT',
          body: { name, description },
        });
      },
      onSuccess: (resp, { id, spaceId }) => {
        if (resp.success) {
          // Invalidate detail and list queries
          queryClient.invalidateQueries({
            queryKey: queryKeys.datasets.detail(id),
          });
          if (spaceId) {
            queryClient.invalidateQueries({
              queryKey: queryKeys.datasets.bySpace(spaceId),
            });
          }
        }
      },
    });
  };

  /**
   * Get environment by ID
   */
  const useEnvironment = (environmentId: string) => {
    return useQuery({
      queryKey: queryKeys.environments.detail(environmentId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${environmentId}`,
          method: 'GET',
        });
        if (resp.success && resp.item) {
          return toEnvironment(resp.item);
        }
        return undefined;
      },
      enabled: !!environmentId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get environments by space
   */
  const useEnvironmentsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.environments.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/environment`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toEnvironment(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get lesson by ID
   */
  const useLesson = (lessonId: string) => {
    return useQuery({
      queryKey: queryKeys.lessons.detail(lessonId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lessons/${lessonId}`,
          method: 'GET',
        });
        if (resp.success && resp.lesson) {
          return toLesson(resp.lesson);
        }
        return undefined;
      },
      enabled: !!lessonId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get lessons by space
   */
  const useLessonsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.lessons.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/lesson`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toLesson(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Clone lesson
   */
  const useCloneLesson = () => {
    return useMutation({
      mutationFn: async (lessonId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${lessonId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: (resp, _lessonId) => {
        if (resp.success && resp.notebook) {
          const lesson = toLesson(resp.notebook);
          // Set detail cache
          queryClient.setQueryData(queryKeys.lessons.detail(lesson.id), lesson);
          // Refetch all lesson queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.lessons.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  // ============================================================================
  // Exercises, Assignments, Invites, and Contacts
  // ============================================================================

  /**
   * Get exercise by ID
   */
  const useExercise = (exerciseId: string) => {
    return useQuery({
      queryKey: queryKeys.exercises.detail(exerciseId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${exerciseId}`,
          method: 'GET',
        });
        if (resp.success && resp.item) {
          return toExercise(resp.item);
        }
        return undefined;
      },
      enabled: !!exerciseId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get exercises by space
   */
  const useExercisesBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.exercises.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/exercise`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toExercise(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Update exercise
   */
  const useUpdateExercise = () => {
    return useMutation({
      mutationFn: async ({
        id,
        name,
        description,
        help,
        codePre,
        codeSolution,
        codeQuestion,
        codeTest,
      }: {
        id: string;
        name: string;
        description: string;
        help?: string;
        codePre?: string;
        codeSolution?: string;
        codeQuestion?: string;
        codeTest?: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${id}`,
          method: 'PUT',
          body: {
            name,
            description,
            help,
            codePre,
            codeSolution,
            codeQuestion,
            codeTest,
          },
        });
      },
      onSuccess: (_, { id }) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.exercises.detail(id),
        });
        queryClient.invalidateQueries({ queryKey: queryKeys.exercises.all() });
      },
    });
  };

  /**
   * Clone exercise
   */
  const useCloneExercise = () => {
    return useMutation({
      mutationFn: async (exerciseId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${exerciseId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.exercise) {
          const exercise = toExercise(resp.exercise);
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.exercises.detail(exercise.id),
            exercise,
          );
          // Refetch all exercise queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.exercises.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  /**
   * Get assignment by ID
   */
  const useAssignment = (assignmentId: string) => {
    return useQuery({
      queryKey: queryKeys.assignments.detail(assignmentId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}`,
          method: 'GET',
        });
        if (resp.success && resp.assignment) {
          return toAssignment(resp.assignment);
        }
        return undefined;
      },
      enabled: !!assignmentId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get assignments by space
   */
  const useAssignmentsBySpace = (spaceId: string) => {
    return useQuery({
      queryKey: queryKeys.assignments.bySpace(spaceId),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/assignment`,
          method: 'GET',
        });
        if (resp.success && resp.items) {
          return resp.items.map((item: unknown) => toAssignment(item));
        }
        return [];
      },
      enabled: !!spaceId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Clone assignment
   */
  const useCloneAssignment = () => {
    return useMutation({
      mutationFn: async (assignmentId: string) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${assignmentId}/clone`,
          method: 'POST',
        });
      },
      onSuccess: resp => {
        if (resp.success && resp.notebook) {
          const assignment = toAssignment(resp.notebook);
          // Set detail cache
          queryClient.setQueryData(
            queryKeys.assignments.detail(assignment.id),
            assignment,
          );
          // Refetch all assignment queries immediately
          queryClient.refetchQueries({
            queryKey: queryKeys.assignments.all(),
          });
          // Refetch space items lists immediately
          queryClient.refetchQueries({ queryKey: queryKeys.items.all() });
        }
      },
    });
  };

  /**
   * Get invite by token
   */
  const useInvite = (token: string) => {
    return useQuery({
      queryKey: ['invites', 'token', token] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/tokens/${token}`,
          method: 'GET',
        });
        if (resp.success && resp.invite) {
          return asInvite(resp.invite);
        }
        return undefined;
      },
      enabled: !!token,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Get invites for user
   */
  const useInvitesByUser = (accountId: string) => {
    return useQuery({
      queryKey: ['invites', 'user', accountId] as const,
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/users/${accountId}`,
          method: 'GET',
        });
        if (resp.success && resp.invites) {
          return resp.invites.map((i: unknown) => asInvite(i));
        }
        return [];
      },
      enabled: !!accountId,
      ...DEFAULT_QUERY_OPTIONS,
    });
  };

  /**
   * Accept/put invite
   */
  const usePutInvite = () => {
    return useMutation({
      mutationFn: async (token: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/tokens/${token}`,
          method: 'PUT',
        });
      },
      onSuccess: (_, token) => {
        queryClient.invalidateQueries({
          queryKey: ['invites', 'token', token],
        });
        queryClient.invalidateQueries({ queryKey: ['invites', 'user'] });
      },
    });
  };

  // ============================================================================
  // Assignment Student Operations
  // ============================================================================

  /**
   * Fetch assignment from student perspective with enrollment data
   */
  const useAssignmentForStudent = (
    assignmentId: string,
    courseId: string,
    userId: string,
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['assignments', 'student', assignmentId, courseId, userId],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/courses/${courseId}/students/${userId}`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(
            resp.message || 'Failed to fetch assignment for student',
          );
        }
        return resp.assignment;
      },
      ...options,
    });
  };

  /**
   * Reset assignment for a student (clear their progress)
   */
  const useResetAssignmentForStudent = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        assignmentId,
        courseId: _courseId,
        userId: _userId,
      }: {
        assignmentId: string;
        courseId: string;
        userId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/reset`,
          method: 'POST',
        });
      },
      onSuccess: (_, { assignmentId, courseId, userId }) => {
        queryClient.invalidateQueries({
          queryKey: ['assignments', 'student', assignmentId, courseId, userId],
        });
        queryClient.invalidateQueries({
          queryKey: ['assignments', assignmentId],
        });
      },
    });
  };

  /**
   * Grade an assignment for a student
   */
  const useGradeAssignmentForStudent = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        assignmentId,
        courseId: _courseId,
        userId,
        model,
      }: {
        assignmentId: string;
        courseId: string;
        userId: string;
        model: unknown;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/students/${userId}/grade`,
          method: 'PUT',
          body: { model },
        });
      },
      onSuccess: (_, { assignmentId, courseId, userId }) => {
        queryClient.invalidateQueries({
          queryKey: ['assignments', 'student', assignmentId, courseId, userId],
        });
        queryClient.invalidateQueries({
          queryKey: ['assignments', assignmentId],
        });
      },
    });
  };

  /**
   * Get student version of assignment (submission view)
   */
  const useAssignmentStudentVersion = (
    assignmentId: string,
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['assignments', 'studentVersion', assignmentId],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/student_version`,
          method: 'GET',
        });
        return resp;
      },
      ...options,
    });
  };

  // ============================================================================
  // Exercise Grading
  // ============================================================================

  /**
   * Grade an exercise by assigning points to student code
   */
  const useUpdateExercisePoints = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        exerciseId,
        codeStudent,
        points,
      }: {
        exerciseId: string;
        codeStudent: string;
        points: number;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/exercises/${exerciseId}/points`,
          method: 'PUT',
          body: { codeStudent, points },
        });
      },
      onSuccess: (_, { exerciseId }) => {
        queryClient.invalidateQueries({
          queryKey: ['exercises', exerciseId],
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.exercises.all(),
        });
      },
    });
  };

  // ============================================================================
  // Course Student & Course Items
  // ============================================================================

  /**
   * Get a student in a course
   */
  const useStudent = (
    courseId: string,
    studentId: string,
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['courses', courseId, 'students', studentId],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentId}`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(resp.message || 'Failed to fetch student');
        }
        return resp.student;
      },
      enabled: !!courseId && !!studentId,
      ...options,
    });
  };

  /**
   * Mark a course item as completed
   */
  const useConfirmCourseItemCompletion = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        courseId,
        itemType,
        itemId,
        completed,
      }: {
        courseId: string;
        itemType: string;
        itemId: string;
        completed: boolean;
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${courseId}/types/${itemType}/items/${itemId}/complete`,
          method: 'PUT',
          body: { completed },
        });
      },
      onSuccess: (_, { courseId, itemId: _itemId }) => {
        queryClient.invalidateQueries({
          queryKey: ['courses', courseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['courses', courseId, 'items'],
        });
      },
    });
  };

  /**
   * Set the curriculum items for a course
   */
  const useSetCourseItems = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        courseId,
        itemIds,
      }: {
        courseId: string;
        itemIds: string[];
      }) => {
        return requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/items`,
          method: 'PUT',
          body: { itemIds },
        });
      },
      onSuccess: (_, { courseId }) => {
        queryClient.invalidateQueries({
          queryKey: ['courses', courseId],
        });
        queryClient.invalidateQueries({
          queryKey: ['courses', courseId, 'items'],
        });
      },
    });
  };

  // ============================================================================
  // Inbounds & Outbounds
  // ============================================================================

  /**
   * Get all inbound leads
   */
  const useInbounds = (
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['inbounds'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(resp.message || 'Failed to fetch inbounds');
        }
        return resp.inbounds;
      },
      ...options,
    });
  };

  /**
   * Get a specific outbound by ID
   */
  const useOutbound = (
    outboundId: string,
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['outbounds', outboundId],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(resp.message || 'Failed to fetch outbound');
        }
        return resp.outbound;
      },
      enabled: !!outboundId,
      ...options,
    });
  };

  /**
   * Get all outbound campaigns
   */
  const useOutbounds = (
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['outbounds'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(resp.message || 'Failed to fetch outbounds');
        }
        return resp.outbounds;
      },
      ...options,
    });
  };

  /**
   * Draft bulk emails for outbound campaign
   */
  const useDraftBulkEmailsOutbounds = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (params: unknown) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/emails/bulk/draft`,
          method: 'POST',
          body: params,
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: ['outbounds'],
          refetchType: 'inactive',
        });
      },
    });
  };

  // ============================================================================
  // Advanced Outbound Operations
  // ============================================================================

  /**
   * Try bulk emails (test mode) for outbound campaign
   */
  const useTryBulkEmailsOutbounds = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (outboundId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}/try`,
          method: 'POST',
          body: {},
        });
      },
      onSuccess: (_, outboundId) => {
        queryClient.invalidateQueries({
          queryKey: ['outbounds', outboundId],
          refetchType: 'inactive',
        });
      },
    });
  };

  /**
   * Launch bulk emails for outbound campaign (production mode)
   */
  const useLaunchBulkEmailsOutbounds = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (outboundId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}/launch`,
          method: 'POST',
          body: {},
        });
      },
      onSuccess: (_, outboundId) => {
        queryClient.removeQueries({
          queryKey: ['outbounds', outboundId],
        });
        queryClient.invalidateQueries({
          queryKey: ['outbounds'],
          refetchType: 'inactive',
        });
      },
    });
  };

  /**
   * Send individual outbound email to a user
   */
  const useSendOutboundEmailToUser = () => {
    return useMutation({
      mutationFn: async ({
        userId,
        recipient,
        subject,
        content,
      }: {
        userId: string;
        recipient: string;
        subject: string;
        content: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/email`,
          method: 'POST',
          body: { userId, recipient, subject, content },
        });
      },
    });
  };

  /**
   * Delete an outbound campaign
   */
  const useDeleteOutbound = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (outboundId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, outboundId) => {
        queryClient.removeQueries({
          queryKey: ['outbounds', outboundId],
        });
        queryClient.invalidateQueries({
          queryKey: ['outbounds'],
          refetchType: 'inactive',
        });
      },
    });
  };

  // ============================================================================
  // Outbound Subscriptions
  // ============================================================================

  /**
   * Subscribe a user to outbound communications
   */
  const useSubscribeUserToOutbounds = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/outbounds/users/${userId}`,
          method: 'PUT',
        });
      },
    });
  };

  /**
   * Unsubscribe a user from outbound communications
   */
  const useUnsubscribeUserFromOutbounds = () => {
    return useMutation({
      mutationFn: async (userId: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/outbounds/users/${userId}`,
          method: 'DELETE',
        });
      },
    });
  };

  /**
   * Unsubscribe a contact from outbound communications
   */
  const useUnsubscribeContactFromOutbounds = () => {
    return useMutation({
      mutationFn: async (contactId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/unsubscribe/${contactId}`,
          method: 'GET',
        });
      },
    });
  };

  /**
   * Unsubscribe an invitee from outbound communications
   */
  const useUnsubscribeInviteeFromOutbounds = () => {
    return useMutation({
      mutationFn: async (token: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/unsubscribe/${token}`,
          method: 'GET',
        });
      },
    });
  };

  // ============================================================================
  // MFA (Multi-Factor Authentication)
  // ============================================================================

  /**
   * Enable MFA for current user
   */
  const useEnableUserMFA = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
          method: 'PUT',
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    });
  };

  /**
   * Disable MFA for current user
   */
  const useDisableUserMFA = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
          method: 'DELETE',
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['me'] });
      },
    });
  };

  /**
   * Validate MFA code for a user
   */
  const useValidateUserMFACode = () => {
    return useMutation({
      mutationFn: async ({
        userUid,
        code,
      }: {
        userUid: string;
        code: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/mfa`,
          method: 'POST',
          body: { userUid, code },
        });
      },
    });
  };

  // ============================================================================
  // Checkout & Credits
  // ============================================================================

  /**
   * Get Stripe pricing information
   */
  const useStripePrices = (
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['stripe', 'prices'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/stripe/v1/prices`,
          method: 'GET',
        });
        return resp.prices || [];
      },
      ...options,
    });
  };

  /**
   * Create Stripe checkout session
   */
  const useCreateCheckoutSession = () => {
    return useMutation({
      mutationFn: async ({
        product,
        location,
      }: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product: any;
        location: Location;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/stripe/v1/checkout/session`,
          method: 'POST',
          body: {
            price_id: product?.id,
            return_url: `${location.protocol}//${location.host}${location.pathname.split('/').slice(0, -1).join('/')}`,
          },
        });
        return resp.client_secret;
      },
    });
  };

  /**
   * Burn user credits (deduct from balance)
   */
  const useBurnCredit = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (credits: number) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/credits`,
          method: 'DELETE',
          body: { credits },
        });
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['users', 'credits'] });
      },
    });
  };

  // ============================================================================
  // Support & Surveys
  // ============================================================================

  /**
   * Request platform support (first form)
   */
  const useRequestPlatformSupport = () => {
    return useMutation({
      mutationFn: async ({
        subject,
        message,
        email,
        brand,
      }: {
        subject: string;
        message: string;
        email: string;
        brand: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.supportRunUrl}/api/support/v1/support/request`,
          method: 'POST',
          body: { subject, message, email, brand },
        });
      },
    });
  };

  /**
   * Request platform support (second form with more details)
   */
  const useRequestPlatformSupport2 = () => {
    return useMutation({
      mutationFn: async ({
        accountHandle,
        firstName,
        lastName,
        email,
        message,
      }: {
        accountHandle: string;
        firstName: string;
        lastName: string;
        email: string;
        message: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.supportRunUrl}/api/support/v1/support/request2`,
          method: 'POST',
          body: { accountHandle, firstName, lastName, email, message },
        });
      },
    });
  };

  /**
   * Get user surveys
   */
  const useUserSurveys = (
    userId: string,
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['users', userId, 'surveys'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/surveys/users/${userId}`,
          method: 'GET',
        });
        if (!resp.success) {
          throw new Error(resp.message || 'Failed to fetch surveys');
        }
        return {
          surveys: resp.surveys || [],
          surveysMap: resp.surveysMap,
        };
      },
      enabled: !!userId,
      ...options,
    });
  };

  // ============================================================================
  // Join & Registration
  // ============================================================================

  /**
   * Request to join platform (standard registration)
   */
  const useRequestJoin = () => {
    return useMutation({
      mutationFn: async ({
        handle,
        email,
        firstName,
        lastName,
        password,
        passwordConfirm,
      }: {
        handle: string;
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        passwordConfirm: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/join/request`,
          method: 'POST',
          body: {
            handle,
            email,
            firstName,
            lastName,
            password,
            passwordConfirm,
          },
        });
      },
    });
  };

  /**
   * Request to join with token (token-based registration)
   */
  const useRequestJoinToken = () => {
    return useMutation({
      mutationFn: async ({
        handle,
        email,
        firstName,
        lastName,
        password,
        passwordConfirm,
      }: {
        handle: string;
        email: string;
        firstName: string;
        lastName: string;
        password: string;
        passwordConfirm: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/join/request/token`,
          method: 'POST',
          body: {
            handle,
            email,
            firstName,
            lastName,
            password,
            passwordConfirm,
          },
        });
      },
    });
  };

  /**
   * Join platform with invite token
   */
  const useJoinWithInvite = () => {
    return useMutation({
      mutationFn: async ({
        formValues,
        token,
      }: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formValues: any;
        token: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/join/invites/token`,
          method: 'POST',
          body: { ...formValues, token },
        });
      },
    });
  };

  /**
   * Confirm join with token
   */
  const useConfirmJoinWithToken = () => {
    return useMutation({
      mutationFn: async ({
        userHandle,
        token,
      }: {
        userHandle: string;
        token: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/join/users/${userHandle}/tokens/${token}`,
          method: 'GET',
        });
      },
    });
  };

  // ============================================================================
  // Password Recovery
  // ============================================================================

  /**
   * Create token for password change
   */
  const useCreateTokenForPasswordChange = () => {
    return useMutation({
      mutationFn: async ({
        handle,
        password,
        passwordConfirm,
      }: {
        handle: string;
        password: string;
        passwordConfirm: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/password/token`,
          method: 'POST',
          body: { handle, password, passwordConfirm },
        });
      },
    });
  };

  /**
   * Confirm password change with token
   */
  const useConfirmPasswordWithToken = () => {
    return useMutation({
      mutationFn: async ({
        userHandle,
        token,
      }: {
        userHandle: string;
        token: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/password/confirm/users/${userHandle}/tokens/${token}`,
          method: 'PUT',
        });
      },
    });
  };

  // ============================================================================
  // OAuth2 Authentication
  // ============================================================================

  /**
   * Get OAuth2 authorization URL
   */
  const useOAuth2AuthorizationURL = () => {
    return useMutation({
      mutationFn: async (queryArgs: Record<string, string>) => {
        const queryString = Object.entries(queryArgs)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        const resp = await requestDatalayer<{
          success: boolean;
          autorization_url: string;
        }>({
          url: `${configuration.iamRunUrl}/api/iam/v1/oauth2/authz/url?${queryString}`,
          notifyOnError: false,
        });
        return resp.autorization_url;
      },
    });
  };

  /**
   * Get OAuth2 authorization link URL
   */
  const useOAuth2AuthorizationLinkURL = () => {
    return useMutation({
      mutationFn: async (queryArgs: Record<string, string>) => {
        const queryString = Object.entries(queryArgs)
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');
        const resp = await requestDatalayer<{
          success: boolean;
          autorization_url: string;
        }>({
          url: `${configuration.iamRunUrl}/api/iam/v1/oauth2/authz/url/link?${queryString}`,
        });
        return resp;
      },
    });
  };

  // ============================================================================
  // Contact Enrichment & Tagging
  // ============================================================================

  /**
   * Assign tag to contact
   */
  const useAssignTagToContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        contactId,
        tagName,
      }: {
        contactId: string;
        tagName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/tags/${tagName}`,
          method: 'POST',
        });
      },
      onSuccess: (_, { contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      },
    });
  };

  /**
   * Remove tag from contact
   */
  const useUnassignTagFromContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        contactId,
        tagName,
      }: {
        contactId: string;
        tagName: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/tags/${tagName}`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
        queryClient.invalidateQueries({ queryKey: ['contacts'] });
      },
    });
  };

  /**
   * Send invite to contact
   */
  const useSendInviteToContact = () => {
    return useMutation({
      mutationFn: async ({
        contactId,
        message,
      }: {
        contactId: string;
        message: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/invites`,
          method: 'POST',
          body: { contactId, message },
        });
      },
    });
  };

  /**
   * Enrich contact with email data
   */
  const useEnrichContactEmail = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        contactId,
        useDomain,
      }: {
        contactId: string;
        useDomain: boolean;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/enrich/email?useDomain=${useDomain}`,
          method: 'GET',
        });
      },
      onSuccess: (_, { contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
      },
    });
  };

  /**
   * Enrich contact with LinkedIn data
   */
  const useEnrichContactLinkedin = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (contactId: string) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/enrich/linkedin`,
          method: 'GET',
        });
      },
      onSuccess: (_, contactId) => {
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
      },
    });
  };

  /**
   * Send LinkedIn connection request to contact
   */
  const useSendLinkedinConnectionRequest = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        contactId,
        message,
      }: {
        contactId: string;
        message: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}/connect/linkedin`,
          method: 'POST',
          body: { message },
        });
      },
      onSuccess: (_, { contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
      },
    });
  };

  // ============================================================================
  // Contact-User Linking
  // ============================================================================

  /**
   * Link user with contact
   */
  const useLinkUserWithContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        userId,
        contactId,
      }: {
        userId: string;
        contactId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/users/${userId}/contacts/${contactId}/link`,
          method: 'POST',
        });
      },
      onSuccess: (_, { userId, contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['users', userId],
        });
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
      },
    });
  };

  /**
   * Unlink user from contact
   */
  const useUnlinkUserFromContact = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        userId,
        contactId,
      }: {
        userId: string;
        contactId: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/users/${userId}/contacts/${contactId}/link`,
          method: 'DELETE',
        });
      },
      onSuccess: (_, { userId, contactId }) => {
        queryClient.invalidateQueries({
          queryKey: ['users', userId],
        });
        queryClient.invalidateQueries({
          queryKey: ['contacts', contactId],
        });
      },
    });
  };

  // ============================================================================
  // Credits Quota & Usage
  // ============================================================================

  /**
   * Update user credits quota
   */
  const useUpdateUserCreditsQuota = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        userId,
        quota,
      }: {
        userId: string;
        quota?: number;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/quota`,
          method: 'PUT',
          body: {
            user_uid: userId,
            quota,
            reset: '0',
          },
        });
      },
      onSuccess: (_, { userId }) => {
        queryClient.invalidateQueries({
          queryKey: ['users', userId, 'credits'],
        });
      },
    });
  };

  /**
   * Get current user's usage data
   */
  const useUsages = (
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['usage', 'me'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/user`,
          method: 'GET',
        });
        // Transform snake_case API response to camelCase IUsage interface
        const usages = (resp.usages || []).map((u: any) => ({
          id: u.resource_uid,
          accountId: u.account_uid,
          type: u.resource_type,
          burningRate: u.burning_rate,
          credits: u.credits,
          creditsLimit: u.credits_limit,
          startDate: u.start_date ? new Date(u.start_date) : new Date(),
          updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
          endDate: u.end_date ? new Date(u.end_date) : undefined,
          givenName: u.given_name || u.resource_given_name || '',
          resourceState: u.resource_state,
          resources: u.pod_resources,
          metadata: new Map(Object.entries(u.metadata || {})),
        }));
        return usages;
      },
      ...options,
    });
  };

  /**
   * Get usage data for specific user
   */
  const useUsagesForUser = (
    userId: string,
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['usage', 'user', userId],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/users/${userId}`,
          method: 'GET',
        });
        // Transform snake_case API response to camelCase IUsage interface
        const usages = (resp.usages || []).map((u: any) => ({
          id: u.resource_uid,
          accountId: u.account_uid,
          type: u.resource_type,
          burningRate: u.burning_rate,
          credits: u.credits,
          creditsLimit: u.credits_limit,
          startDate: u.start_date ? new Date(u.start_date) : new Date(),
          updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
          endDate: u.end_date ? new Date(u.end_date) : undefined,
          givenName: u.given_name || u.resource_given_name || '',
          resourceState: u.resource_state,
          resources: u.pod_resources,
          metadata: new Map(Object.entries(u.metadata || {})),
        }));
        return usages;
      },
      enabled: !!userId,
      ...options,
    });
  };

  /**
   * Get platform-wide usage statistics
   */
  const usePlatformUsages = (
    options?: Omit<UseQueryOptions<unknown[]>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['usage', 'platform'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/usage/platform`,
          method: 'GET',
        });
        // Transform snake_case API response to camelCase IUsage interface
        const usages = (resp.usages || []).map((u: any) => ({
          id: u.resource_uid,
          accountId: u.account_uid,
          type: u.resource_type,
          burningRate: u.burning_rate,
          credits: u.credits,
          creditsLimit: u.credits_limit,
          startDate: u.start_date ? new Date(u.start_date) : new Date(),
          updatedAt: u.updated_at ? new Date(u.updated_at) : new Date(),
          endDate: u.end_date ? new Date(u.end_date) : undefined,
          givenName: u.given_name || u.resource_given_name || '',
          resourceState: u.resource_state,
          resources: u.pod_resources,
          metadata: new Map(Object.entries(u.metadata || {})),
        }));
        return usages;
      },
      ...options,
    });
  };

  // ============================================================================
  // Search Operations
  // ============================================================================

  /**
   * Search public items (notebooks, documents, etc.)
   */
  const useSearchPublicItems = () => {
    return useMutation({
      mutationFn: async ({
        q,
        types = ['notebook', 'document', 'lesson'],
        max = 100,
      }: {
        q?: string;
        types?: string[];
        max?: number;
      }) => {
        const queryString = Object.entries({
          q: q || '*',
          types: types.join(' '),
          max: max.toString(),
          public: 'true',
        })
          .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
          .join('&');

        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/search?${queryString}`,
          method: 'GET',
        });

        if (!resp.success) {
          throw new Error(resp.message || 'Failed to search public items');
        }
        return resp.items || [];
      },
    });
  };

  // ============================================================================
  // Social Media Integrations
  // ============================================================================

  /**
   * Get GitHub profile from access token
   */
  const useGetGitHubProfile = () => {
    return useMutation({
      mutationFn: async (accessToken: string) => {
        const response = await fetch('https://api.github.com/user', {
          method: 'GET',
          headers: {
            Accept: 'application/vnd.github+json',
            Authorization: `Bearer ${accessToken}`,
            'X-GitHub-Api-Version': '2022-11-28',
          },
        });
        return response.json();
      },
    });
  };

  /**
   * Get LinkedIn profile via proxy
   */
  const useGetLinkedinProfile = () => {
    return useMutation({
      mutationFn: async (accessToken: string) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'GET',
            request_url: 'https://api.linkedin.com/v2/userinfo',
            request_token: accessToken,
          },
        });
      },
    });
  };

  /**
   * Post LinkedIn share
   */
  const usePostLinkedinShare = () => {
    return useMutation({
      mutationFn: async ({
        linkedinUserUrn,
        postText,
        accessToken,
      }: {
        linkedinUserUrn: string;
        postText: string;
        accessToken: string;
      }) => {
        const postShareRequest = {
          author: linkedinUserUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: postText },
              shareMediaCategory: 'NONE',
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        };

        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'POST',
            request_url: 'https://api.linkedin.com/v2/ugcPosts',
            request_token: accessToken,
            request_body: postShareRequest,
          },
        });
      },
    });
  };

  /**
   * Post LinkedIn share with image upload
   */
  const usePostLinkedinShareWithUpload = () => {
    return useMutation({
      mutationFn: async ({
        linkedinUserUrn,
        postText,
        uploadObject,
        accessToken,
      }: {
        linkedinUserUrn: string;
        postText: string;
        uploadObject: string;
        accessToken: string;
      }) => {
        // Step 1: Register upload
        const registerUploadRequest = {
          registerUploadRequest: {
            recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
            owner: linkedinUserUrn,
            serviceRelationships: [
              {
                relationshipType: 'OWNER',
                identifier: 'urn:li:userGeneratedContent',
              },
            ],
          },
        };

        const registerResp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'POST',
            request_url:
              'https://api.linkedin.com/v2/assets?action=registerUpload',
            request_token: accessToken,
            request_body: registerUploadRequest,
          },
        });

        const asset = registerResp.response.value.asset;
        const uploadUrl =
          registerResp.response.value.uploadMechanism[
            'com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'
          ].uploadUrl;

        // Step 2: Upload image
        await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'PUT',
            request_url: uploadUrl,
            request_token: accessToken,
            request_body: {
              uploadURL: uploadUrl,
              content: uploadObject,
              userURN: linkedinUserUrn,
            },
          },
        });

        // Step 3: Create share with media
        const shareRequest = {
          author: linkedinUserUrn,
          lifecycleState: 'PUBLISHED',
          specificContent: {
            'com.linkedin.ugc.ShareContent': {
              shareCommentary: { text: postText },
              shareMediaCategory: 'IMAGE',
              media: [
                {
                  status: 'READY',
                  description: { text: 'Datalayer Notebook' },
                  media: asset,
                  title: { text: 'Datalayer Notebook' },
                },
              ],
            },
          },
          visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
          },
        };

        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'POST',
            request_url: 'https://api.linkedin.com/v2/ugcPosts',
            request_token: accessToken,
            request_body: shareRequest,
          },
        });
      },
    });
  };

  // ============================================================================
  // Proxy Operations
  // ============================================================================

  /**
   * Proxy GET request
   */
  const useProxyGET = () => {
    return useMutation({
      mutationFn: async ({ url, token }: { url: string; token: string }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'GET',
            request_url: url,
            request_token: token,
          },
        });
      },
    });
  };

  /**
   * Proxy POST request
   */
  const useProxyPOST = () => {
    return useMutation({
      mutationFn: async ({
        url,
        body,
        token,
      }: {
        url: string;
        body: object;
        token: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'POST',
            request_url: url,
            request_token: token,
            request_body: body,
          },
        });
      },
    });
  };

  /**
   * Proxy PUT request
   */
  const useProxyPUT = () => {
    return useMutation({
      mutationFn: async ({
        url,
        body,
        token,
      }: {
        url: string;
        body: object;
        token: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/proxy/request`,
          method: 'POST',
          body: {
            request_method: 'PUT',
            request_url: url,
            request_token: token,
            request_body: body,
          },
        });
      },
    });
  };

  // ============================================================================
  // Waiting List & Growth
  // ============================================================================

  /**
   * Register to waiting list
   */
  const useRegisterToWaitingList = () => {
    return useMutation({
      mutationFn: async ({
        firstName,
        lastName,
        email,
        affiliation,
      }: {
        firstName: string;
        lastName: string;
        email: string;
        affiliation?: string;
      }) => {
        return requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/waitinglist/register`,
          method: 'POST',
          body: {
            firstName,
            lastName,
            email,
            affiliation: affiliation || '',
          },
        });
      },
    });
  };

  /**
   * Get growth KPIs
   */
  const useGrowthKPI = (
    options?: Omit<UseQueryOptions<unknown>, 'queryKey' | 'queryFn'>,
  ) => {
    return useQuery({
      queryKey: ['growth', 'kpi'],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/kpis`,
          method: 'GET',
        });
        return resp;
      },
      ...options,
    });
  };

  // ============================================================================
  // Refresh Operations & Additional Methods
  // ============================================================================

  /**
   * Refresh a specific user space
   * @param userId - User ID
   * @param spaceId - Space ID
   * @param options - Mutation options
   */
  const useRefreshUserSpace = (
    options?: UseMutationOptions<
      unknown,
      Error,
      { userId: string; spaceId: string }
    >,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        userId,
        spaceId,
      }: {
        userId: string;
        spaceId: string;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/users/${userId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, variables) => {
        // Invalidate user spaces queries
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.userSpaces(),
        });
        queryClient.invalidateQueries({
          queryKey: queryKeys.spaces.detail(variables.spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific course
   * @param options - Mutation options
   */
  const useRefreshCourse = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (courseId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, courseId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.detail(courseId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh public courses list
   * @param options - Mutation options
   */
  const useRefreshPublicCourses = (
    options?: UseMutationOptions<unknown, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/courses/public`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.public(),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh instructor courses list
   * @param options - Mutation options
   */
  const useRefreshInstructorCourses = (
    options?: UseMutationOptions<unknown, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/instructors/${user?.id}/courses`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.instructor(user?.id ?? ''),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh course enrollments
   * @param options - Mutation options
   */
  const useRefreshCoursesEnrollments = (
    options?: UseMutationOptions<unknown, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/enrollments/me`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.enrollments(),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh student data
   * @param options - Mutation options
   */
  const useRefreshStudent = (
    options?: UseMutationOptions<
      unknown,
      Error,
      { courseId: string; studentHandle: string }
    >,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        courseId,
        studentHandle,
      }: {
        courseId: string;
        studentHandle: string;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/courses/${courseId}/enrollments/students/${studentHandle}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.courses.student(
            variables.courseId,
            variables.studentHandle,
          ),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific notebook
   * @param options - Mutation options
   */
  const useRefreshNotebook = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (notebookId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/notebooks/${notebookId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, notebookId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.notebooks.detail(notebookId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space notebooks
   * @param options - Mutation options
   */
  const useRefreshSpaceNotebooks = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/notebook`,
          method: 'GET',
        });
        return resp;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onSuccess: (data: any, spaceId) => {
        // Set the notebooks data directly into cache
        if (data.success && data.items) {
          const notebooks = data.items.map((n: unknown) => {
            const notebook = toNotebook(n);
            queryClient.setQueryData(
              queryKeys.notebooks.detail(notebook.id),
              notebook,
            );
            return notebook;
          });
          queryClient.setQueryData(
            queryKeys.notebooks.bySpace(spaceId),
            notebooks,
          );
        }
        queryClient.invalidateQueries({
          queryKey: queryKeys.notebooks.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific document
   * @param options - Mutation options
   */
  const useRefreshDocument = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (documentId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lexicals/${documentId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, documentId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.detail(documentId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space documents
   * @param options - Mutation options
   */
  const useRefreshSpaceDocuments = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/document`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.documents.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific cell
   * @param options - Mutation options
   */
  const useRefreshCell = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (cellId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${cellId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, cellId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cells.detail(cellId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space cells
   * @param options - Mutation options
   */
  const useRefreshSpaceCells = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/cell`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.cells.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific dataset
   * @param options - Mutation options
   */
  const useRefreshDataset = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (datasetId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${datasetId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, datasetId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.datasets.detail(datasetId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space datasets
   * @param options - Mutation options
   */
  const useRefreshSpaceDatasets = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/dataset`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.datasets.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh schools list
   * @param options - Mutation options
   */
  const useRefreshSchools = (
    options?: UseMutationOptions<unknown, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.iamRunUrl}/api/iam/v1/organizations/schools`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.schools.all() });
      },
      ...options,
    });
  };

  /**
   * Get public items (query hook)
   * @param options - Query options
   */
  const usePublicItems = (options?: UseQueryOptions<unknown, Error>) => {
    return useQuery({
      queryKey: queryKeys.items.public(),
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/items/public`,
          method: 'GET',
        });
        return resp;
      },
      ...options,
    });
  };

  /**
   * Refresh public items
   * @param options - Mutation options
   */
  const useRefreshPublicItems = (
    options?: UseMutationOptions<unknown, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.libraryRunUrl}/api/library/v1/items/public`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.items.public() });
      },
      ...options,
    });
  };

  /**
   * Refresh space items
   * @param options - Mutation options
   */
  const useRefreshSpaceItems = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.items.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Clear cached organizations (mutation)
   * @param options - Mutation options
   */
  const useClearCachedOrganizations = (
    options?: UseMutationOptions<void, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        // No API call, just clear cache
        return;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['organizations'] });
      },
      ...options,
    });
  };

  /**
   * Clear cached teams (mutation)
   * @param options - Mutation options
   */
  const useClearCachedTeams = (
    options?: UseMutationOptions<void, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        // No API call, just clear cache
        return;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['teams'] });
      },
      ...options,
    });
  };

  // ============================================================================
  // Additional Refresh Operations
  // ============================================================================

  /**
   * Refresh a specific environment
   * @param options - Mutation options
   */
  const useRefreshEnvironment = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (environmentId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${environmentId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, environmentId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.environments.detail(environmentId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space environments
   * @param options - Mutation options
   */
  const useRefreshSpaceEnvironments = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/environment`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.environments.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific lesson
   * @param options - Mutation options
   */
  const useRefreshLesson = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (lessonId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/lessons/${lessonId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, lessonId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lessons.detail(lessonId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space lessons
   * @param options - Mutation options
   */
  const useRefreshSpaceLessons = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/lesson`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.lessons.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific exercise
   * @param options - Mutation options
   */
  const useRefreshExercise = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (exerciseId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/items/${exerciseId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, exerciseId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.exercises.detail(exerciseId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space exercises
   * @param options - Mutation options
   */
  const useRefreshSpaceExercises = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/exercise`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.exercises.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific assignment
   * @param options - Mutation options
   */
  const useRefreshAssignment = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (assignmentId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, assignmentId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.detail(assignmentId),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh assignment for a specific student
   * @param options - Mutation options
   */
  const useRefreshAssignmentForStudent = (
    options?: UseMutationOptions<
      unknown,
      Error,
      { courseId: string; userId: string; assignmentId: string }
    >,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        courseId,
        userId,
        assignmentId,
      }: {
        courseId: string;
        userId: string;
        assignmentId: string;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/assignments/${assignmentId}/courses/${courseId}/students/${userId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.forStudent(
            variables.assignmentId,
            variables.courseId,
            variables.userId,
          ),
        });
      },
      ...options,
    });
  };

  /**
   * Refresh space assignments
   * @param options - Mutation options
   */
  const useRefreshSpaceAssignments = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (spaceId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.spacerRunUrl}/api/spacer/v1/spaces/${spaceId}/items/types/assignment`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, spaceId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assignments.bySpace(spaceId),
        });
      },
      ...options,
    });
  };

  /**
   * Clear cached items (mutation)
   * @param options - Mutation options
   */
  const useClearCachedItems = (
    options?: UseMutationOptions<void, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        // No API call, just clear cache
        return;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['items'] });
      },
      ...options,
    });
  };

  /**
   * Clear cached public items (mutation)
   * @param options - Mutation options
   */
  const useClearCachedPublicItems = (
    options?: UseMutationOptions<void, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        // No API call, just clear cache
        return;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.items.public() });
      },
      ...options,
    });
  };

  // ============================================================================
  // Invites, Contacts, Inbounds, Outbounds
  // ============================================================================

  /**
   * Request an invite (mutation)
   * @param options - Mutation options
   */
  const useRequestInvite = (
    options?: UseMutationOptions<
      unknown,
      Error,
      {
        firstName: string;
        lastName: string;
        email: string;
        socialUrl: string;
      }
    >,
  ) => {
    return useMutation({
      mutationFn: async ({
        firstName,
        lastName,
        email,
        socialUrl,
      }: {
        firstName: string;
        lastName: string;
        email: string;
        socialUrl: string;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/request`,
          method: 'POST',
          body: {
            first_name: firstName,
            last_name: lastName,
            email: email,
            social_url: socialUrl,
          },
        });
        return resp;
      },
      ...options,
    });
  };

  /**
   * Send an invite (mutation)
   * @param options - Mutation options
   */
  const useSendInvite = (
    options?: UseMutationOptions<
      unknown,
      Error,
      {
        email: string;
        firstName: string;
        lastName: string;
        message: string;
        brand: string;
      }
    >,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async ({
        email,
        firstName,
        lastName,
        message,
        brand,
      }: {
        email: string;
        firstName: string;
        lastName: string;
        message: string;
        brand: string;
      }) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites`,
          method: 'POST',
          body: {
            email,
            firstName,
            lastName,
            message,
            brand,
          },
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['invites'] });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific invite by token
   * @param options - Mutation options
   */
  const useRefreshInvite = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (token: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/tokens/${token}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, token) => {
        queryClient.invalidateQueries({ queryKey: ['invites', token] });
      },
      ...options,
    });
  };

  /**
   * Refresh invites for a user
   * @param options - Mutation options
   */
  const useRefreshInvites = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (accountId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/invites/users/${accountId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['invites'] });
      },
      ...options,
    });
  };

  /**
   * Clear cached invites (mutation)
   * @param options - Mutation options
   */
  const useClearCachedInvites = (
    options?: UseMutationOptions<void, Error, void>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async () => {
        // No API call, just clear cache
        return;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['invites'] });
      },
      ...options,
    });
  };

  /**
   * Refresh a specific contact
   * @param options - Mutation options
   */
  const useRefreshContact = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (contactId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/contacts/${contactId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, contactId) => {
        queryClient.invalidateQueries({
          queryKey: queryKeys.contacts.detail(contactId),
        });
      },
      ...options,
    });
  };

  /**
   * Get inbound by ID (query hook)
   * @param id - Inbound ID
   * @param options - Query options
   */
  const useInbound = (
    id: string,
    options?: UseQueryOptions<unknown, Error>,
  ) => {
    return useQuery({
      queryKey: ['inbounds', id],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds/${id}`,
          method: 'GET',
        });
        return resp;
      },
      ...options,
    });
  };

  /**
   * Get inbound by handle (query hook)
   * @param handle - Inbound handle
   * @param options - Query options
   */
  const useInboundByHandle = (
    handle: string,
    options?: UseQueryOptions<unknown, Error>,
  ) => {
    return useQuery({
      queryKey: ['inbounds', 'handle', handle],
      queryFn: async () => {
        const resp = await requestDatalayer({
          url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds/handles/${handle}`,
          method: 'GET',
        });
        return resp;
      },
      ...options,
    });
  };

  /**
   * Refresh inbound data
   * @param options - Mutation options
   */
  const useRefreshInbound = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (userId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.inboundsRunUrl}/api/inbounds/v1/inbounds/${userId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, userId) => {
        queryClient.invalidateQueries({ queryKey: ['inbounds', userId] });
        queryClient.invalidateQueries({ queryKey: ['inbounds', 'list'] });
      },
      ...options,
    });
  };

  /**
   * Refresh outbound data
   * @param options - Mutation options
   */
  const useRefreshOutbound = (
    options?: UseMutationOptions<unknown, Error, string>,
  ) => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: async (outboundId: string) => {
        const resp = await requestDatalayer({
          url: `${configuration.growthRunUrl}/api/growth/v1/outbounds/${outboundId}`,
          method: 'GET',
        });
        return resp;
      },
      onSuccess: (data, outboundId) => {
        queryClient.invalidateQueries({ queryKey: ['outbounds', outboundId] });
        queryClient.invalidateQueries({ queryKey: ['outbounds', 'list'] });
      },
      ...options,
    });
  };

  // ============================================================================
  // Return all methods grouped by category
  // ============================================================================

  return {
    // Authentication & Profile
    useLogin,
    useLogout,
    useMe,
    useUpdateMe,
    useWhoami,
    useChangePassword,
    useRequestEmailUpdate,
    useConfirmEmailUpdate,
    useRequestJoin,
    useRequestJoinToken,
    useJoinWithInvite,
    useConfirmJoinWithToken,
    useCreateTokenForPasswordChange,
    useConfirmPasswordWithToken,
    useOAuth2AuthorizationURL,
    useOAuth2AuthorizationLinkURL,
    useGetGitHubProfile,
    useGetLinkedinProfile,
    usePostLinkedinShare,
    usePostLinkedinShareWithUpload,
    useRegisterToWaitingList,

    // Proxy
    useProxyGET,
    useProxyPOST,
    useProxyPUT,

    // Users
    useUser,
    useUserByHandle,
    useSearchUsers,
    useUpdateUserOnboarding,
    useUpdateUserSettings,
    useRefreshUser,
    useUserCredits,
    useUpdateUserCredits,
    useAssignRoleToUser,
    useUnassignRoleFromUser,
    useUpdateUserCreditsQuota,
    useUsages,
    useUsagesForUser,
    usePlatformUsages,

    // Organizations
    useOrganization,
    useOrganizationByHandle,
    useUserOrganizations,
    useCreateOrganization,
    useUpdateOrganization,
    useAddMemberToOrganization,
    useRemoveMemberFromOrganization,
    useAddRoleToOrganizationMember,
    useRemoveRoleFromOrganizationMember,
    useRefreshOrganization,
    useRefreshUserOrganizations,
    useUserOrganizationById,
    useClearCachedOrganizations,

    // Teams
    useTeam,
    useTeamByHandle,
    useTeamsByOrganization,
    useCreateTeam,
    useUpdateTeam,
    useAddMemberToTeam,
    useRemoveMemberFromTeam,
    useAddRoleToTeamMember,
    useRemoveRoleFromTeamMember,
    useRefreshTeam,
    useRefreshTeams,
    useClearCachedTeams,

    // Schools
    useSchools,
    useRefreshSchools,

    // Spaces
    useSpace,
    useOrganizationSpace,
    useOrganizationSpaceByHandle,
    useOrganizationSpaces,
    useUserSpace,
    useUserSpaceByHandle,
    useUserSpaces,
    useCreateSpace,
    useUpdateSpace,
    useUpdateOrganizationSpace,
    useAddMemberToOrganizationSpace,
    useRemoveMemberFromOrganizationSpace,
    useMakeSpacePublic,
    useMakeSpacePrivate,
    useRefreshOrganizationSpace,
    useRefreshOrganizationSpaces,
    useRefreshUserSpaces,
    useRefreshUserSpace,
    useRefreshLayout,
    useExportSpace,

    // Agent Spaces
    useAgentSpace,
    useAgentSpaces,
    usePublicAgentSpaces,
    useCreateAgentSpace,
    useUpdateAgentSpace,
    useDeleteAgentSpace,
    useMakeAgentSpacePublic,
    useMakeAgentSpacePrivate,
    useRefreshAgentSpace,
    useRefreshAgentSpaces,
    useRefreshPublicAgentSpaces,

    // Courses
    useCourse,
    useUpdateCourse,
    usePublicCourses,
    useInstructorCourses,
    useCourseEnrollments,
    useEnrollStudentToCourse,
    useRemoveStudentFromCourse,
    useStudent,
    useConfirmCourseItemCompletion,
    useSetCourseItems,
    useRefreshCourse,
    useRefreshPublicCourses,
    useRefreshInstructorCourses,
    useRefreshCoursesEnrollments,
    useRefreshStudent,

    // Notebooks
    useNotebook,
    useNotebooksBySpace,
    useCreateNotebook,
    useUpdateNotebook,
    useUpdateNotebookModel,
    useCloneNotebook,
    useRefreshNotebook,
    useRefreshSpaceNotebooks,

    // Documents
    useDocument,
    useDocumentsBySpace,
    useCreateDocument,
    useUpdateDocument,
    useUpdateDocumentModel,
    useCloneDocument,
    useRefreshDocument,
    useRefreshSpaceDocuments,

    // Cells
    useCell,
    useCellsBySpace,
    useUpdateCell,
    useCloneCell,
    useRefreshCell,
    useRefreshSpaceCells,

    // Datasets
    useDataset,
    useDatasetsBySpace,
    useUpdateDataset,
    useRefreshDataset,
    useRefreshSpaceDatasets,

    // Environments
    useEnvironment,
    useEnvironmentsBySpace,
    useRefreshEnvironment,
    useRefreshSpaceEnvironments,

    // Lessons
    useLesson,
    useLessonsBySpace,
    useCloneLesson,
    useRefreshLesson,
    useRefreshSpaceLessons,

    // Exercises
    useExercise,
    useExercisesBySpace,
    useUpdateExercise,
    useCloneExercise,
    useUpdateExercisePoints,
    useRefreshExercise,
    useRefreshSpaceExercises,

    // Assignments
    useAssignment,
    useAssignmentsBySpace,
    useCloneAssignment,
    useAssignmentForStudent,
    useAssignmentStudentVersion,
    useGradeAssignmentForStudent,
    useResetAssignmentForStudent,
    useRefreshAssignment,
    useRefreshAssignmentForStudent,
    useRefreshSpaceAssignments,

    // Items (Generic)
    useDeleteItem,
    useSpaceItems,
    useMakeItemPublic,
    useMakeItemPrivate,
    useSearchPublicItems,
    usePublicItems,
    useRefreshPublicItems,
    useRefreshSpaceItems,
    useClearCachedPublicItems,
    useClearCachedItems,

    // Pages
    usePage,
    usePages,
    useCreatePage,
    useUpdatePage,
    useDeletePage,

    // Datasources
    useDatasource,
    useDatasources,
    useCreateDatasource,
    useUpdateDatasource,

    // Secrets
    useSecret,
    useSecrets,
    useCreateSecret,
    useUpdateSecret,
    useDeleteSecret,

    // Tokens
    useToken,
    useTokens,
    useCreateToken,
    useUpdateToken,

    // Invites
    useInvite,
    useInvitesByUser,
    usePutInvite,
    useRequestInvite,
    useSendInvite,
    useRefreshInvite,
    useRefreshInvites,
    useClearCachedInvites,

    // Contacts
    useContact,
    useContactByHandle,
    useSearchContacts,
    useCreateContact,
    useUpdateContact,
    useDeleteContact,
    useAssignTagToContact,
    useUnassignTagFromContact,
    useSendInviteToContact,
    useEnrichContactEmail,
    useEnrichContactLinkedin,
    useSendLinkedinConnectionRequest,
    useLinkUserWithContact,
    useUnlinkUserFromContact,
    useRefreshContact,

    // Inbounds
    useInbounds,
    useInbound,
    useInboundByHandle,
    useRefreshInbound,

    // Outbounds
    useOutbound,
    useOutbounds,
    useDraftBulkEmailsOutbounds,
    useTryBulkEmailsOutbounds,
    useLaunchBulkEmailsOutbounds,
    useSendOutboundEmailToUser,
    useDeleteOutbound,
    useSubscribeUserToOutbounds,
    useUnsubscribeUserFromOutbounds,
    useUnsubscribeContactFromOutbounds,
    useUnsubscribeInviteeFromOutbounds,
    useRefreshOutbound,

    // MFA
    useEnableUserMFA,
    useDisableUserMFA,
    useValidateUserMFACode,

    // Checkout & Credits
    useCreateCheckoutSession,
    useBurnCredit,
    useStripePrices,

    // Support & Growth
    useRequestPlatformSupport,
    useRequestPlatformSupport2,
    useUserSurveys,
    useGrowthKPI,

    // Query keys for manual operations
    queryKeys,

    // Upload
    notebookUploadLoading,
    notebookUploadProgress,
    resetNotebookUpload,
    documentUploadLoading,
    documentUploadProgress,
    resetDocumentUpload,
  };
};

export default useCache;
