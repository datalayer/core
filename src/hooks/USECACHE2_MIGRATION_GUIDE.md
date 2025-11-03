# useCache2 Migration Guide

## Overview

`useCache2.ts` is a modern replacement for `useCache.tsx` that leverages **TanStack Query** (formerly React Query) for automatic cache management, background refetching, and optimistic updates.

## Key Improvements

### 1. **Automatic Cache Management**

- No manual `Map` objects
- Automatic garbage collection
- Built-in deduplication

### 2. **Loading & Error States**

- Every query returns `isPending`, `isError`, `isSuccess`, `data`, `error`
- No need for custom loading state management

### 3. **Background Refetching**

- Automatic refetch on window focus
- Refetch on network reconnect
- Configurable stale time and cache time

### 4. **Optimistic Updates**

- UI updates immediately before server confirmation
- Automatic rollback on error

### 5. **Better Developer Experience**

- React Query DevTools for debugging
- Better TypeScript inference
- Less boilerplate code

---

## Architecture Comparison

### Old Pattern (useCache.tsx)

```tsx
// Imperative, manual cache management
const cache = useCache();

// Synchronous get (may return undefined)
const user = cache.getUser(userId);

// Manual refresh required
useEffect(() => {
  cache.refreshUser(userId);
}, [userId]);

// No loading/error states
if (!user) return <Spinner />;
```

### New Pattern (useCache2.ts)

```tsx
// Declarative, automatic cache management
const { useUser } = useCache2();

// Reactive query with automatic refetch
const { data: user, isPending, isError, error } = useUser(userId);

// Built-in loading/error states
if (isPending) return <Spinner />;
if (isError) return <Error message={error.message} />;
```

---

## Setup

### 1. Install TanStack Query (if not already)

```bash
npm install @tanstack/react-query
```

### 2. Set up QueryClient Provider

