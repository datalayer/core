/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { create } from 'zustand';
import type { Session } from '@jupyterlab/services';
import type { IKernelConnection } from '@jupyterlab/services/lib/kernel/kernel';

/**
 * Per-project runtime state tracked in memory.
 *
 * This is **not** persisted — it represents live runtime objects
 * (kernel connections, sessions) that only exist while the project
 * view is mounted.
 */
export type ProjectRuntimeEntry = {
  /** The Jupyter session connection (notebook ↔ kernel bridge). */
  sessionConnection?: Session.ISessionConnection;
  /** The assigned agent pod name (mirrors project.attachedAgentPodName). */
  agentPodName?: string;
  /** Display name of the assigned agent. */
  agentName?: string;
  /** Agent runtime status (running, starting, terminated, etc.). */
  agentStatus?: string;
  /** The agent spec ID used to create the runtime. */
  agentSpecId?: string;
};

export type ProjectStoreState = {
  /** Map of projectId → runtime entry. */
  projects: Record<string, ProjectRuntimeEntry>;

  /** The currently active/viewed project ID (for sidebar highlighting). */
  currentProjectId: string | undefined;

  // ---- Mutators ----

  /** Set the currently active project (call on mount, clear on unmount). */
  setCurrentProjectId: (projectId: string | undefined) => void;

  /** Set or update the session connection for a project. */
  setSessionConnection: (
    projectId: string,
    sessionConnection: Session.ISessionConnection | undefined,
  ) => void;

  /** Set the assigned agent info for a project. */
  setAgent: (
    projectId: string,
    agentPodName: string | undefined,
    agentName?: string,
    agentStatus?: string,
    agentSpecId?: string,
  ) => void;

  /** Remove all runtime state for a project (e.g. on unmount). */
  clearProject: (projectId: string) => void;

  // ---- Selectors ----

  /** Get the kernel connection for a project, or undefined. */
  getKernel: (projectId: string) => IKernelConnection | null | undefined;

  /** Get the full entry for a project. */
  getEntry: (projectId: string) => ProjectRuntimeEntry | undefined;
};

/**
 * Zustand store for per-project runtime state (kernel connections, agents).
 *
 * Not persisted — the data is ephemeral and only valid while the project
 * component is mounted and a kernel/agent is active.
 *
 * Usage:
 * ```ts
 * import { useProjectStore } from '@datalayer/core/lib/hooks';
 *
 * // In Project.tsx — store session when Notebook connects:
 * const setSessionConnection = useProjectStore(s => s.setSessionConnection);
 * <Notebook onSessionConnection={sc => setSessionConnection(projectId, sc)} />
 *
 * // Anywhere — read the kernel for a project:
 * const kernel = useProjectStore(s => s.getKernel(projectId));
 * ```
 */
export const useProjectStore = create<ProjectStoreState>()((set, get) => ({
  projects: {},
  currentProjectId: undefined,

  setCurrentProjectId: projectId => set({ currentProjectId: projectId }),

  setSessionConnection: (projectId, sessionConnection) =>
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          sessionConnection,
        },
      },
    })),

  setAgent: (projectId, agentPodName, agentName, agentStatus, agentSpecId) =>
    set(state => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          agentPodName,
          agentName,
          // When removing the agent, also clear the status.
          // When setting, use provided status or preserve existing.
          agentStatus:
            agentPodName !== undefined
              ? (agentStatus ?? state.projects[projectId]?.agentStatus)
              : undefined,
          agentSpecId:
            agentPodName !== undefined
              ? (agentSpecId ?? state.projects[projectId]?.agentSpecId)
              : undefined,
        },
      },
    })),

  clearProject: projectId =>
    set(state => {
      const { [projectId]: _, ...rest } = state.projects;
      return { projects: rest };
    }),

  getKernel: projectId => {
    const entry = get().projects[projectId];
    return entry?.sessionConnection?.kernel;
  },

  getEntry: projectId => get().projects[projectId],
}));
