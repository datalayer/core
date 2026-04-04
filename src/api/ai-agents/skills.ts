/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Skills API functions for agent-runtimes.
 *
 * Provides functions for listing and retrieving available agent skills.
 *
 * @module api/ai-agents/skills
 */

import { requestDatalayerAPI } from '../DatalayerApi';
import { API_BASE_PATHS, DEFAULT_SERVICE_URLS } from '../constants';
import { validateToken, validateRequiredString } from '../utils/validation';
import type { SkillInfo, SkillsResponse } from './types';

/**
 * List available skills.
 * @param token - Authentication token
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Skills list with total count
 */
export const listSkills = async (
  token: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<SkillsResponse> => {
  validateToken(token);

  return requestDatalayerAPI<SkillsResponse>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/skills`,
    method: 'GET',
    token,
  });
};

/**
 * Get a specific skill by ID.
 * @param token - Authentication token
 * @param skillId - Skill identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Skill details
 */
export const getSkill = async (
  token: string,
  skillId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<SkillInfo> => {
  validateToken(token);
  validateRequiredString(skillId, 'skillId');

  return requestDatalayerAPI<SkillInfo>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/skills/${encodeURIComponent(skillId)}`,
    method: 'GET',
    token,
  });
};

/**
 * Get skill content/implementation.
 * @param token - Authentication token
 * @param skillId - Skill identifier
 * @param baseUrl - Base URL for the agent-runtimes service
 * @returns Skill content
 */
export const getSkillContent = async (
  token: string,
  skillId: string,
  baseUrl: string = DEFAULT_SERVICE_URLS.AI_AGENTS,
): Promise<Record<string, any>> => {
  validateToken(token);
  validateRequiredString(skillId, 'skillId');

  return requestDatalayerAPI<Record<string, any>>({
    url: `${baseUrl}${API_BASE_PATHS.AI_AGENTS}/skills/${encodeURIComponent(skillId)}/content`,
    method: 'GET',
    token,
  });
};
