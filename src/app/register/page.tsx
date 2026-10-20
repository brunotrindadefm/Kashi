'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Public registration is disabled in Single-Owner Mode.
 * Any visit to /register redirects immediately to /login.
 */
export default function RegisterRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login');
  }, [router]);

  return null;
}