```tsx
// In your App.tsx or root component
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

---

## Migration Examples

### Example 1: User Profile

#### Before (useCache)

```tsx
function UserProfile({ userId }: { userId: string }) {
  const cache = useCache();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = cache.getUser(userId);

  useEffect(() => {
    setLoading(true);
    cache
      .refreshUser(userId)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <Spinner />;
  if (error) return <Error message={error} />;
  if (!user) return null;

  return <div>{user.displayName}</div>;
}
```

#### After (useCache2)

```tsx
function UserProfile({ userId }: { userId: string }) {
  const { useUser } = useCache2();
  const { data: user, isPending, isError, error } = useUser(userId);

  if (isPending) return <Spinner />;
  if (isError) return <Error message={error.message} />;

  return <div>{user.displayName}</div>;
}
```

### Example 2: Update User

#### Before (useCache)

```tsx
function UpdateUserForm() {
  const cache = useCache();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async values => {
    setSaving(true);
    try {
      await cache.updateMe(values.email, values.firstName, values.lastName);
      // Manual cache refresh
      await cache.refreshUser(userId);
      toast.success('User updated!');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={handleSubmit}>...</form>;
}
```

#### After (useCache2)

```tsx
function UpdateUserForm() {
  const { useUpdateMe } = useCache2();
  const updateUser = useUpdateMe();

  const handleSubmit = values => {
    updateUser.mutate(values, {
      onSuccess: () => {
        toast.success('User updated!');
        // Cache invalidation is automatic
      },
      onError: error => {
        toast.error(error.message);
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      ...
      <button disabled={updateUser.isPending}>
        {updateUser.isPending ? 'Saving...' : 'Save'}
      </button>
    </form>
  );
}
```

### Example 3: Organization List

#### Before (useCache)

```tsx
function OrganizationList() {
  const cache = useCache();
  const [orgs, setOrgs] = useState<IOrganization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cache
      .refreshUserOrganizations(user!)
      .then(() => {
        setOrgs(cache.getUserOrganizations());
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  return (
    <ul>
      {orgs.map(org => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  );
}
```

#### After (useCache2)

```tsx
function OrganizationList() {
  const { useUserOrganizations } = useCache2();
  const { data: orgs = [], isPending } = useUserOrganizations();

  if (isPending) return <Spinner />;

  return (
    <ul>
      {orgs.map(org => (
        <li key={org.id}>{org.name}</li>
      ))}
    </ul>
  );
}
```

### Example 4: Optimistic Update (Notebook)

#### Before (useCache)

```tsx
function UpdateNotebook({ notebookId }: { notebookId: string }) {
  const cache = useCache();

  const handleUpdate = async (name: string, description: string) => {
    // No optimistic update support
    await cache.updateNotebook(notebookId, name, description);
    await cache.refreshNotebook(notebookId);
  };

  return <form onSubmit={handleUpdate}>...</form>;
}
```

#### After (useCache2)

```tsx
function UpdateNotebook({ notebookId }: { notebookId: string }) {
  const { useNotebook, useUpdateNotebook } = useCache2();
  const { data: notebook } = useNotebook(notebookId);
  const updateNotebook = useUpdateNotebook();

  const handleUpdate = (name: string, description: string) => {
    // Optimistic update built-in
    updateNotebook.mutate({ id: notebookId, name, description });
    // UI updates immediately, rolls back on error
  };

  return <form onSubmit={handleUpdate}>...</form>;
}
```

---

## Available Hooks

### Authentication & Profile

- `useLogin()` - Login mutation
- `useLogout()` - Logout mutation
- `useMe(token?)` - Get current user
- `useUpdateMe()` - Update current user
- `useWhoami()` - Get whoami info

### Users

- `useUser(userId)` - Get user by ID
- `useUserByHandle(handle)` - Get user by handle
- `useSearchUsers(pattern)` - Search users
- `useUpdateUserOnboarding()` - Update onboarding
- `useUpdateUserSettings()` - Update settings

### Organizations

- `useOrganization(orgId)` - Get organization by ID
- `useOrganizationByHandle(handle)` - Get org by handle
- `useUserOrganizations()` - Get user's organizations
- `useCreateOrganization()` - Create organization
- `useUpdateOrganization()` - Update organization (with optimistic update)

### Teams

- `useTeam(teamId, orgId)` - Get team by ID
- `useTeamsByOrganization(orgId)` - Get teams by org
- `useCreateTeam()` - Create team
- `useUpdateTeam()` - Update team

### Spaces

- `useSpace(spaceId)` - Get space by ID
- `useOrganizationSpace(orgId, spaceId)` - Get org space
- `useOrganizationSpaces(orgId)` - Get org spaces
- `useUserSpaces()` - Get user spaces
- `useCreateSpace()` - Create space
- `useUpdateSpace()` - Update space (with optimistic update)

### Notebooks

- `useNotebook(notebookId)` - Get notebook
- `useNotebooksBySpace(spaceId)` - Get notebooks by space
- `useCreateNotebook()` - Create notebook
- `useUpdateNotebook()` - Update notebook (with optimistic update)
- `useUpdateNotebookModel()` - Update notebook model
- `useCloneNotebook()` - Clone notebook

### Documents

- `useDocument(documentId)` - Get document
- `useDocumentsBySpace(spaceId)` - Get documents by space
- `useUpdateDocument()` - Update document (with optimistic update)
- `useUpdateDocumentModel()` - Update document model
- `useCloneDocument()` - Clone document

### Pages

- `usePage(pageId)` - Get page
- `usePages()` - Get all pages
- `useCreatePage()` - Create page
- `useUpdatePage()` - Update page
- `useDeletePage()` - Delete page

### Datasources, Secrets, Tokens

- `useDatasources()` - Get all datasources
- `useCreateDatasource()` - Create datasource
- `useSecrets()` - Get all secrets
- `useCreateSecret()` - Create secret
- `useDeleteSecret()` - Delete secret
- `useTokens()` - Get all tokens
- `useCreateToken()` - Create token

### Contacts

- `useContact(contactId)` - Get contact
- `useSearchContacts(query)` - Search contacts
- `useCreateContact()` - Create contact
- `useUpdateContact()` - Update contact
- `useDeleteContact()` - Delete contact

### Generic

- `useDeleteItem()` - Delete any item (notebook, document, etc.)

---

## Advanced Patterns

### 1. Dependent Queries

```tsx
function UserWithOrganization({ userId }: { userId: string }) {
  const { useUser, useOrganization } = useCache2();

  // First query
  const { data: user } = useUser(userId);

  // Second query only runs if user exists
  const { data: org } = useOrganization(user?.organizationId, {
    enabled: !!user?.organizationId,
  });

  return <div>...</div>;
}
```

### 2. Manual Cache Updates

```tsx
function CreateNotebook() {
  const { useCreateNotebook, queryKeys } = useCache2();
  const queryClient = useQueryClient();
  const createNotebook = useCreateNotebook();

  const handleCreate = () => {
    createNotebook.mutate(data, {
      onSuccess: notebook => {
        // Manually update cache
        queryClient.setQueryData(
          queryKeys.notebooks.detail(notebook.id),
          notebook,
        );
      },
    });
  };
}
```

### 3. Prefetching

```tsx
function NotebookList() {
  const { useNotebooksBySpace, useNotebook, queryKeys } = useCache2();
  const queryClient = useQueryClient();
  const { data: notebooks } = useNotebooksBySpace(spaceId);

  const prefetchNotebook = (notebookId: string) => {
    queryClient.prefetchQuery({
      queryKey: queryKeys.notebooks.detail(notebookId),
      queryFn: () => fetchNotebook(notebookId),
    });
  };

  return (
    <ul>
      {notebooks?.map(nb => (
        <li key={nb.id} onMouseEnter={() => prefetchNotebook(nb.id)}>
          {nb.name}
        </li>
      ))}
    </ul>
  );
}
```

### 4. Polling/Auto-refresh

```tsx
function UserCredits({ userId }: { userId: string }) {
  const { useUser } = useCache2();

  const { data: user } = useUser(userId, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return <div>Credits: {user?.credits}</div>;
}
```

---

## Best Practices

### 1. Always Handle Loading & Error States

```tsx
const { data, isPending, isError, error } = useQuery(...);

if (isPending) return <Spinner />;
if (isError) return <Error message={error.message} />;
// Now data is guaranteed to exist
```

### 2. Use Optimistic Updates for Better UX

```tsx
const updateMutation = useMutation({
  onMutate: async newData => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey });

    // Snapshot previous value
    const previous = queryClient.getQueryData(queryKey);

    // Optimistically update
    queryClient.setQueryData(queryKey, newData);

    return { previous };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(queryKey, context.previous);
  },
});
```

### 3. Leverage Query Keys for Cache Invalidation

```tsx
// Invalidate specific query
queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });

// Invalidate all user queries
queryClient.invalidateQueries({ queryKey: queryKeys.users.all() });

// Invalidate everything
queryClient.invalidateQueries();
```

### 4. Use `enabled` Option for Conditional Queries

```tsx
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: fetchData,
  enabled: !!dependency, // Only run if dependency exists
});
```

---

## Migration Checklist

- [ ] Install `@tanstack/react-query`
- [ ] Set up `QueryClientProvider` in app root
- [ ] Add React Query DevTools (development only)
- [ ] Identify components using `useCache()`
- [ ] Replace with `useCache2()` hooks
- [ ] Remove manual loading/error state management
- [ ] Remove manual `useEffect` for data fetching
- [ ] Test all CRUD operations
- [ ] Verify cache invalidation works correctly
- [ ] Test optimistic updates
- [ ] Check for memory leaks (React Query DevTools helps)
- [ ] Update tests to work with React Query
- [ ] Document any custom query configurations

---

## Troubleshooting

### Issue: Query not refetching

**Solution:** Check `staleTime` and `enabled` options. Increase `staleTime` or set `refetchOnMount: true`.

### Issue: Too many refetches

**Solution:** Increase `staleTime` or set `refetchOnWindowFocus: false`.

### Issue: Cache not invalidating

**Solution:** Verify you're using the correct query key from `queryKeys` object.

### Issue: Optimistic update not rolling back

**Solution:** Ensure you're returning the previous value from `onMutate` and using it in `onError`.

---

## Resources

- [TanStack Query Documentation](https://tanstack.com/query/latest/docs/framework/react/overview)
- [Query Keys Guide](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)
- [Optimistic Updates](https://tanstack.com/query/latest/docs/framework/react/guides/optimistic-updates)
- [React Query DevTools](https://tanstack.com/query/latest/docs/framework/react/devtools)

---

## Support

For questions or issues with the migration, contact the Datalayer development team.
