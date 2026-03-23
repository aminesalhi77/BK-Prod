'use client';

import React, { useEffect } from 'react';

import { useRouter, usePathname } from 'next/navigation';
import ModuleLayout from '@/components/ModuleLayout/ModuleLayout';
import { useApp } from '@/context/AppContext';
import NotificationBell from '@/components/NotificationBell';

export default function ChambreLayout({ children }: { children: React.ReactNode }) {
  const { activeShift, isHydrated, user, logout } = useApp();
  const router = useRouter();
  const pathname = usePathname();

  // Shift start is no longer mandatory
  useEffect(() => {
    // Redirection removed as per user request
    console.log('Chambre session active for worker:', user?.matricule);
  }, [user]);


  const navItems = [
    { label: 'Menu', icon: '🏠', href: '/chambre/menu' },
    { label: 'Visuel', icon: '👁️', href: '/chambre/visuel' },
    { label: 'KPIs', icon: '📈', href: '/chambre/indicateurs' },
    { label: 'Déconnexion', icon: '🚪', onClick: logout },
  ];

  const topRightActions = [
    <NotificationBell key="notifications" />,
  ];

  const fabItems = [
    { label: 'Nouvelle Entrée', icon: '📥', href: '/chambre/entree-palette' },
    { label: 'Scanner Sortie', icon: '📤', href: '/chambre/sortie-palette' },
   
  ];

  return (
    <ModuleLayout 
      title="CHAMBRE 0 - Stock Froid" 
      navItems={navItems}
      fabItems={fabItems}
      topRightActions={topRightActions}
    >
      {children}
    </ModuleLayout>
  );
}

