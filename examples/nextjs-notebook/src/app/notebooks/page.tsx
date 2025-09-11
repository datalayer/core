/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

'use client';

import dynamicImport from 'next/dynamic';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic';

// Import all potentially problematic dependencies dynamically
const DynamicNotebooksContent = dynamicImport(
  () => import('./NotebooksContent'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '50vh',
        }}
      >
        <div>Loading notebooks...</div>
      </div>
    ),
  },
);

export default function NotebooksPage() {
  return <DynamicNotebooksContent />;
}
