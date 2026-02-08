/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Models definitions for all Datalayer API services.
 *
 * This module consolidates all type definitions used by the Client, providing
 * comprehensive TypeScript support for requests, responses, and data models
 * across all Datalayer services.
 *
 * These types follow the exact backend API format (snake_case naming) to
 * ensure compatibility. For frontend business logic types with camelCase
 * naming, see the models in `/src/models/`.
 *
 * @example
 * ```typescript
 * import type {
 *   Runtime,
 *   Environment,
 *   Space,
 *   Notebook,
 *   User,
 *   LoginRequest
 * } from '@datalayer/core/api/types';
 *
 * // Use types for function parameters and return values
 * function createRuntime(config: CreateRuntimeRequest): Promise<Runtime> {
 *   // Implementation
 * }
 * ```
 *
 * @module models
 */

export * from './Assignment';
export * from './Base';
export * from './Cell';
export * from './CodeBlock';
export * from './CodefeedBlocks';
export * from './Common';
export * from './Contact';
export * from './ContactEvent';
export * from './ContactIAMProvider';
export * from './ContactTags';
export * from './Content';
export * from './Course';
export * from './Credits';
export * from './CreditsDTO';
export * from './Dataset';
export * from './Datasource';
export * from './Dean';
export * from './Document';
export * from './Environment';
export * from './EnvironmentDTO';
export * from './Errors';
export * from './Exercise';
export * from './GrowthKPI';
export * from './IAM';
export * from './IAMProviderLinked';
export * from './IAMProviderPost';
export * from './IAMProviderUsers';
export * from './IAMProvidersSpecs';
export * from './IAMToken';
export * from './Inbound';
export * from './Instructor';
export * from './Invite';
export * from './Item';
export * from './ItemDTO';
export * from './ItemType';
export * from './LandingRoles';
export * from './Lesson';
export * from './LexicalDTO';
export * from './Library';
export * from './Member';
export * from './Notebook';
export * from './NotebookDTO';
export * from './Organization';
export * from './OrganizationMember';
export * from './Outbound';
export * from './Page';
export * from './PageTag';
export * from './Profile';
export * from './Role';
export * from './RolesOrganization';
export * from './RolesPlatform';
export * from './RolesTeam';
export * from './Runtime';
export * from './RuntimeDTO';
export * from './RuntimeSnapshot';
export * from './RuntimeSnapshotDTO';
export * from './School';
export * from './Secret';
export * from './Space';
export * from './SpaceDTO';
export * from './SpaceItem';
export * from './SpaceMember';
export * from './Student';
export * from './StudentItem';
export * from './Survey';
export * from './Team';
export * from './TeamMember';
export * from './URN';
export * from './Usage';
export * from './User';
export * from './UserDTO';
export * from './UserEvent';
export * from './UserOnboarding';
export * from './UserSettings';
export * from './WaitingListFormData';
