# Datalayer Core API SDK Documentation

## Overview

The Datalayer Core API SDK provides a comprehensive TypeScript/JavaScript interface for interacting with the Datalayer platform services. The SDK is organized into three main service areas:

- **Runtimes API**: Manage computational environments and kernels
- **IAM API**: Identity and access management, authentication, and authorization
- **Spacer API**: Collaborative workspaces, notebooks, and educational content

## Installation

```bash
npm install @datalayer/core
```

## Quick Start

```typescript
import { DatalayerSDK } from '@datalayer/core/api';

// Initialize the SDK
const sdk = new DatalayerSDK({
  baseUrl: 'https://prod1.datalayer.run',
  token: 'your-api-token'
});

// Use the SDK
const environments = await sdk.runtimes.environments.list();
const user = await sdk.iam.users.me();
const spaces = await sdk.spacer.spaces.list();
```

## Architecture

### Design Principles

1. **Dual Interface**: Both functional and object-oriented APIs
2. **Type Safety**: Full TypeScript support with comprehensive type definitions
3. **Modular**: Organized by service and resource type
4. **Consistent**: Uniform patterns across all APIs
5. **Flexible**: Configurable client with request/response interceptors

### Directory Structure

```
src/api/
├── base/
│   └── client.ts          # Base HTTP client with auth
├── types/
│   ├── runtimes.ts        # Runtime service types
│   ├── iam.ts             # IAM service types
│   └── spacer.ts          # Spacer service types
├── services/
│   ├── runtimes/
│   │   ├── api.ts         # Functional API
│   │   └── client.ts      # OOP wrapper
│   ├── iam/
│   │   ├── api.ts         # Functional API
│   │   └── client.ts      # OOP wrapper
│   └── spacer/
│       ├── api.ts         # Functional API
│       └── client.ts      # OOP wrapper
└── index.ts               # Main SDK entry point
```

## Authentication

The SDK supports multiple authentication methods:

### Bearer Token

```typescript
const sdk = new DatalayerSDK({
  token: 'your-bearer-token'
});
```

### Username/Password

```typescript
const sdk = new DatalayerSDK();
const { data: loginResponse } = await sdk.iam.auth.login({
  username: 'user@example.com',
  password: 'password'
});
sdk.updateToken(loginResponse.access_token);
```

### OAuth2

```typescript
// Get available providers
const providers = await sdk.iam.auth.getOAuth2Providers();

// Initiate OAuth flow
const { authorization_url } = await sdk.iam.auth.initiateOAuth2('github');
// Redirect user to authorization_url

// Handle callback
const loginResponse = await sdk.iam.auth.handleOAuth2Callback('github', code, state);
```

## API Services

### Runtimes Service

Manage computational environments, kernels, and runtime snapshots.

#### Environments

```typescript
// List available environments
const environments = await sdk.runtimes.environments.list();

// Get specific environment
const pythonEnv = await sdk.runtimes.environments.get('python-cpu-small');
```

#### Runtimes

```typescript
// Create a runtime
const runtime = await sdk.runtimes.create({
  environment_name: 'python-cpu-small',
  credits: 100,
  runtime_type: 'notebook'
});

// List user's runtimes
const runtimes = await sdk.runtimes.list({
  state: 'running',
  runtime_type: 'notebook'
});

// Get runtime details
const runtimeDetails = await sdk.runtimes.get(runtime.pod_name);

// Set runtime state
await sdk.runtimes.setState(runtime.pod_name, 'stopped');

// Delete runtime
await sdk.runtimes.delete(runtime.pod_name);
```

#### Runtime Snapshots

```typescript
// Create snapshot
const snapshot = await sdk.runtimes.snapshots.create({
  runtime_id: 'runtime-123',
  name: 'My Snapshot',
  description: 'Checkpoint before experiments'
});

// List snapshots
const snapshots = await sdk.runtimes.snapshots.list({
  runtime_id: 'runtime-123'
});

// Load snapshot
await sdk.runtimes.snapshots.load({
  snapshot_id: snapshot.id,
  runtime_id: 'runtime-456'
});

// Download snapshot
const blob = await sdk.runtimes.snapshots.download(snapshot.id);
```

