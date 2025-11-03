# useCache2 Implementation Status

## Completed ✅

### Core Refactoring
- **Naming Convention**: All exported methods now match useCache naming (no "use" prefix)
  - Internal implementations still use hooks (required by React)
  - Return object exports with clean names: `login`, `getUser`, `getMe`, etc.
  
### Implemented Categories

1. **Authentication & Profile** (5 methods)
   - `login`, `logout`, `getMe`, `updateMe`, `whoami`

2. **Users** (5 methods)
   - `getUser`, `getUserByHandle`, `searchUsers`
   - `updateUserOnboarding`, `updateUserSettings`

3. **Organizations** (5 methods)
   - `getOrganizationById`, `getOrganizationByHandle`
   - `getUserOrganizations`, `createOrganization`, `updateOrganization`

4. **Teams** (4 methods)
   - `getTeamById`, `getTeamsByOrganizationId`
   - `createTeam`, `updateTeam`

5. **Spaces** (6 methods)
   - `getOrganizationSpace`, `getOrganizationSpaceWithOrg`
   - `getOrganizationSpaces`, `getUserSpaces`
   - `createSpace`, `updateSpace`

6. **Notebooks** (6 methods)
   - `getNotebook`, `getSpaceNotebooks`
   - `createNotebook`, `updateNotebook`, `updateNotebookModel`, `cloneNotebook`

7. **Documents** (5 methods)
   - `getDocument`, `getSpaceDocuments`
   - `updateDocument`, `updateDocumentModel`, `cloneDocument`

8. **Pages** (5 methods)
   - `getPage`, `getPages`, `createPage`, `updatePage`, `deletePage`

9. **Datasources** (2 methods)
   - `getDatasources`, `createDatasource`

10. **Secrets** (3 methods)
    - `getSecrets`, `createSecret`, `deleteSecret`

11. **Tokens** (2 methods)
    - `getTokens`, `createToken`

12. **Contacts** (5 methods)
    - `getContactById`, `searchContacts`
    - `createContact`, `updateContact`, `deleteContact`

13. **Generic** (1 method)
    - `deleteItem`

14. **Query Keys** - Exposed for manual cache operations

15. **Upload Legacy** (3 properties)
    - `notebookUploadLoading`, `notebookUploadProgress`, `resetNotebookUpload`

**Total: ~60 methods implemented**

## Missing from Original useCache

The following methods exist in useCache but not yet in useCache2:

### Authentication (12 methods)
- `requestJoin`, `requestJoinToken`, `joinWithInvite`
- `confirmJoinWithToken`, `changePassword`, `createTokenForPasswordChange`
- `confirmPassworkWithToken`, `requestEmailUpdate`, `confirmEmailUpdate`
- `getOAuth2AuthorizationURL`, `getOAuth2AuthorizationLinkURL`
- `getGitHubProfile`, `getLinkedinProfile`
- `postLinkedinShare`, `postLinkedinShareWithUpload`
- `registerToWaitingList`

### Proxy Methods (3 methods)
- `proxyGET`, `proxyPOST`, `proxyPUT`

### Organizations (5 methods)
- `addMemberToOrganization`, `removeMemberFromOrganization`
- `addRoleToOrganizationMember`, `removeRoleFromOrganizationMember`
- `getUserOrganizationById`

### Teams (4 methods)
- `getTeamByHandle`, `addMemberToTeam`, `removeMemberFromTeam`
- `addRoleToTeamMember`, `removeRoleFromTeamMember`

### Spaces (11 methods)
- `getUserSpace`, `getUserSpaceByHandle`
- `refreshUserSpace`, `getOrganizationSpaceByHandle`
- `updateOrganizationSpace`, `exportSpace`
- `addMemberToOrganizationSpace`, `removeMemberFromOrganizationSpace`
- `makeSpacePublic`, `makeSpacePrivate`
- `refreshLayout`

### Notebooks/Documents/Items (25+ methods)
- `getSpaceNotebook`, `getNotebook` (various item types)
- `getSpaceAssignment`, `getSpaceAssignments`, `getAssignment`, etc.
- `getSpaceCell`, `getSpaceCells`, `getCell`, etc.
- `getSpaceDataset`, `getSpaceDatasets`, `getDataset`, etc.
- `getSpaceDocument`, `getSpaceDocuments`
- `getSpaceEnvironment`, `getSpaceEnvironments`, `getEnvironment`
- `getSpaceExercise`, `getSpaceExercises`, `getExercise`
- `getSpaceLesson`, `getSpaceLessons`, `getLesson`
- `cloneCell`, `cloneAssignment`, `cloneExercise`, `cloneLesson`
- `updateCell`, `updateDataset`, `updateExercise`, `updateExercisePoints`
- `makeItemPublic`, `makeItemPrivate`, `searchPublicItems`
- `getPublicItems`, `getSpaceItems`

