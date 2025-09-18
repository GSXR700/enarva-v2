// components/DebugAuth.tsx - Composant temporaire de debug
'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function DebugAuth() {
  const { data: session, status } = useSession();

  useEffect(() => {
    console.log('🔍 Auth Debug:', {
      status,
      session: session ? {
        user: session.user,
        expires: session.expires
      } : null
    });
  }, [session, status]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 bg-black/80 text-white p-2 text-xs z-[9999] max-w-xs">
      <div>Status: {status}</div>
      <div>User: {session?.user?.email || 'None'}</div>
      <div>Role: {(session?.user as any)?.role || 'None'}</div>
      <div>ID: {(session?.user as any)?.id || 'None'}</div>
    </div>
  );
}