### IAM Service

Identity and access management, including users, organizations, teams, and permissions.

#### Authentication

```typescript
// Login
const loginResponse = await sdk.iam.auth.login({
  email: 'user@example.com',
  password: 'password'
});

// Logout
await sdk.iam.auth.logout();

// Register new user
const newUser = await sdk.iam.auth.register({
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'secure-password',
  first_name: 'John',
  last_name: 'Doe'
});

// Refresh token
const refreshedAuth = await sdk.iam.auth.refresh(refreshToken);
```

#### User Management

```typescript
// Get current user
const currentUser = await sdk.iam.users.me();

// Update profile
const updatedUser = await sdk.iam.users.updateProfile({
  display_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg'
});

// Search users
const users = await sdk.iam.users.search('john', { limit: 10 });

// Enable MFA
const { secret, qr_code } = await sdk.iam.users.enableMFA();

// Verify MFA
await sdk.iam.users.verifyMFA('123456');
```

#### Organizations

```typescript
// Create organization
const org = await sdk.iam.organizations.create({
  name: 'my-org',
  display_name: 'My Organization',
  description: 'Organization description'
});

// Add member
await sdk.iam.organizations.addMember(org.id, {
  email: 'member@example.com',
  role: 'member'
});

// List members
const members = await sdk.iam.organizations.listMembers(org.id);
```

#### Teams

```typescript
// Create team
const team = await sdk.iam.teams.create(org.id, {
  name: 'dev-team',
  display_name: 'Development Team',
  members: ['user1', 'user2']
});

// Add team member
await sdk.iam.teams.addMember(team.id, 'user3');

// List team members
const teamMembers = await sdk.iam.teams.listMembers(team.id);
```

#### Tokens & Secrets

```typescript
// Create API token
const token = await sdk.iam.tokens.create({
  name: 'CI/CD Token',
  expires_in: 30 * 24 * 3600, // 30 days
  scopes: ['read', 'write']
});

// Create secret
const secret = await sdk.iam.secrets.create({
  name: 'database-password',
  value: 'secret-value',
  description: 'Production database password'
});

// Get secret value
const secretWithValue = await sdk.iam.secrets.get(secret.id);
```

#### Credits & Usage

```typescript
// Get credit balance
const credits = await sdk.iam.credits.getBalance();

// Get usage history
const usage = await sdk.iam.credits.getUsage({
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  resource_type: 'runtime'
});
```

### Spacer Service

Collaborative workspaces, notebooks, courses, and educational content.

#### Spaces

```typescript
// Create space
const space = await sdk.spacer.spaces.create({
  name: 'ml-projects',
  description: 'Machine Learning Projects',
  visibility: 'private'
});

// List spaces
const spaces = await sdk.spacer.spaces.list({
  visibility: 'public',
  search: 'machine learning'
});

// Add member to space
await sdk.spacer.spaces.addMember(space.id, 'user-id', 'editor');

// Export space
const exportBlob = await sdk.spacer.spaces.export(space.id);
```

#### Notebooks

```typescript
// Create notebook
const notebook = await sdk.spacer.notebooks.create({
  name: 'Analysis.ipynb',
  space_id: space.id,
  kernel_spec: {
    name: 'python3',
    display_name: 'Python 3',
    language: 'python'
  }
});

// Get notebook by UID (for collaboration)
const notebookByUid = await sdk.spacer.notebooks.getByUid(notebook.uid);

// Update notebook content
await sdk.spacer.notebooks.updateContent(notebook.id, {
  cells: [...],
  metadata: {...}
});

// Clone notebook
const cloned = await sdk.spacer.notebooks.clone({
  source_id: notebook.id,
  name: 'Analysis-Copy.ipynb',
  space_id: space.id
});

// Execute notebook
const result = await sdk.spacer.notebooks.execute(notebook.id);
```

