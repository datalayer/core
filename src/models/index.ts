/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

/**
 * Models definitions for all Datalayer API services.
 *
 * This module consolidates all type definitions used by the SDK, providing
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

export * from './AIAgent';
export * from './Base';
export * from './Assignment';
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
export * from './Credits2';
export * from './Datasource';
export * from './Dataset';
export * from './Dean';
export * from './Document';
export * from './Environment';
export * from './Errors';
export * from './Exercise';
export * from './GrowthKPI';
export * from './IAM';
export * from './IAMProviderLinked';
export * from './IAMProviderPost';
export * from './IAMProvidersSpecs';
export * from './IAMProviderUsers';
export * from './Instructor';
export * from './IAMToken';
export * from './Inbound';
export * from './Invite';
export * from './Item';
export * from './ItemType';
export * from './LandingRoles';
export * from './Lesson';
export * from './Library';
export * from './Member';
export * from './Notebook';
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
export * from './Runtime2';
export * from './RuntimeSnapshot';
export * from './School';
export * from './Secret';
export * from './Space';
export * from './Space2';
export * from './SpaceItem';
export * from './Environment2';
export * from './Item2';
export * from './Lexical2';
export * from './Notebook2';
export * from './Runtime3';
export * from './RuntimeSnapshot2';
export * from './Space3';
export * from './SpaceMember';
export * from './Student';
export * from './StudentItem';
export * from './Survey';
export * from './Team';
export * from './TeamMember';
export * from './URN';
export * from './Usage';
export * from './User';
export * from './User3';
export * from './UserEvent';
export * from './UserOnboarding';
export * from './UserSettings';
export * from './WaitingListFormData';
