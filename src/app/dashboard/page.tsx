'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Legacy Dashboard Redirect
 * Ensures that if any parts of the app or cached sessions point to the old /dashboard path,
 * they are automatically routed to the new /admin/dashboard.
 */
export default function DashboardIndex() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      fontFamily: 'var(--font-exo-2), sans-serif',
      color: 'var(--maritime-blue)'
    }}>
      <p>Redirection vers le panneau d'administration...</p>
    </div>
  );
}
