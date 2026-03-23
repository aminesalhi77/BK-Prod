'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './admin.module.css';
import { LogOut } from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useApp();

  // ── ROLE GUARD: only Super Admins can access /admin/* ──────────────────
  React.useEffect(() => {
    if (user) {
      const allowed = ['SUPER_ADMIN_IT', 'SUPER_ADMIN'];
      if (!allowed.includes(user.role)) {
        // Kick out anyone without the right role
        router.replace('/');
      }
    }
  }, [user, router]);

  // Show nothing while checking
  if (!user || !['SUPER_ADMIN_IT', 'SUPER_ADMIN'].includes(user.role)) {
    return null;
  }

  const navItems = [
    { label: 'Dashboard', icon: '📊', href: '/admin/dashboard' },
    { label: 'Utilisateurs', icon: '👥', href: '/admin/users' },
    { label: 'Traçabilité', icon: '🔍', href: '/admin/search' },
    { label: 'Paramètres', icon: '⚙️', href: '/admin/settings' },
    { label: '🤖 IA Production', icon: '🤖', href: '/admin/ai' },
  ];

  return (
    <div className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <div className={styles.header}>
          <img src="public/logo-bk.svg" alt="BK" />
          <span>ADMIN PANEL</span>
        </div>
        <nav className={styles.nav}>
          {navItems.map(item => (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>
        <div className={styles.footer}>
          <div className={styles.user}>
            <strong>{user?.name}</strong>
            <span>{user?.role}</span>
          </div>
          <button onClick={logout}>Déconnexion</button>
        </div>
      </aside>
      <main className={styles.main}>
        <header className={styles.topBar}>
          <h2>{navItems.find(i => i.href === pathname)?.label || 'Admin'}</h2>
        </header>
        <div className={styles.content}>{children}</div>
      </main>
    </div>
  );
}
