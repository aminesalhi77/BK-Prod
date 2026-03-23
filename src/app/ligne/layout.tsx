'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ModuleLayout from '@/components/ModuleLayout/ModuleLayout';
import { useApp } from '@/context/AppContext';
import NotificationBell from '@/components/NotificationBell';

export default function LigneLayout({ children }: { children: React.ReactNode }) {
  const { logout } = useApp();
  const router = useRouter();

  const navItems = [
    { label: 'Menu', icon: '🏠', href: '/ligne/menu' },
    { label: 'Entrée Palette', icon: '📥', href: '/ligne/entree-palette' },
    { label: 'Sortie Chariot', icon: '🛒', href: '/ligne/sortie-chariot' },
    { label: 'Visuel Ligne', icon: '👁️', href: '/ligne/visuel' },
    { label: 'Déconnexion', icon: '🚪', onClick: logout },
  ];

  const topRightActions = [
    <NotificationBell key="notifications" />,
  ];

  const fabItems = [
    { label: 'Nouvelle Sortie Chariot', icon: '🛒', href: '/ligne/sortie-chariot' },
    { label: 'Consommer Palette', icon: '📥', href: '/ligne/entree-palette' },
  ];

  return (
    <ModuleLayout 
      title="LIGNE DE PRODUCTION THON" 
      navItems={navItems}
      fabItems={fabItems}
      topRightActions={topRightActions}
    >
      {children}
    </ModuleLayout>
  );
}