#### Real-time Collaboration

```typescript
// Get collaboration document
const doc = await sdk.spacer.notebooks.getCollaborationDocument(notebook.uid);

// Update collaboration document
await sdk.spacer.notebooks.updateCollaborationDocument(notebook.uid, {
  // Y.js update
});
```

#### Cells

```typescript
// Create cell
const cell = await sdk.spacer.cells.create(notebook.id, {
  cell_type: 'code',
  source: 'print("Hello, World!")',
  metadata: {}
});

// Execute cell
const output = await sdk.spacer.cells.execute(notebook.id, cell.id);

// Update cell
await sdk.spacer.cells.update(notebook.id, cell.id, {
  source: 'print("Updated!")'
});
```

#### Courses

```typescript
// Create course
const course = await sdk.spacer.courses.create({
  name: 'intro-ml',
  title: 'Introduction to Machine Learning',
  space_id: space.id,
  start_date: '2024-02-01',
  end_date: '2024-05-31'
});

// Add course item
await sdk.spacer.courses.addItem(course.id, {
  type: 'notebook',
  resource_id: notebook.id,
  title: 'Lesson 1: Introduction',
  order: 1,
  is_required: true,
  points: 10
});

// Enroll student
const enrollment = await sdk.spacer.enrollments.enroll(course.id);

// Get student enrollments
const studentCourses = await sdk.spacer.enrollments.getStudentEnrollments('student-id');
```

#### Assignments

```typescript
// Create assignment
const assignment = await sdk.spacer.assignments.create({
  course_id: course.id,
  notebook_id: notebook.id,
  title: 'Homework 1',
  points: 100,
  due_date: '2024-02-15'
});

// Submit assignment
const submission = await sdk.spacer.assignments.submit(
  assignment.id,
  'student-notebook-id'
);

// Grade submission
await sdk.spacer.assignments.gradeSubmission(submission.id, {
  grade: 95,
  feedback: 'Excellent work!'
});
```

#### Exercises

```typescript
// Create exercise
const exercise = await sdk.spacer.exercises.create({
  notebook_id: notebook.id,
  title: 'Practice Problem 1',
  description: 'Implement a binary search algorithm',
  points: 20,
  difficulty: 'medium',
  tags: ['algorithms', 'search']
});

// Get solution
const solution = await sdk.spacer.exercises.getSolution(exercise.id);

// Clone exercise
const clonedExercise = await sdk.spacer.exercises.clone(
  exercise.id,
  'Practice Problem 1 - Variant'
);
```

#### Datasets

```typescript
// Create dataset
const dataset = await sdk.spacer.datasets.create({
  name: 'iris-dataset',
  space_id: space.id,
  url: 'https://example.com/iris.csv',
  format: 'csv',
  metadata: {
    rows: 150,
    columns: 5
  }
});

// Upload dataset file
const uploadedDataset = await sdk.spacer.datasets.upload(file, {
  name: 'custom-data',
  space_id: space.id,
  format: 'parquet'
});

// Download dataset
const dataBlob = await sdk.spacer.datasets.download(dataset.id);
```

## Functional API Usage

The SDK provides a complete functional API for developers who prefer functional programming over OOP. All operations are available as pure functions that take the API client as the first parameter.

### Setting Up the Functional API

```typescript
import { createApiClient, runtimesApi, iamApi, spacerApi } from '@datalayer/core/api';

// Create the API client
const client = createApiClient({
  baseUrl: 'https://prod1.datalayer.run',
  token: 'your-api-token',
  timeout: 30000
});
```

### Runtimes Functional API

