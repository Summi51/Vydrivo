'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

async function csrfToken() {
  const response = await fetch('/api/v1/auth/csrf', { credentials: 'same-origin', cache: 'no-store' });
  if (!response.ok) throw new Error('CSRF unavailable');
  const payload = await response.json();
  return payload.data.csrfToken;
}

export default function SessionKeeper() {
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const token = await csrfToken();
        const response = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
          body: '{}',
        });
        if (!response.ok) {
          if (!cancelled) router.replace('/sign-in?expired=1');
          return;
        }
        if (!cancelled) router.refresh();
      } catch {
        if (!cancelled) router.replace('/sign-in?expired=1');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
