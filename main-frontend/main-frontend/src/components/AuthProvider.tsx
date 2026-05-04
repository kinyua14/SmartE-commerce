'use client';

import { useAuth } from '@clerk/nextjs';
import { useEffect } from 'react';
import { setAuthTokenGetter } from '@/lib/api';

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    console.log('[AuthProvider] isLoaded:', isLoaded, '| isSignedIn:', isSignedIn);
    if (isLoaded) {
      setAuthTokenGetter(getToken);
      console.log('[AuthProvider] Token getter registered ✅');
    }
  }, [getToken, isLoaded, isSignedIn]);

  return <>{children}</>;
}