```typescript
import { runtimesApi } from '@datalayer/core/api';

// Environments
const { data: environments } = await runtimesApi.listEnvironments(client);
const { data: pythonEnv } = await runtimesApi.getEnvironment(client, 'python-cpu-small');

// Runtimes
const { data: runtime } = await runtimesApi.create(client, {
  environment_name: 'python-cpu-small',
  credits: 100,
  runtime_type: 'notebook'
});

const { data: runtimes } = await runtimesApi.list(client, {
  state: 'running',
  runtime_type: 'notebook',
  limit: 10,
  offset: 0
});

const { data: runtimeDetails } = await runtimesApi.get(client, runtime.pod_name);
const { data: updatedRuntime } = await runtimesApi.setState(client, runtime.pod_name, 'stopped');
await runtimesApi.delete(client, runtime.pod_name);

// Runtime Snapshots
const { data: snapshot } = await runtimesApi.createSnapshot(client, {
  runtime_id: 'runtime-123',
  name: 'My Snapshot',
  description: 'Checkpoint before experiments'
});

const { data: snapshots } = await runtimesApi.listSnapshots(client, {
  runtime_id: 'runtime-123',
  limit: 20
});

const { data: snapshotDetails } = await runtimesApi.getSnapshot(client, snapshot.id);
const { data: blob } = await runtimesApi.downloadSnapshot(client, snapshot.id);
await runtimesApi.loadSnapshot(client, {
  snapshot_id: snapshot.id,
  runtime_id: 'runtime-456'
});
await runtimesApi.deleteSnapshot(client, snapshot.id);
```

### IAM Functional API

```typescript
import { iamApi } from '@datalayer/core/api';

// Authentication
const { data: loginResponse } = await iamApi.login(client, {
  email: 'user@example.com',
  password: 'password'
});

// Update client with new token
client.updateConfig({ token: loginResponse.access_token });

await iamApi.logout(client);

const { data: newUser } = await iamApi.register(client, {
  username: 'newuser',
  email: 'newuser@example.com',
  password: 'secure-password',
  first_name: 'John',
  last_name: 'Doe'
});

const { data: refreshedAuth } = await iamApi.refresh(client, refreshToken);

// OAuth2
const { data: providers } = await iamApi.getOAuth2Providers(client);
const { data: oauthInit } = await iamApi.initiateOAuth2(client, 'github', {
  redirect_uri: 'https://myapp.com/callback'
});
const { data: oauthResult } = await iamApi.handleOAuth2Callback(
  client,
  'github',
  code,
  state
);

// User Management
const { data: currentUser } = await iamApi.getMe(client);
const { data: updatedUser } = await iamApi.updateProfile(client, {
  display_name: 'John Doe',
  avatar_url: 'https://example.com/avatar.jpg'
});

const { data: users } = await iamApi.searchUsers(client, 'john', { limit: 10 });
const { data: userById } = await iamApi.getUser(client, 'user-123');

// MFA
const { data: mfaSetup } = await iamApi.enableMFA(client);
await iamApi.verifyMFA(client, '123456');
await iamApi.disableMFA(client, '123456');

// Organizations
const { data: organizations } = await iamApi.listOrganizations(client, {
  limit: 10,
  offset: 0
});

const { data: org } = await iamApi.createOrganization(client, {
  name: 'my-org',
  display_name: 'My Organization',
  description: 'Organization description'
});

const { data: orgDetails } = await iamApi.getOrganization(client, org.id);
const { data: updatedOrg } = await iamApi.updateOrganization(client, org.id, {
  description: 'Updated description'
});

await iamApi.addOrganizationMember(client, org.id, {
  email: 'member@example.com',
  role: 'member'
});

const { data: members } = await iamApi.listOrganizationMembers(client, org.id);
await iamApi.removeOrganizationMember(client, org.id, 'user-456');
await iamApi.deleteOrganization(client, org.id);

// Teams
const { data: teams } = await iamApi.listTeams(client, org.id);
const { data: team } = await iamApi.createTeam(client, org.id, {
  name: 'dev-team',
  display_name: 'Development Team',
  members: ['user1', 'user2']
});

const { data: teamDetails } = await iamApi.getTeam(client, team.id);
await iamApi.addTeamMember(client, team.id, 'user3');
const { data: teamMembers } = await iamApi.listTeamMembers(client, team.id);
await iamApi.removeTeamMember(client, team.id, 'user3');
await iamApi.deleteTeam(client, team.id);

// Tokens
const { data: tokens } = await iamApi.listTokens(client);
const { data: token } = await iamApi.createToken(client, {
  name: 'CI/CD Token',
  expires_in: 30 * 24 * 3600,
  scopes: ['read', 'write']
});

const { data: tokenDetails } = await iamApi.getToken(client, token.id);
await iamApi.revokeToken(client, token.id);

// Secrets
const { data: secrets } = await iamApi.listSecrets(client);
const { data: secret } = await iamApi.createSecret(client, {
  name: 'database-password',
  value: 'secret-value',
  description: 'Production database password'
});

const { data: secretWithValue } = await iamApi.getSecret(client, secret.id);
const { data: updatedSecret } = await iamApi.updateSecret(client, secret.id, {
  value: 'new-secret-value'
});
await iamApi.deleteSecret(client, secret.id);

// Credits & Usage
const { data: credits } = await iamApi.getCreditBalance(client);
const { data: usage } = await iamApi.getCreditUsage(client, {
  start_date: '2024-01-01',
  end_date: '2024-01-31',
  resource_type: 'runtime'
});
```

