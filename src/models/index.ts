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

export * from './Base';
export * from './Common';
export * from './Contact';
export * from './ContactEvent';
export * from './ContactIAMProvider';
export * from './ContactTags';
export * from './Credits';
export * from './CreditsDTO';
export * from './Dean';
export * from './Errors';
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
export * from './LandingRoles';
export * from './McpAuditEvent';
export * from './McpBinding';
export * from './McpPolicy';
export * from './McpTask';
export * from './Member';
export * from './Organization';
export * from './OrganizationMember';
export * from './Outbound';
export * from './Profile';
export * from './Role';
export * from './RolesOrganization';
export * from './RolesPlatform';
export * from './RolesTeam';
export * from './School';
export * from './Secret';
export * from './Student';
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
