// app/(administration)/missions/[id]/edit/page.tsx
import EditMissionClient from '@/components/missions/EditMissionClient';
import { Suspense } from 'react';

// This server component's only job is to render the client component.
// The client component handles its own data fetching via hooks.
// A Suspense boundary is used to handle the client component's loading state.
export default function EditMissionPage() {
  return (
    <Suspense fallback={
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Chargement de la mission...</p>
          </div>
        </div>
      </div>
    }>
      <EditMissionClient />
    </Suspense>
  );
}