### Spacer Functional API

```typescript
import { spacerApi } from '@datalayer/core/api';

// Spaces
const { data: spaces } = await spacerApi.listSpaces(client, {
  visibility: 'public',
  search: 'machine learning',
  limit: 20,
  offset: 0
});

const { data: space } = await spacerApi.createSpace(client, {
  name: 'ml-projects',
  description: 'Machine Learning Projects',
  visibility: 'private'
});

const { data: spaceDetails } = await spacerApi.getSpace(client, space.id);
const { data: updatedSpace } = await spacerApi.updateSpace(client, space.id, {
  description: 'Updated description'
});

await spacerApi.addSpaceMember(client, space.id, 'user-id', 'editor');
const { data: spaceMembers } = await spacerApi.listSpaceMembers(client, space.id);
await spacerApi.removeSpaceMember(client, space.id, 'user-id');

const { data: exportBlob } = await spacerApi.exportSpace(client, space.id);
await spacerApi.deleteSpace(client, space.id);

// Notebooks
const { data: notebooks } = await spacerApi.listNotebooks(client, {
  space_id: space.id,
  search: 'analysis',
  limit: 50
});

const { data: notebook } = await spacerApi.createNotebook(client, {
  name: 'Analysis.ipynb',
  space_id: space.id,
  kernel_spec: {
    name: 'python3',
    display_name: 'Python 3',
    language: 'python'
  }
});

const { data: notebookDetails } = await spacerApi.getNotebook(client, notebook.id);
const { data: notebookByUid } = await spacerApi.getNotebookByUid(client, notebook.uid);

const { data: updatedNotebook } = await spacerApi.updateNotebook(client, notebook.id, {
  name: 'Updated-Analysis.ipynb'
});

await spacerApi.updateNotebookContent(client, notebook.id, {
  cells: [...],
  metadata: {...},
  nbformat: 4,
  nbformat_minor: 5
});

const { data: cloned } = await spacerApi.cloneNotebook(client, {
  source_id: notebook.id,
  name: 'Analysis-Copy.ipynb',
  space_id: space.id
});

const { data: executionResult } = await spacerApi.executeNotebook(client, notebook.id);
await spacerApi.deleteNotebook(client, notebook.id);

// Collaboration Documents
const { data: collabDoc } = await spacerApi.getCollaborationDocument(
  client,
  notebook.uid
);

await spacerApi.updateCollaborationDocument(client, notebook.uid, {
  // Y.js update data
});

// Cells
const { data: cells } = await spacerApi.listCells(client, notebook.id);
const { data: cell } = await spacerApi.createCell(client, notebook.id, {
  cell_type: 'code',
  source: 'print("Hello, World!")',
  metadata: {}
});

const { data: cellDetails } = await spacerApi.getCell(client, notebook.id, cell.id);
const { data: updatedCell } = await spacerApi.updateCell(client, notebook.id, cell.id, {
  source: 'print("Updated!")'
});

const { data: executionOutput } = await spacerApi.executeCell(
  client,
  notebook.id,
  cell.id
);
await spacerApi.deleteCell(client, notebook.id, cell.id);

// Courses
const { data: courses } = await spacerApi.listCourses(client, {
  space_id: space.id,
  status: 'active'
});

const { data: course } = await spacerApi.createCourse(client, {
  name: 'intro-ml',
  title: 'Introduction to Machine Learning',
  space_id: space.id,
  start_date: '2024-02-01',
  end_date: '2024-05-31'
});

const { data: courseDetails } = await spacerApi.getCourse(client, course.id);
const { data: updatedCourse } = await spacerApi.updateCourse(client, course.id, {
  description: 'Updated course description'
});

await spacerApi.addCourseItem(client, course.id, {
  type: 'notebook',
  resource_id: notebook.id,
  title: 'Lesson 1: Introduction',
  order: 1,
  is_required: true,
  points: 10
});

const { data: courseItems } = await spacerApi.listCourseItems(client, course.id);
await spacerApi.deleteCourse(client, course.id);

// Enrollments
const { data: enrollment } = await spacerApi.enrollInCourse(client, course.id);
const { data: studentEnrollments } = await spacerApi.getStudentEnrollments(
  client,
  'student-id'
);
const { data: courseEnrollments } = await spacerApi.getCourseEnrollments(
  client,
  course.id
);
await spacerApi.unenroll(client, enrollment.id);

// Assignments
const { data: assignments } = await spacerApi.listAssignments(client, {
  course_id: course.id,
  status: 'active'
});

const { data: assignment } = await spacerApi.createAssignment(client, {
  course_id: course.id,
  notebook_id: notebook.id,
  title: 'Homework 1',
  points: 100,
  due_date: '2024-02-15'
});

const { data: assignmentDetails } = await spacerApi.getAssignment(client, assignment.id);
const { data: submission } = await spacerApi.submitAssignment(
  client,
  assignment.id,
  'student-notebook-id'
);

await spacerApi.gradeSubmission(client, submission.id, {
  grade: 95,
  feedback: 'Excellent work!'
});

// Exercises
const { data: exercises } = await spacerApi.listExercises(client, {
  notebook_id: notebook.id,
  difficulty: 'medium'
});

const { data: exercise } = await spacerApi.createExercise(client, {
  notebook_id: notebook.id,
  title: 'Practice Problem 1',
  description: 'Implement a binary search algorithm',
  points: 20,
  difficulty: 'medium',
  tags: ['algorithms', 'search']
});

const { data: solution } = await spacerApi.getExerciseSolution(client, exercise.id);
const { data: clonedExercise } = await spacerApi.cloneExercise(
  client,
  exercise.id,
  'Practice Problem 1 - Variant'
);

// Datasets
const { data: datasets } = await spacerApi.listDatasets(client, {
  space_id: space.id,
  format: 'csv'
});

const { data: dataset } = await spacerApi.createDataset(client, {
  name: 'iris-dataset',
  space_id: space.id,
  url: 'https://example.com/iris.csv',
  format: 'csv',
  metadata: {
    rows: 150,
    columns: 5
  }
});

const { data: uploadedDataset } = await spacerApi.uploadDataset(client, file, {
  name: 'custom-data',
  space_id: space.id,
  format: 'parquet'
});

const { data: dataBlob } = await spacerApi.downloadDataset(client, dataset.id);
await spacerApi.deleteDataset(client, dataset.id);
```