### Courses (15+ methods)
- `getCourse`, `updateCourse`, `refreshCourse`
- `enrollStudentToCourse`, `removeStudentFromCourse`
- `getStudent`, `refreshStudent`
- `getPublicCourses`, `getInstructorCourses`, `getCoursesEnrollments`
- `confirmCourseItemCompletion`, `setCourseItems`
- `getAssignmentForStudent`, `getAssignmentStudentVersion`
- `gradeAssignmentForStudent`, `resetAssignmentForStudent`

### Contacts (9 methods)
- `getContactByHandle`, `refreshContact`
- `assignTagToContact`, `unassignTagFromContact`
- `sendInviteToContact`, `enrichContactEmail`, `enrichContactLinkedin`
- `sendLinkedinConnectionRequest`, `linkUserWithContact`, `unlinkUserFromContact`

### Users (3 methods)
- `refreshUser`, `assignRoleToUser`, `unassignRoleFromUser`
- `getUserCredits`, `updateUserCredits`, `updateUserCreditsQuota`
- `getUserSurveys`, `getUsages`, `getUsagesForUser`, `getPlatformUsages`

### Datasources/Secrets/Tokens (4 methods)
- `getDatasource`, `updateDatasource`, `updateSecret`, `updateToken`
- `getSecret`, `getToken`

### Invites (6 methods)
- `requestInvite`, `sendInvite`, `getInvite`, `getInvites`
- `putInvite`, `refreshInvite`, `refreshInvites`, `refreshAccount`

### Inbounds/Outbounds (15+ methods)
- `getInbound`, `getInboundByHandle`, `getInbounds`, `refreshInbound`
- `getOutbound`, `getOutbounds`, `refreshOutbound`
- `draftBulkEmailsOutbounds`, `tryBulkEmailsOutbounds`, `launchBulkEmailsOutbounds`
- `sendOutboundEmailToUser`, `deleteOutbound`
- `subscribeUserToOutbounds`, `unsubscribeUserFromOutbounds`
- `unsubscribeContactFromOutbounds`, `unsubscribeInviteeFromOutbounds`

### MFA (3 methods)
- `enableUserMFA`, `disableUserMFA`, `validateUserMFACode`

### Schools/Checkout (3 methods)
- `getSchools`, `refreshSchools`
- `createCheckoutSession`, `burnCredit`

### Support (2 methods)
- `requestPlatformSupport`, `requestPlatformSupport2`, `getGrowthKPI`

### Cache Management (15+ methods)
- `clearAllCaches`, `clearCachedItems`, `clearCachedDatasources`
- `clearCachedInvites`, `clearCachedOrganizations`, `clearCachedPages`
- `clearCachedPublicItems`, `clearCachedSecrets`, `clearCachedTeams`, `clearCachedTokens`
- `refreshPage`, `refreshPages`, `refreshDatasource`, `refreshDatasources`
- `refreshSecret`, `refreshSecrets`, `refreshToken`, `refreshTokens`
- `refreshOrganization`, `refreshUserOrganizations`, `refreshOrganizationSpace`
- `refreshOrganizationSpaces`, `refreshUserSpaces`, `refreshTeam`, `refreshTeams`
- (and many more refresh methods)

**Estimated missing: ~150+ methods**

## Linting Issues (Minor)

- 291 linting errors (mostly formatting)
  - Prettier formatting issues (trailing spaces, line breaks)
  - Unused imports (UseQueryOptions, UseMutationOptions, QueryClient, etc.)
  - No functional errors

## Next Steps

### Priority 1 - Core Functionality
1. Add remaining CRUD operations for existing entities
2. Add refresh/invalidation helper methods
3. Add clear cache methods (no-ops with TanStack Query, but for compatibility)

### Priority 2 - Extended Features
4. Implement Course/Student management hooks
5. Implement Space Items (Cells, Assignments, Exercises, Lessons, etc.)
6. Implement Invites/Inbounds/Outbounds

### Priority 3 - Auth & Social
7. Implement OAuth2/LinkedIn/GitHub integration
8. Implement MFA methods
9. Implement waiting list/support methods

### Priority 4 - Optimization
10. Fix linting issues (run prettier, remove unused imports)
11. Add comprehensive JSDoc comments
12. Add unit tests
13. Performance testing

## Migration Strategy

1. **Phase 1**: Use for new components (✅ Ready)
2. **Phase 2**: Migrate high-traffic read-only queries
3. **Phase 3**: Migrate mutations with optimistic updates
4. **Phase 4**: Full migration, deprecate useCache

## Benefits Over useCache

- ✅ Automatic cache management (no manual Maps)
- ✅ Built-in loading/error states
- ✅ Automatic background refetching
- ✅ Request deduplication
- ✅ Optimistic updates support
- ✅ 50% less code (1,900 vs 3,800 lines)
- ✅ Better TypeScript inference
- ✅ React Query DevTools integration
- ✅ Declarative API (hooks vs imperative functions)
