'use client';

import React from 'react';
import { useApp } from '@/context/AppContext';
import { useRouter } from 'next/navigation';

export default function WorkerDashboard() {
  const { user, logout } = useApp();
  const router = useRouter();

  const handleGoToModule = () => {
    if (user?.assignedModule) {
      router.push(`/${user.assignedModule.toLowerCase()}/menu`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Bienvenue, {user?.name}</h1>
      <p>Poste : {user?.assignedModule || 'Non assigné'}</p>
      
      {user?.assignedModule ? (
        <button 
          onClick={handleGoToModule}
          className="pda-btn pda-btn-primary"
          style={{ marginTop: '2rem' }}
        >
          Accéder à mon poste
        </button>
      ) : (
        <div style={{ marginTop: '1rem' }}>
          <p style={{ color: 'red' }}>
            Veuillez contacter un administrateur pour assigner votre poste.
          </p>
          <button 
            onClick={handleLogout}
            className="pda-btn pda-btn-secondary"
            style={{ marginTop: '2rem', background: '#94a3b8', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.5rem', cursor: 'pointer' }}
          >
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