### Error Handling with Functional API

```typescript
import { createApiClient, runtimesApi } from '@datalayer/core/api';

const client = createApiClient({ token: 'your-token' });

try {
  const { data: runtime } = await runtimesApi.create(client, {
    environment_name: 'python-cpu-small',
    credits: 100
  });
  console.log('Runtime created:', runtime.pod_name);
} catch (error) {
  if (error.status === 401) {
    console.error('Authentication failed');
  } else if (error.status === 403) {
    console.error('Insufficient permissions');
  } else if (error.status === 429) {
    console.error('Rate limited');
  } else {
    console.error('API error:', error);
  }
}
```

### Advanced Functional Usage

```typescript
// Composing operations
async function createWorkspace(client, name, description) {
  // Create space
  const { data: space } = await spacerApi.createSpace(client, {
    name,
    description,
    visibility: 'private'
  });

  // Create initial notebook
  const { data: notebook } = await spacerApi.createNotebook(client, {
    name: 'Welcome.ipynb',
    space_id: space.id
  });

  // Add welcome content
  await spacerApi.createCell(client, notebook.id, {
    cell_type: 'markdown',
    source: `# Welcome to ${name}\n\n${description}`
  });

  return { space, notebook };
}

// Using with custom configurations per request
async function fetchWithTimeout(client, timeoutMs) {
  return await runtimesApi.list(client, { limit: 10 }, {
    timeout: timeoutMs
  });
}

