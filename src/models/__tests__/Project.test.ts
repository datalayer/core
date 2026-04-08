/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ProjectDTO } from '../../models/ProjectDTO';
import type { SpaceData } from '../../models/SpaceDTO';

describe('Project Model', () => {
  const mockProjectData: SpaceData = {
    uid: 'proj-uid-123',
    id: 'proj-id-456',
    name_t: 'My Research Project',
    handle_s: 'my-research-project',
    variant_s: 'project',
    description_t: 'A research project with agent support',
    public_b: false,
    creation_ts_dt: '2025-01-15T10:30:00Z',
    attached_agent_pod_name_s: 'agent-pod-abc',
    attached_agent_spec_id_s: 'data-acquisition',
  };

  const mockProjectDataNoAgent: SpaceData = {
    uid: 'proj-uid-789',
    name_t: 'Simple Project',
    handle_s: 'simple-project',
    variant_s: 'project',
    description_t: 'A project without an agent',
  };

  let project: ProjectDTO;
  let projectNoAgent: ProjectDTO;

  beforeEach(() => {
    project = new ProjectDTO(mockProjectData);
    projectNoAgent = new ProjectDTO(mockProjectDataNoAgent);
  });

  describe('Properties', () => {
    it('should return uid', () => {
      expect(project.uid).toBe('proj-uid-123');
    });

    it('should return id', () => {
      expect(project.id).toBe('proj-id-456');
    });

    it('should fall back to uid when id is not available', () => {
      expect(projectNoAgent.id).toBe('proj-uid-789');
    });

    it('should return name', () => {
      expect(project.name).toBe('My Research Project');
    });

    it('should return handle', () => {
      expect(project.handle).toBe('my-research-project');
    });

    it('should return variant', () => {
      expect(project.variant).toBe('project');
    });

    it('should return description', () => {
      expect(project.description).toBe('A research project with agent support');
    });

    it('should return attachedAgentPodName', () => {
      expect(project.attachedAgentPodName).toBe('agent-pod-abc');
    });

    it('should return undefined for attachedAgentPodName when not set', () => {
      expect(projectNoAgent.attachedAgentPodName).toBeUndefined();
    });

    it('should return attachedAgentSpecId', () => {
      expect(project.attachedAgentSpecId).toBe('data-acquisition');
    });

    it('should return undefined for attachedAgentSpecId when not set', () => {
      expect(projectNoAgent.attachedAgentSpecId).toBeUndefined();
    });

    it('should return isPublic', () => {
      expect(project.isPublic).toBe(false);
    });

    it('should default isPublic to false', () => {
      expect(projectNoAgent.isPublic).toBe(false);
    });

    it('should return createdAt as Date', () => {
      expect(project.createdAt).toBeInstanceOf(Date);
      expect(project.createdAt.toISOString()).toBe('2025-01-15T10:30:00.000Z');
    });

    it('should default createdAt when not available', () => {
      expect(projectNoAgent.createdAt).toBeInstanceOf(Date);
    });

    it('should return hasAgent true when agent is attached', () => {
      expect(project.hasAgent).toBe(true);
    });

    it('should return hasAgent false when no agent', () => {
      expect(projectNoAgent.hasAgent).toBe(false);
    });
  });

  describe('toJSON', () => {
    it('should return project data in camelCase format', () => {
      const json = project.toJSON();

      expect(json.uid).toBe('proj-uid-123');
      expect(json.id).toBe('proj-id-456');
      expect(json.name).toBe('My Research Project');
      expect(json.handle).toBe('my-research-project');
      expect(json.variant).toBe('project');
      expect(json.description).toBe('A research project with agent support');
      expect(json.isPublic).toBe(false);
      expect(json.createdAt).toBe('2025-01-15T10:30:00.000Z');
      expect(json.attachedAgentPodName).toBe('agent-pod-abc');
      expect(json.attachedAgentSpecId).toBe('data-acquisition');
      expect(json.hasAgent).toBe(true);
    });

    it('should handle project without agent in toJSON', () => {
      const json = projectNoAgent.toJSON();

      expect(json.attachedAgentPodName).toBeNull();
      expect(json.attachedAgentSpecId).toBeNull();
      expect(json.hasAgent).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return string representation', () => {
      expect(project.toString()).toBe(
        'Project(proj-uid-123, My Research Project)',
      );
    });
  });

  describe('deletion state', () => {
    it('should track deletion state', () => {
      expect(project.isDeleted).toBe(false);
      project.markDeleted();
      expect(project.isDeleted).toBe(true);
    });

    it('should throw on access after deletion', () => {
      project.markDeleted();
      expect(() => project.uid).toThrow('has been deleted');
      expect(() => project.toJSON()).toThrow('has been deleted');
    });
  });

  describe('rawData', () => {
    it('should return raw space data', () => {
      const raw = project.rawData();
      expect(raw.uid).toBe('proj-uid-123');
      expect(raw.attached_agent_pod_name_s).toBe('agent-pod-abc');
    });
  });
});
