# Batch 3 Implementation Summary

**Date:** 2025-01-14  
**Batch:** 3 of ~10  
**Methods Implemented:** 13  
**Total Progress:** 101 methods (40% of 252 total)

## Overview

Batch 3 focuses on authentication extensions (password, email management, role assignments), school organization management, and refresh operations for organizations, teams, and spaces. These methods enable users to manage security settings, administrative roles, and keep cached data synchronized with the backend.

## Methods Implemented

### Authentication & Security (3 methods)

1. **`changePassword`** - Mutation hook to change user password
   - **Endpoint:** `PUT /api/iam/v1/password`
   - **Params:** `{ handle, password, passwordConfirm }`
   - **Use Case:** Allow users to update their password securely

2. **`requestEmailUpdate`** - Mutation hook to request email address change
   - **Endpoint:** `PUT /api/iam/v1/me/email`
   - **Params:** `email: string`
   - **Use Case:** Initiate email change process (triggers confirmation email)

3. **`confirmEmailUpdate`** - Mutation hook to confirm email change with token
   - **Endpoint:** `POST /api/iam/v1/me/email`
   - **Params:** `token: string`
   - **Cache Invalidation:** Invalidates `auth.me()` query
   - **Use Case:** Complete email change after user clicks confirmation link

### User Role Management (2 methods)

4. **`assignRoleToUser`** - Mutation hook to assign a role to a user
   - **Endpoint:** `POST /api/iam/v1/users/{userId}/roles/{roleName}`
   - **Params:** `{ userId, roleName }`
   - **Cache Invalidation:** Invalidates user detail query
   - **Use Case:** Grant administrative or custom roles to users

5. **`unassignRoleFromUser`** - Mutation hook to remove a role from a user
   - **Endpoint:** `DELETE /api/iam/v1/users/{userId}/roles/{roleName}`
   - **Params:** `{ userId, roleName }`
   - **Cache Invalidation:** Invalidates user detail query
   - **Use Case:** Revoke roles when permissions change

### Schools (1 method)

6. **`getSchools`** - Query hook to fetch all schools
   - **Endpoint:** `GET /api/iam/v1/organizations/schools`
   - **Query Key:** `['schools']`
   - **Returns:** `ISchool[]` with properties: `id, type, handle, name, description, dean, members, students, courses, public, creationDate, setMembers`
   - **Use Case:** Display list of educational institutions in the platform

### Organization Refresh Operations (2 methods)

7. **`refreshOrganization`** - Mutation hook to refresh a single organization's data
   - **Endpoint:** `GET /api/iam/v1/organizations/{organizationId}`
   - **Cache Update:** Updates organization detail query and byHandle query
   - **Cache Invalidation:** Invalidates all organizations list
   - **Use Case:** Sync organization data after external changes

8. **`refreshUserOrganizations`** - Mutation hook to refresh all user organizations
   - **Endpoint:** `GET /api/iam/v1/organizations`
   - **Cache Update:** Updates detail and byHandle queries for each organization
   - **Cache Invalidation:** Invalidates user organizations query
   - **Use Case:** Refresh organization list after joining/leaving organizations

### Team Refresh Operations (2 methods)

9. **`refreshTeam`** - Mutation hook to refresh a single team's data
   - **Endpoint:** `GET /api/iam/v1/teams/{teamId}`
   - **Params:** `{ teamId, organizationId }`
   - **Cache Update:** Updates team detail and byHandle queries
   - **Cache Invalidation:** Invalidates organization teams list
   - **Use Case:** Update team data after membership or settings changes

10. **`refreshTeams`** - Mutation hook to refresh all teams in an organization
    - **Endpoint:** `GET /api/iam/v1/teams`
    - **Params:** `organizationId: string`
    - **Cache Update:** Updates detail and byHandle queries for each team
    - **Cache Invalidation:** Invalidates organization teams list
    - **Use Case:** Sync all teams after bulk operations

### Space Refresh Operations (3 methods)

11. **`refreshOrganizationSpace`** - Mutation hook to refresh a single organization space
    - **Endpoint:** `GET /api/spacer/v1/organizations/{organizationId}/spaces/{spaceId}`
    - **Params:** `{ organizationId, spaceId }`
    - **Cache Update:** Updates space detail query
    - **Cache Invalidation:** Invalidates organization spaces list
    - **Use Case:** Update space data after configuration changes