// Batch operations
async function deleteAllRuntimes(client) {
  const { data: runtimes } = await runtimesApi.list(client);
  const deletions = runtimes.map(r =>
    runtimesApi.delete(client, r.pod_name)
  );
  await Promise.all(deletions);
}

// Working with multiple clients
const prodClient = createApiClient({
  baseUrl: 'https://prod1.datalayer.run',
  token: prodToken
});

const stagingClient = createApiClient({
  baseUrl: 'https://staging.datalayer.run',
  token: stagingToken
});

// Use different clients for different environments
const { data: prodSpaces } = await spacerApi.listSpaces(prodClient);
const { data: stagingSpaces } = await spacerApi.listSpaces(stagingClient);
```

### Functional API Benefits

1. **Pure Functions**: All API functions are pure and side-effect free
2. **Composability**: Easy to compose operations and create higher-level functions
3. **Testability**: Simple to mock and test individual functions
4. **Flexibility**: Pass different clients for different configurations
5. **Tree-shaking**: Bundle only the functions you use

## Error Handling

The SDK provides structured error handling:

```typescript
try {
  const runtime = await sdk.runtimes.create({
    environment_name: 'python-cpu-small',
    credits: 100
  });
} catch (error) {
  if (error.status === 401) {
    console.error('Authentication failed:', error.message);
  } else if (error.status === 403) {
    console.error('Permission denied:', error.message);
  } else if (error.status === 429) {
    console.error('Rate limited:', error.message);
  } else if (error.code === 'TIMEOUT') {
    console.error('Request timeout');
  } else {
    console.error('API error:', error);
  }
}
```

## Request Configuration

### Timeouts

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  timeout: 60000 // 60 seconds
});

// Per-request timeout
const runtime = await sdk.runtimes.create(data, {
  timeout: 120000 // 2 minutes for this request
});
```

### Custom Headers

```typescript
const sdk = new DatalayerSDK({
  token: 'your-token',
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

### Request Cancellation

```typescript
const sdk = new DatalayerSDK({ token: 'your-token' });

// Start a long-running request
const promise = sdk.runtimes.create(data);

// Cancel the request
sdk.client.cancelRequest('POST', '/api/runtimes/v1/runtimes');

