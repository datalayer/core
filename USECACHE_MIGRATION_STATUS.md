# useCache → useCache2 Migration Status

## Overview

This document tracks the migration status from `useCache` to `useCache2` using TanStack Query.

## Export Organization

Both `useCache` and `useCache2` now have identically grouped exports for easy comparison:

### Categories (in order)
1. **Authentication & Profile** - Login, profile, OAuth, etc.
2. **Proxy** - HTTP proxy methods
3. **Users** - User management
4. **Organizations** - Organization management
5. **Teams** - Team management
6. **Schools** - School management
7. **Spaces** - Space management
8. **Courses** - Course management
9. **Notebooks** - Notebook management
10. **Documents** - Document management
11. **Cells** - Cell management
12. **Datasets** - Dataset management
13. **Environments** - Environment management
14. **Lessons** - Lesson management
15. **Exercises** - Exercise management
16. **Assignments** - Assignment management
17. **Items (Generic)** - Generic item operations
18. **Pages** - Page management
19. **Datasources** - Datasource management
20. **Secrets** - Secret management
21. **Tokens** - Token management
22. **Invites** - Invite management
23. **Contacts** - Contact management
24. **Inbounds** - Inbound management
25. **Outbounds** - Outbound management
26. **MFA** - Multi-factor authentication
27. **Checkout & Credits** - Payment and credits
28. **Support & Growth** - Support and analytics
29. **Cache Management** - Cache control
30. **Upload** - File upload utilities

## Implementation Status

### ✅ Fully Implemented (60 methods)

#### Authentication & Profile (5/23)
- ✅ `login`
- ✅ `logout`
- ✅ `getMe`
- ✅ `updateMe`
- ✅ `whoami`

#### Users (5/14)
- ✅ `getUser`
- ✅ `getUserByHandle`
- ✅ `searchUsers`
- ✅ `updateUserOnboarding`
- ✅ `updateUserSettings`

#### Organizations (5/14)
- ✅ `getOrganizationById`
- ✅ `getOrganizationByHandle`
- ✅ `getUserOrganizations`
- ✅ `createOrganization`
- ✅ `updateOrganization`

#### Teams (4/11)
- ✅ `getTeamById`
- ✅ `getTeamsByOrganizationId`
- ✅ `createTeam`
- ✅ `updateTeam`

#### Spaces (6/21)
- ✅ `getOrganizationSpace`
- ✅ `getOrganizationSpaceWithOrg` (useOrganizationSpace)
- ✅ `getOrganizationSpaces`
- ✅ `getUserSpaces`
- ✅ `createSpace`
- ✅ `updateSpace`

#### Notebooks (6/9)
- ✅ `getNotebook`
- ✅ `getSpaceNotebooks`
- ✅ `createNotebook`
- ✅ `updateNotebook`
- ✅ `updateNotebookModel`
- ✅ `cloneNotebook`

#### Documents (5/8)
- ✅ `getDocument`
- ✅ `getSpaceDocuments`
- ✅ `updateDocument`
- ✅ `updateDocumentModel`
- ✅ `cloneDocument`

#### Pages (5/8)
- ✅ `getPage`
- ✅ `getPages`
- ✅ `createPage`
- ✅ `updatePage`
- ✅ `deletePage`

#### Datasources (2/7)
- ✅ `getDatasources`
- ✅ `createDatasource`

#### Secrets (3/7)
- ✅ `getSecrets`
- ✅ `createSecret`
- ✅ `deleteSecret`

#### Tokens (2/6)
- ✅ `getTokens`
- ✅ `createToken`

#### Contacts (5/13)
- ✅ `getContactById`
- ✅ `searchContacts`
- ✅ `createContact`
- ✅ `updateContact`
- ✅ `deleteContact`

#### Items (Generic) (1/9)
- ✅ `deleteItem`

#### Upload (3/3)
- ✅ `notebookUploadLoading`
- ✅ `notebookUploadProgress`
- ✅ `resetNotebookUpload`

#### Query Keys (1/1)
- ✅ `queryKeys` - TanStack Query key factories

**Total Implemented: 60/252 methods (24%)**

### ❌ Not Yet Implemented (192 methods)

#### Authentication & Profile (18 missing)
- ❌ `requestJoin`, `requestJoinToken`, `joinWithInvite`
- ❌ `confirmJoinWithToken`, `changePassword`, `createTokenForPasswordChange`
- ❌ `confirmPassworkWithToken`, `requestEmailUpdate`, `confirmEmailUpdate`
- ❌ `getOAuth2AuthorizationURL`, `getOAuth2AuthorizationLinkURL`
- ❌ `getGitHubProfile`, `getLinkedinProfile`
- ❌ `postLinkedinShare`, `postLinkedinShareWithUpload`
- ❌ `registerToWaitingList`

#### Proxy (3 missing)
- ❌ `proxyGET`, `proxyPOST`, `proxyPUT`

