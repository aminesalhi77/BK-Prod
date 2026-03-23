'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '@/components/ModuleLayout/ModuleLayout';
import { useApp } from '@/context/AppContext';
import NotificationBell from '@/components/NotificationBell';

export default function AutoclaveLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useApp();
  const router = useRouter();


  const navItems = [
    { label: 'Menu', icon: '🏠', href: '/autoclave/menu' },
    { label: 'Chargement', icon: '📥', href: '/autoclave/chargement' },
    { label: 'Fin de Cycle', icon: '🏁', href: '/autoclave/fin-cycle' },
    { label: 'Historique', icon: '📜', href: '/autoclave/historique' },
    { label: 'Déconnexion', icon: '🚪', onClick: logout },
  ];

  const topRightActions = [
    <NotificationBell key="notifications" />,
  ];

  const fabItems = [
    { label: 'Nouveau Chargement', icon: '📥', href: '/autoclave/chargement' },
    { label: 'Terminer Cycle', icon: '🏁', href: '/autoclave/fin-cycle' },
  ];

  return (
    <ModuleLayout 
      title="AUTOCLAVE - Stérilisation" 
      navItems={navItems}
      fabItems={fabItems}
      topRightActions={topRightActions}
    >
      {children}
    </ModuleLayout>
  );
}