// Cancel all pending requests
sdk.client.cancelAllRequests();
```

## TypeScript Support

The SDK is written in TypeScript and provides comprehensive type definitions:

```typescript
import type {
  Runtime,
  Environment,
  User,
  Organization,
  Space,
  Notebook,
  Course
} from '@datalayer/core/api/types';

// Type-safe API usage
const createRuntime = async (env: Environment): Promise<Runtime> => {
  return await sdk.runtimes.create({
    environment_name: env.name,
    credits: 100,
    runtime_type: 'notebook'
  });
};
```

## Migration from Legacy API

If you're migrating from the old `apiv1` directory:

```typescript
// Old way (apiv1)
import { requestDatalayerAPI } from '@datalayer/core/apiv1';
const response = await requestDatalayerAPI('/api/runtimes/v1/runtimes', {
  method: 'POST',
  body: JSON.stringify(data)
});

// New way (api)
import { DatalayerSDK } from '@datalayer/core/api';
const sdk = new DatalayerSDK({ token });
const runtime = await sdk.runtimes.create(data);
```

## API Endpoints Reference

### Base URLs

- Production: `https://prod1.datalayer.run`
- Staging: `https://staging.datalayer.run`
- Development: `http://localhost:8000`

### Service Endpoints

#### Runtimes Service (`/api/runtimes/v1`)
- `GET /environments` - List environments
- `GET /environments/{name}` - Get environment
- `POST /runtimes` - Create runtime
- `GET /runtimes` - List runtimes
- `GET /runtimes/{pod_name}` - Get runtime
- `PUT /runtimes/{pod_name}` - Update runtime state
- `DELETE /runtimes/{pod_name}` - Delete runtime
- `GET /runtime-snapshots` - List snapshots
- `POST /runtime-snapshots` - Create snapshot
- `GET /runtime-snapshots/{id}` - Get snapshot
- `DELETE /runtime-snapshots/{id}` - Delete snapshot

#### IAM Service (`/api/iam/v1`)
- `POST /login` - User login
- `POST /logout` - User logout
- `POST /register` - Register user
- `GET /me` - Get current user
- `PATCH /me` - Update profile
- `GET /organizations` - List organizations
- `POST /organizations` - Create organization
- `GET /tokens` - List tokens
- `POST /tokens` - Create token
- `GET /secrets` - List secrets
- `POST /secrets` - Create secret
- `GET /credits` - Get credit balance
- `GET /credits/usage` - Get usage history

#### Spacer Service (`/api/spacer/v1`)
- `GET /spaces` - List spaces
- `POST /spaces` - Create space
- `GET /notebooks` - List notebooks
- `POST /notebooks` - Create notebook
- `GET /notebooks/uid/{uid}` - Get notebook by UID
- `GET /courses` - List courses
- `POST /courses` - Create course
- `GET /assignments` - List assignments
- `POST /assignments` - Create assignment
- `GET /exercises` - List exercises
- `POST /exercises` - Create exercise
- `GET /datasets` - List datasets
- `POST /datasets` - Create dataset
- `GET /documents/{uid}` - Get collaboration document
- `PUT /documents/{uid}` - Update collaboration document

## Best Practices

1. **Token Management**: Store tokens securely, never in code
2. **Error Handling**: Always wrap API calls in try-catch blocks
3. **Rate Limiting**: Implement exponential backoff for retries
4. **Resource Cleanup**: Delete runtimes when done to save credits
5. **Batch Operations**: Use list endpoints with appropriate filters
6. **Caching**: Cache environment lists and user data when appropriate
7. **Collaboration**: Use notebook UIDs for real-time collaboration
8. **Type Safety**: Leverage TypeScript types for compile-time safety

## Support

- API Documentation: https://prod1.datalayer.run/api/docs
- GitHub Issues: https://github.com/datalayer/core/issues
- Community Forum: https://community.datalayer.io
- Email Support: support@datalayer.io