12. **`refreshOrganizationSpaces`** - Mutation hook to refresh all organization spaces
    - **Endpoint:** `GET /api/spacer/v1/organizations/{organizationId}/spaces`
    - **Params:** `organizationId: string`
    - **Cache Update:** Updates space detail queries for all spaces
    - **Cache Invalidation:** Invalidates organization spaces list
    - **Use Case:** Sync all organization spaces after bulk operations

13. **`refreshUserSpaces`** - Mutation hook to refresh all user spaces
    - **Endpoint:** `GET /api/spacer/v1/spaces`
    - **Cache Update:** Updates space detail queries for all user spaces
    - **Cache Invalidation:** Invalidates user spaces list
    - **Use Case:** Refresh personal space list after creating/joining spaces

## Implementation Patterns

### Authentication Mutations
```typescript
const { mutate: changePassword } = useCache2().changePassword();

changePassword(
  { 
    handle: 'john@example.com',
    password: 'newPassword123',
    passwordConfirm: 'newPassword123'
  },
  {
    onSuccess: () => console.log('Password changed successfully'),
    onError: (error) => console.error('Failed to change password:', error)
  }
);
```

### Email Management
```typescript
const { mutate: requestUpdate } = useCache2().requestEmailUpdate();
const { mutate: confirmUpdate } = useCache2().confirmEmailUpdate();

// Step 1: Request email change
requestUpdate('newemail@example.com', {
  onSuccess: () => console.log('Confirmation email sent')
});

// Step 2: Confirm with token from email
confirmUpdate('abc123token', {
  onSuccess: () => console.log('Email updated')
});
```

### Role Management
```typescript
const { mutate: assignRole } = useCache2().assignRoleToUser();
const { mutate: unassignRole } = useCache2().unassignRoleFromUser();

// Grant admin role
assignRole({ userId: 'user-123', roleName: 'admin' });

// Revoke role
unassignRole({ userId: 'user-123', roleName: 'admin' });
```

### Schools Query
```typescript
const { data: schools, isLoading } = useCache2().getSchools();

// Display schools
schools?.map(school => (
  <SchoolCard key={school.id} school={school} />
));
```

### Refresh Operations
```typescript
const { mutate: refreshOrg } = useCache2().refreshOrganization();
const { mutate: refreshTeam } = useCache2().refreshTeam();
const { mutate: refreshSpace } = useCache2().refreshOrganizationSpace();

// Refresh after external changes
refreshOrg('org-123');
refreshTeam({ teamId: 'team-456', organizationId: 'org-123' });
refreshSpace({ organizationId: 'org-123', spaceId: 'space-789' });
```

## Technical Highlights

### Smart Cache Invalidation
- **Refresh operations** update both detail and byHandle queries
- **Role changes** only invalidate affected user's cache
- **Email updates** trigger auth.me() refresh for current user
- **Bulk refresh operations** iterate through results to update individual caches

### Query Key Strategy
- Schools use simple `['schools']` key (single global list)
- Refresh operations target hierarchical query keys:
  - `organizations.detail(id)` and `organizations.byHandle(handle)`
  - `teams.detail(id)` and `teams.byHandle(handle)`
  - `spaces.detail(id)` for space queries

### Type Safety
- Schools transformed from backend format to `ISchool` interface
- Organizations, teams, spaces use `toOrganization`, `toTeam`, `toSpace` helpers
- Maintains type consistency across the application

## Progress Tracking

### Overall Status
- **Implemented:** 101 methods (40%)
- **Remaining:** 151 methods (60%)

### Category Breakdown
- ✅ **Authentication:** Core methods + password/email management (8/15 methods)
- ✅ **Users:** Core + credits + roles (13/20 methods)
- ✅ **Organizations:** CRUD + members + refresh (13/17 methods)
- ✅ **Teams:** CRUD + members + refresh (11/13 methods)
- ✅ **Schools:** Basic query (1/2 methods)
- ✅ **Spaces:** CRUD + members + visibility + refresh (18/24 methods)
- ✅ **Notebooks:** CRUD operations (6/9 methods)
- ✅ **Documents:** CRUD operations (6/9 methods)
- ✅ **Pages:** Read + enhanced features (2/3 methods)
- ✅ **Datasources:** CRUD operations (3/6 methods)
- ✅ **Secrets:** CRUD operations (3/6 methods)
- ✅ **Tokens:** CRUD operations (3/6 methods)
- ✅ **Contacts:** Read operations (2/4 methods)
- ❌ **Cells:** (0/6 methods)
- ❌ **Courses:** (0/15 methods)
- ❌ **Datasets:** (0/8 methods)
- ❌ **Environments:** (0/4 methods)
- ❌ **Lessons:** (0/5 methods)
- ❌ **Exercises:** (0/4 methods)
- ❌ **Assignments:** (0/6 methods)
- ❌ **Items:** (0/10 methods)
- ❌ **Invites:** (0/8 methods)
- ❌ **Inbounds/Outbounds:** (0/6 methods)
- ❌ **MFA:** (0/3 methods)
- ❌ **Checkout:** (0/4 methods)
- ❌ **Support:** (0/5 methods)
- ❌ **Advanced Cache:** (0/5 methods)

