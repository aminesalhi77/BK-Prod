'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '@/components/ModuleLayout/ModuleLayout';
import { useApp } from '@/context/AppContext';
import NotificationBell from '@/components/NotificationBell';

export default function EmballageLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useApp();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navItems = [
    { label: 'Menu', icon: '🏠', href: '/emballage/menu' },
    { label: 'Saisie Emballage', icon: '📦', href: '/emballage/saisie' },
    { label: 'Traçabilité', icon: '🔍', href: '/emballage/tracabilite' },
    { label: 'Déconnexion', icon: '🚪', onClick: handleLogout },
  ];

  const topRightActions = [
    <NotificationBell key="notifications" />,
  ];

  const fabItems = [
    { label: 'Nouvelle Saisie', icon: '📦', href: '/emballage/saisie' },
    { label: 'Recherche Barcode', icon: '🔍', href: '/emballage/tracabilite' },
  ];

  return (
    <ModuleLayout 
      title="EMBALLAGE - Conditionnement Final" 
      navItems={navItems}
      fabItems={fabItems}
      topRightActions={topRightActions}
    >
      {children}
    </ModuleLayout>
  );
}
