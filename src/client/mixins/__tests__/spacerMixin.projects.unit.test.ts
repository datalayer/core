/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as spaces from '../../../api/spacer/spaces';
import * as notebooks from '../../../api/spacer/notebooks';
import * as lexicals from '../../../api/spacer/lexicals';
import { SpacerMixin } from '../SpacerMixin';
import { ProjectDTO } from '../../../models/ProjectDTO';
import { SpaceDTO } from '../../../models/SpaceDTO';
import { NotebookDTO } from '../../../models/NotebookDTO';
import { LexicalDTO } from '../../../models/LexicalDTO';

vi.mock('../../../api/spacer/spaces');
vi.mock('../../../api/spacer/notebooks');
vi.mock('../../../api/spacer/lexicals');
vi.mock('../../../api/spacer/users');
vi.mock('../../../api/spacer/documents');
vi.mock('../../../api/spacer/items');

// Create a minimal base class for the mixin
class MockBase {
  getToken() {
    return 'mock-token';
  }
  getSpacerRunUrl() {
    return 'https://spacer.example.com';
  }
}

const MixedClass = SpacerMixin(MockBase);

describe('SpacerMixin - Project Methods', () => {
  let instance: InstanceType<typeof MixedClass>;

  const mockProjectSpace = {
    uid: 'proj-uid-123',
    id: 'proj-id-456',
    name_t: 'Test Project',
    handle_s: 'test-project',
    variant_s: 'project',
    description_t: 'A test project',
    public_b: false,
    attached_agent_pod_name_s: '',
    attached_agent_spec_id_s: '',
  };

  beforeEach(() => {
    instance = new MixedClass();
    vi.clearAllMocks();
  });

  describe('getProjects', () => {
    it('should fetch projects by type', async () => {
      vi.mocked(spaces.getSpacesByType).mockResolvedValue({
        success: true,
        message: 'OK',
        spaces: [mockProjectSpace],
      });

      const projects = await instance.getProjects();

      expect(spaces.getSpacesByType).toHaveBeenCalledWith(
        'mock-token',
        'project',
        'https://spacer.example.com',
      );
      expect(projects).toHaveLength(1);
      expect(projects[0]).toBeInstanceOf(ProjectDTO);
      expect(projects[0].name).toBe('Test Project');
    });
  });

  describe('getProject', () => {
    it('should fetch a project by UID', async () => {
      vi.mocked(spaces.getSpace).mockResolvedValue({
        success: true,
        message: 'OK',
        space: mockProjectSpace,
      });

      const project = await instance.getProject('proj-uid-123');

      expect(spaces.getSpace).toHaveBeenCalledWith(
        'mock-token',
        'proj-uid-123',
        'https://spacer.example.com',
      );
      expect(project).toBeInstanceOf(ProjectDTO);
      expect(project.uid).toBe('proj-uid-123');
    });

    it('should throw when project not found', async () => {
      vi.mocked(spaces.getSpace).mockResolvedValue({
        success: true,
        message: 'Not found',
        space: undefined,
      });

      await expect(instance.getProject('nonexistent')).rejects.toThrow(
        "Project with UID 'nonexistent' not found",
      );
    });
  });

  describe('createProject', () => {
    it('should create a project with variant "project"', async () => {
      vi.mocked(spaces.createSpace).mockResolvedValue({
        success: true,
        message: 'Created',
        space: mockProjectSpace,
      });

      const project = await instance.createProject('Test Project', 'A test');

      expect(spaces.createSpace).toHaveBeenCalledWith(
        'mock-token',
        expect.objectContaining({
          name: 'Test Project',
          description: 'A test',
          variant: 'project',
          spaceHandle: 'test-project',
          public: false,
        }),
        'https://spacer.example.com',
      );
      expect(project).toBeInstanceOf(ProjectDTO);
    });
  });

  describe('renameProject', () => {
    it('should rename a project', async () => {
      vi.mocked(spaces.updateSpace).mockResolvedValue({
        success: true,
        message: 'Updated',
        space: { ...mockProjectSpace, name_t: 'New Name' },
      });

      const project = await instance.renameProject('proj-uid-123', 'New Name');

      expect(spaces.updateSpace).toHaveBeenCalledWith(
        'mock-token',
        'proj-uid-123',
        { name: 'New Name' },
        'https://spacer.example.com',
      );
      expect(project.name).toBe('New Name');
    });
  });

  describe('assignAgent', () => {
    it('should assign an agent with correct Solr fields', async () => {
      vi.mocked(spaces.updateSpace).mockResolvedValue({
        success: true,
        message: 'Updated',
        space: {
          ...mockProjectSpace,
          attached_agent_pod_name_s: 'agent-pod-abc',
          attached_agent_spec_id_s: 'data-acquisition',
        },
      });

      const project = await instance.assignAgent(
        'proj-uid-123',
        'agent-pod-abc',
        'data-acquisition',
      );

      expect(spaces.updateSpace).toHaveBeenCalledWith(
        'mock-token',
        'proj-uid-123',
        {
          attached_agent_pod_name_s: 'agent-pod-abc',
          attached_agent_spec_id_s: 'data-acquisition',
        },
        'https://spacer.example.com',
      );
      expect(project.hasAgent).toBe(true);
      expect(project.attachedAgentPodName).toBe('agent-pod-abc');
    });
  });

  describe('unassignAgent', () => {
    it('should clear agent fields', async () => {
      vi.mocked(spaces.updateSpace).mockResolvedValue({
        success: true,
        message: 'Updated',
        space: mockProjectSpace,
      });

      const project = await instance.unassignAgent('proj-uid-123');

      expect(spaces.updateSpace).toHaveBeenCalledWith(
        'mock-token',
        'proj-uid-123',
        {
          attached_agent_pod_name_s: '',
          attached_agent_spec_id_s: '',
        },
        'https://spacer.example.com',
      );
      expect(project.hasAgent).toBe(false);
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      vi.mocked(spaces.deleteSpace).mockResolvedValue({
        success: true,
        message: 'Deleted',
      });

      await instance.deleteProject('proj-uid-123');

      expect(spaces.deleteSpace).toHaveBeenCalledWith(
        'mock-token',
        'proj-uid-123',
        'https://spacer.example.com',
      );
    });
  });

  describe('getProjectDefaultItems', () => {
    it('should return default notebook and document UIDs', async () => {
      vi.mocked(spaces.getSpaceDefaultItems).mockResolvedValue({
        success: true,
        message: 'OK',
        default_notebook_uid: 'nb-uid-1',
        default_document_uid: 'doc-uid-2',
      });

      const items = await instance.getProjectDefaultItems('proj-uid-123');

      expect(items).toEqual({
        defaultNotebookUid: 'nb-uid-1',
        defaultDocumentUid: 'doc-uid-2',
      });
    });
  });
});

