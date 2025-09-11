/*
 * Copyright (c) 2023-2025 Datalayer, Inc.
 * Distributed under the terms of the Modified BSD License.
 */

'use client';

import dynamicImport from 'next/dynamic';

// Disable static generation for this page since it requires authentication
export const dynamic = 'force-dynamic';

// Import all potentially problematic dependencies dynamically
const DynamicWelcomeContent = dynamicImport(() => import('./WelcomeContent'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
      }}
    >
      <div>Loading...</div>
    </div>
  ),
});

export default function WelcomePage() {
  return <DynamicWelcomeContent />;
}