#### Users (9 missing)
- ❌ `refreshUser`, `assignRoleToUser`, `unassignRoleFromUser`
- ❌ `getUserCredits`, `updateUserCredits`, `updateUserCreditsQuota`
- ❌ `getUserSurveys`, `getUsages`, `getUsagesForUser`

#### Organizations (9 missing)
- ❌ `getUserOrganizationById`, `refreshOrganization`, `refreshUserOrganizations`
- ❌ `addMemberToOrganization`, `removeMemberFromOrganization`
- ❌ `addRoleToOrganizationMember`, `removeRoleFromOrganizationMember`
- ❌ `clearCachedOrganizations`

#### Teams (7 missing)
- ❌ `getTeamByHandle`, `refreshTeam`, `refreshTeams`
- ❌ `addMemberToTeam`, `removeMemberFromTeam`
- ❌ `addRoleToTeamMember`, `removeRoleFromTeamMember`
- ❌ `clearCachedTeams`

#### Schools (2 missing)
- ❌ `getSchools`, `refreshSchools`

#### Spaces (15 missing)
- ❌ `getOrganizationSpaceByHandle`, `getUserSpace`, `getUserSpaceByHandle`
- ❌ `updateOrganizationSpace`, `refreshOrganizationSpace`, `refreshOrganizationSpaces`
- ❌ `refreshUserSpace`, `refreshUserSpaces`, `refreshLayout`, `exportSpace`
- ❌ `addMemberToOrganizationSpace`, `removeMemberFromOrganizationSpace`
- ❌ `makeSpacePublic`, `makeSpacePrivate`

#### Courses (14 missing)
- ❌ `getCourse`, `updateCourse`, `refreshCourse`
- ❌ `getPublicCourses`, `refreshPublicCourses`
- ❌ `getInstructorCourses`, `refreshInstructorCourses`
- ❌ `getCoursesEnrollments`, `refreshCoursesEnrollments`
- ❌ `enrollStudentToCourse`, `removeStudentFromCourse`
- ❌ `getStudent`, `refreshStudent`
- ❌ `confirmCourseItemCompletion`, `setCourseItems`

#### Notebooks (3 missing)
- ❌ `getSpaceNotebook`, `refreshNotebook`, `refreshSpaceNotebooks`

#### Documents (3 missing)
- ❌ `getSpaceDocument`, `refreshDocument`, `refreshSpaceDocuments`

#### Cells (6 missing)
- ❌ `getCell`, `getSpaceCells`, `updateCell`, `cloneCell`
- ❌ `refreshCell`, `refreshSpaceCells`

#### Datasets (5 missing)
- ❌ `getDataset`, `getSpaceDatasets`, `updateDataset`
- ❌ `refreshDataset`, `refreshSpaceDatasets`

#### Environments (4 missing)
- ❌ `getEnvironment`, `getSpaceEnvironments`
- ❌ `refreshEnvironment`, `refreshSpaceEnvironments`

#### Lessons (6 missing)
- ❌ `getLesson`, `getSpaceLesson`, `getSpaceLessons`
- ❌ `cloneLesson`, `refreshLesson`, `refreshSpaceLessons`

#### Exercises (7 missing)
- ❌ `getExercise`, `getSpaceExercises`
- ❌ `updateExercise`, `updateExercisePoints`, `cloneExercise`
- ❌ `refreshExercise`, `refreshSpaceExercises`

#### Assignments (11 missing)
- ❌ `getAssignment`, `getAssignmentForStudent`, `getAssignmentStudentVersion`
- ❌ `getSpaceAssignment`, `getSpaceAssignments`, `cloneAssignment`
- ❌ `refreshAssignment`, `refreshAssignmentForStudent`, `refreshSpaceAssignments`
- ❌ `gradeAssignmentForStudent`, `resetAssignmentForStudent`

#### Items (Generic) (8 missing)
- ❌ `getPublicItems`, `getSpaceItems`, `searchPublicItems`
- ❌ `makeItemPublic`, `makeItemPrivate`
- ❌ `refreshPublicItems`, `refreshSpaceItems`
- ❌ `clearCachedPublicItems`, `clearCachedItems`

#### Pages (3 missing)
- ❌ `refreshPage`, `refreshPages`, `clearCachedPages`

#### Datasources (5 missing)
- ❌ `getDatasource`, `updateDatasource`
- ❌ `refreshDatasource`, `refreshDatasources`, `clearCachedDatasources`

#### Secrets (4 missing)
- ❌ `getSecret`, `updateSecret`
- ❌ `refreshSecret`, `refreshSecrets`, `clearCachedSecrets`

#### Tokens (4 missing)
- ❌ `getToken`, `updateToken`
- ❌ `refreshToken`, `refreshTokens`, `clearCachedTokens`

#### Invites (9 missing)
- ❌ `requestInvite`, `sendInvite`, `getInvite`, `getInvites`
- ❌ `putInvite`, `refreshInvite`, `refreshInvites`, `refreshAccount`
- ❌ `clearCachedInvites`