describe('SpacerMixin - Space Methods', () => {
  let instance: InstanceType<typeof MixedClass>;

  const mockSpaceData = {
    uid: 'space-uid-1',
    name_t: 'Test Space',
    handle_s: 'test-space',
    variant_s: 'default',
    description_t: 'A test space',
  };

  beforeEach(() => {
    instance = new MixedClass();
    vi.clearAllMocks();
  });

  describe('getSpace', () => {
    it('should fetch a space by UID', async () => {
      vi.mocked(spaces.getSpace).mockResolvedValue({
        success: true,
        message: 'OK',
        space: mockSpaceData,
      });

      const space = await instance.getSpace('space-uid-1');

      expect(space).toBeInstanceOf(SpaceDTO);
      expect(space.uid).toBe('space-uid-1');
    });
  });

  describe('updateSpace', () => {
    it('should update a space', async () => {
      vi.mocked(spaces.updateSpace).mockResolvedValue({
        success: true,
        message: 'Updated',
        space: { ...mockSpaceData, name_t: 'Updated' },
      });

      const space = await instance.updateSpace('space-uid-1', {
        name: 'Updated',
      });

      expect(space).toBeInstanceOf(SpaceDTO);
      expect(space.name).toBe('Updated');
    });
  });

  describe('deleteSpace', () => {
    it('should delete a space', async () => {
      vi.mocked(spaces.deleteSpace).mockResolvedValue({
        success: true,
        message: 'Deleted',
      });

      await instance.deleteSpace('space-uid-1');

      expect(spaces.deleteSpace).toHaveBeenCalledWith(
        'mock-token',
        'space-uid-1',
        'https://spacer.example.com',
      );
    });
  });

  describe('cloneNotebook', () => {
    it('should clone a notebook', async () => {
      vi.mocked(notebooks.cloneNotebook).mockResolvedValue({
        success: true,
        message: 'Cloned',
        notebook: { uid: 'nb-clone', name: 'Cloned Notebook' },
      } as any);

      const nb = await instance.cloneNotebook('nb-original');

      expect(nb).toBeInstanceOf(NotebookDTO);
      expect(notebooks.cloneNotebook).toHaveBeenCalledWith(
        'mock-token',
        'nb-original',
        'https://spacer.example.com',
      );
    });
  });

  describe('cloneLexical', () => {
    it('should clone a lexical document', async () => {
      vi.mocked(lexicals.cloneLexical).mockResolvedValue({
        success: true,
        message: 'Cloned',
        document: { uid: 'doc-clone', name: 'Cloned Doc' },
      } as any);

      const doc = await instance.cloneLexical('doc-original');

      expect(doc).toBeInstanceOf(LexicalDTO);
      expect(lexicals.cloneLexical).toHaveBeenCalledWith(
        'mock-token',
        'doc-original',
        'https://spacer.example.com',
      );
    });
  });
});