### Batch History
- **Batch 1:** 13 methods (datasources, secrets, tokens, teams, spaces, contacts) → 73 methods (29%)
- **Batch 2:** 15 methods (member management, user credits, space visibility) → 88 methods (35%)
- **Batch 3:** 13 methods (authentication, roles, schools, refresh operations) → 101 methods (40%)

## Next Steps (Batch 4)

Recommended focus areas for the next batch (~12-15 methods):

1. **Course Management:** Basic CRUD operations
   - `getCourse`, `updateCourse`, `refreshCourse`
   - `getPublicCourses`, `refreshPublicCourses`
   - `getInstructorCourses`, `refreshInstructorCourses`

2. **Item Management:** Space items CRUD
   - `getSpaceItem`, `updateSpaceItem`
   - `getSpaceItems`, `refreshSpaceItems`
   - `addItemToSpace`, `removeItemFromSpace`

3. **Advanced Features:**
   - `getUserOrganizationById` (helper method)
   - `refreshLayout` (space layout refresh)
   - `exportSpace` (space export functionality)

Target after Batch 4: ~113-116 methods (45% complete)

## Testing Recommendations

### Unit Tests
```typescript
describe('Batch 3: Authentication & Refresh', () => {
  it('should change password', async () => {
    const { result } = renderHook(() => useCache2().changePassword());
    await act(() => result.current.mutate({ 
      handle: 'user@test.com', 
      password: 'new', 
      passwordConfirm: 'new' 
    }));
    expect(result.current.isSuccess).toBe(true);
  });

  it('should refresh organization and update cache', async () => {
    const { result } = renderHook(() => useCache2().refreshOrganization());
    await act(() => result.current.mutate('org-123'));
    expect(queryClient.getQueryData(['organizations', 'detail', 'org-123'])).toBeDefined();
  });

  it('should fetch schools', async () => {
    const { result } = renderHook(() => useCache2().getSchools());
    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data).toBeInstanceOf(Array);
  });
});
```

### Integration Tests
- Test password change flow end-to-end
- Verify email update confirmation process
- Test role assignment with permission checks
- Validate refresh operations update UI components
- Test schools query with filters/sorting

## Migration Notes

### From useCache.tsx
```typescript
// Old way (manual cache management)
const changePassword = useCache().changePassword;
changePassword(handle, password, passwordConfirm);

const schools = useCache().getSchools();
const refreshSchools = useCache().refreshSchools;

// New way (TanStack Query)
const { mutate: changePassword } = useCache2().changePassword();
changePassword({ handle, password, passwordConfirm });

const { data: schools } = useCache2().getSchools();
// No separate refresh needed - use refetch from query result
```

### Breaking Changes
- **refreshSchools:** No longer needed as separate method - `getSchools` query has built-in `refetch()` function
- **All refresh methods:** Now return mutation hooks instead of Promise functions
- **Cache invalidation:** Automatic and smart - no manual cache clearing needed

## Performance Considerations

1. **Refresh operations:** Use sparingly - prefer automatic TanStack Query refetching
2. **Schools query:** Cached with default staleTime - only fetches when necessary
3. **Role assignments:** Targeted cache invalidation prevents unnecessary refetches
4. **Bulk refresh:** Updates all caches atomically in single operation

## Documentation

All Batch 3 methods are documented with:
- JSDoc comments explaining purpose
- TypeScript types for parameters and return values
- Cache invalidation behavior notes
- [BATCH 3] markers in return statement for tracking

---

**Status:** ✅ Complete  
**Linting:** ✅ Passes (0 errors, 1380 warnings - pre-existing)  
**Next Batch:** Courses, items, and advanced features