#### Contacts (8 missing)
- ❌ `getContactByHandle`, `refreshContact`
- ❌ `assignTagToContact`, `unassignTagFromContact`
- ❌ `sendInviteToContact`, `enrichContactEmail`, `enrichContactLinkedin`
- ❌ `sendLinkedinConnectionRequest`
- ❌ `linkUserWithContact`, `unlinkUserFromContact`

#### Inbounds (5 missing)
- ❌ `getInbound`, `getInboundByHandle`, `getInbounds`
- ❌ `refreshInbound`, `toInbound`

#### Outbounds (11 missing)
- ❌ `getOutbound`, `getOutbounds`, `refreshOutbound`
- ❌ `draftBulkEmailsOutbounds`, `tryBulkEmailsOutbounds`, `launchBulkEmailsOutbounds`
- ❌ `sendOutboundEmailToUser`, `deleteOutbound`
- ❌ `subscribeUserToOutbounds`, `unsubscribeUserFromOutbounds`
- ❌ `unsubscribeContactFromOutbounds`, `unsubscribeInviteeFromOutbounds`
- ❌ `toOutbound`

#### MFA (3 missing)
- ❌ `enableUserMFA`, `disableUserMFA`, `validateUserMFACode`

#### Checkout & Credits (3 missing)
- ❌ `createCheckoutSession`, `burnCredit`, `refreshStripePrices`

#### Support & Growth (4 missing)
- ❌ `requestPlatformSupport`, `requestPlatformSupport2`
- ❌ `getGrowthKPI`, `getPlatformUsages`

#### Cache Management (1 missing - not needed)
- ❌ `clearAllCaches` (TanStack Query handles this automatically)

**Total Missing: 192/252 methods (76%)**

## Implementation Priority

### Phase 1: Core CRUD Operations (High Priority)
Focus on completing basic CRUD for existing entities:
1. Add refresh/get methods for Notebooks, Documents, Pages
2. Add update methods for Datasources, Secrets, Tokens
3. Add getByHandle methods for Teams, Contacts

### Phase 2: Space Items (Medium Priority)
Implement all space item types:
1. Cells (6 methods)
2. Datasets (5 methods)
3. Environments (4 methods)
4. Lessons (6 methods)
5. Exercises (7 methods)
6. Assignments (11 methods)

### Phase 3: Course Management (Medium Priority)
Complete course and student functionality:
1. Course CRUD (14 methods)
2. Student management
3. Assignment grading

### Phase 4: Advanced Features (Low Priority)
1. OAuth2/Social integration (18 methods)
2. Invites system (9 methods)
3. Inbounds/Outbounds (16 methods)
4. MFA (3 methods)
5. Credits/Checkout (3 methods)
6. Support (4 methods)

### Phase 5: Helpers & Utils (Low Priority)
1. Proxy methods (3 methods)
2. Refresh methods (can be replaced by query invalidation)
3. Clear cache methods (not needed with TanStack Query)

## Migration Strategy

### Current Approach: Parallel Implementation
- ✅ Both hooks coexist
- ✅ New code can use useCache2
- ✅ Old code continues using useCache
- ✅ Gradual migration component by component

### Next Steps
1. **Complete Phase 1** - Core CRUD operations (~20 methods)
2. **Add tests** - Unit tests for all implemented hooks
3. **Migrate pilot components** - Test in production with low-risk components
4. **Document patterns** - Create migration guide with examples
5. **Team training** - Teach TanStack Query patterns
6. **Incremental rollout** - Migrate high-traffic components
7. **Deprecate useCache** - Once all components migrated

## Benefits of useCache2

### Automatic Cache Management
- ❌ useCache: Manual Map objects, manual cache updates
- ✅ useCache2: Automatic cache via TanStack Query

### Built-in Loading/Error States
- ❌ useCache: Manual state management
- ✅ useCache2: `isPending`, `isError`, `error` automatically provided

### Background Refetching
- ❌ useCache: Manual refresh functions
- ✅ useCache2: Automatic background refetching on window focus/reconnect

### Request Deduplication
- ❌ useCache: Multiple identical requests possible
- ✅ useCache2: Automatic deduplication

### Optimistic Updates
- ❌ useCache: Manual implementation required
- ✅ useCache2: Built-in optimistic update pattern

### Code Reduction
- ❌ useCache: 3,800 lines
- ✅ useCache2: 2,400 lines (with comments) - 37% reduction

### DevTools
- ❌ useCache: No debugging tools
- ✅ useCache2: React Query DevTools for cache inspection

## Conclusion

The migration is well underway with 24% of methods implemented. The foundation is solid with proper query key factories, optimistic updates, and automatic cache management. The grouped export structure in both hooks makes it easy to track progress and identify gaps.

**Next Action**: Implement Phase 1 (Core CRUD operations) to reach ~30% completion.
