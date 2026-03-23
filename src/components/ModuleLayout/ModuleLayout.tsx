'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './layout.module.css';

interface NavItem {
  label: string;
  icon: string;
  href?: string;
  onClick?: () => void;
}

export default function ModuleLayout({
  children,
  title,
  navItems,
  fabItems,
  topRightActions,
}: {
  children: React.ReactNode;
  title: string;
  navItems: NavItem[];
  fabItems: NavItem[];
  topRightActions?: React.ReactNode[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, toggleTheme, theme } = useApp();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className={styles.wrapper}>
      {/* Desktop Sidebar */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.collapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <img src="/logo-bk.svg" alt="BK" className={styles.sidebarLogo} />
          {!sidebarCollapsed && <span>BK FOOD</span>}
        </div>
        
        <nav className={styles.sidebarNav}>
          {navItems.map((item) => {
            if (item.href) {
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`${styles.navItem} ${pathname === item.href ? styles.active : ''}`}
                >
                  <span className={styles.navIcon}>{item.icon}</span>
                  {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
                </Link>
              );
            }
            return (
              <button 
                key={item.label} 
                onClick={item.onClick}
                className={styles.navItem}
                style={{ background: 'none', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer' }}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                {!sidebarCollapsed && <span className={styles.navLabel}>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={toggleTheme} className={styles.footerBtn}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={handleLogout} className={styles.footerBtn}>🚪</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={styles.main}>
        {/* Top Bar (Desktop) */}
        <header className={styles.topBar}>
          <button 
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            ☰
          </button>
          <h2 className={styles.pageTitle}>{title}</h2>
          <div className={styles.topRightContainer}>
            {topRightActions && topRightActions.length > 0 && (
              <div className={styles.topRightActions}>
                {topRightActions}
              </div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user?.name}</span>
              <span className={styles.userBadge}>{user?.role}</span>
            </div>
          </div>
        </header>

        <div className={styles.content}>
          {children}
        </div>

        {/* Mobile Bottom Nav */}
        <nav className={styles.bottomNav}>
          {navItems.map((item) => {
            if (item.href) {
              return (
                <Link 
                  key={item.href} 
                  href={item.href}
                  className={`${styles.bottomNavItem} ${pathname === item.href ? styles.active : ''}`}
                >
                  <span className={styles.bottomNavIcon}>{item.icon}</span>
                  <span className={styles.bottomNavLabel}>{item.label}</span>
                </Link>
              );
            }
            return (
              <button 
                key={item.label} 
                onClick={item.onClick}
                className={styles.bottomNavItem}
              >
                <span className={styles.bottomNavIcon}>{item.icon}</span>
                <span className={styles.bottomNavLabel}>{item.label}</span>
              </button>
            );
          })}
          
          {/* Explicit Global Logout Button if not already in navItems */}
          {!navItems.some(item => item.label === 'Déconnexion') && (
            <button onClick={handleLogout} className={styles.bottomNavItem}>
              <span className={styles.bottomNavIcon}>🚪</span>
              <span className={styles.bottomNavLabel}>Déconnexion</span>
            </button>
          )}
        </nav>

        {/* Mobile FAB */}
        <div className={styles.fabContainer}>
          {fabOpen && (
            <div className={styles.fabMenu}>
              {fabItems.map((item, idx) => {
                const style = { '--idx': idx } as React.CSSProperties;
                if (item.href) {
                  return (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      className={styles.fabSubItem}
                      style={style}
                      onClick={() => setFabOpen(false)}
                    >
                      <span className={styles.fabSubIcon}>{item.icon}</span>
                      <span className={styles.fabSubLabel}>{item.label}</span>
                    </Link>
                  );
                }
                return (
                  <button 
                    key={item.label} 
                    className={styles.fabSubItem}
                    style={style}
                    onClick={() => { item.onClick?.(); setFabOpen(false); }}
                  >
                    <span className={styles.fabSubIcon}>{item.icon}</span>
                    <span className={styles.fabSubLabel}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
          <button 
            className={`${styles.fab} ${fabOpen ? styles.fabActive : ''}`}
            onClick={() => setFabOpen(!fabOpen)}
          >
            {fabOpen ? '✕' : '＋'}
          </button>
        </div>
      </main>
    </div>
  );
}
