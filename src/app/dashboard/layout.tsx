'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import NotificationBell from '@/components/NotificationBell';
import styles from './DashboardLayout.module.css';

// ── Navigation Config ──────────────────────────────────────────────────
const NAV_ITEMS = {
  WORKER: [
    { href: '/dashboard/worker', icon: '🏭', label: 'worker', mobileOrder: 1 },
  ],
  RESPONSABLE_CONDITIONNEMENT: [
    { href: '/dashboard/responsable', icon: '🏠', label: 'dashboard', mobileOrder: 1 },
    { href: '/chambre/menu', icon: '❄️', label: 'chambre_title', mobileOrder: 2 },
    { href: '/ligne/menu', icon: '🏭', label: 'ligne_title', mobileOrder: 3 },
    { href: '/dashboard/traceability', icon: '🔍', label: 'tracking', mobileOrder: 4 },
    { href: '/logout', icon: '🚪', label: 'logout', mobileOrder: 5 },
  ],
  ADMIN_PRODUCTION: [
    { href: '/dashboard/admin', icon: '📊', label: 'dashboard', mobileOrder: 1 },
    { href: '/dashboard/reports', icon: '📈', label: 'reports', mobileOrder: 2 },
    { href: '/dashboard/traceability', icon: '🔍', label: 'tracking', mobileOrder: 3 },
  ],
  SUPER_ADMIN_IT: [
    { href: '/admin/users', icon: '👥', label: 'users', mobileOrder: 1 },
    { href: '/dashboard/admin', icon: '📊', label: 'dashboard', mobileOrder: 2 },
    { href: '/dashboard/traceability', icon: '🔍', label: 'tracking', mobileOrder: 3 },
    { href: '/dashboard/system', icon: '⚙️', label: 'system', mobileOrder: 4 },
  ],
};

// Map legacy roles to new internal roles for navigation
const GET_NAV_ROLE = (role: string) => {
  if (role === 'SUPER_ADMIN') return 'SUPER_ADMIN_IT';
  if (role === 'ADMIN') return 'ADMIN_PRODUCTION';
  if (role === 'CHEF_LIGNE' || role === 'CHEF_EMBALLAGE') return 'RESPONSABLE_CONDITIONNEMENT';
  return role as keyof typeof NAV_ITEMS;
};

// FAB quick-actions for workers on mobile
const WORKER_FAB_ACTIONS = [
  { href: '/dashboard/station/parrage', icon: '⚖️', label: 'parrage', color: '#eab308' },
  { href: '/dashboard/station/mise-en-boite', icon: '📦', label: 'miseEnBoite', color: '#8b5cf6' },
  { href: '/dashboard/station/autoclavage', icon: '🔥', label: 'autoclavage', color: '#22c55e' },
];

// ── Component ──────────────────────────────────────────────────────────
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, theme, toggleTheme, language, toggleLanguage, t, isOnline, offlineQueue } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close FAB on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setFabOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setFabOpen(false);
  }, [pathname]);

  const currentNavRole = GET_NAV_ROLE(user?.role || 'WORKER');
  const navItems = NAV_ITEMS[currentNavRole] || NAV_ITEMS.WORKER;
  const isActive = (href: string) =>
    href === '/dashboard' ? pathname === '/dashboard' : pathname.startsWith(href);

  const roleLabel: Record<string, string> = {
    WORKER: t('role_worker'),
    RESPONSABLE_CONDITIONNEMENT: t('role_resp_cond'),
    ADMIN_PRODUCTION: t('role_admin_prod'),
    SUPER_ADMIN_IT: t('role_super_admin'),
    ADMIN: t('role_admin_prod'),
    SUPER_ADMIN: t('role_super_admin'),
  };

  const roleColor: Record<string, string> = {
    WORKER: '#22c55e',
    RESPONSABLE_CONDITIONNEMENT: '#3b82f6',
    ADMIN_PRODUCTION: '#8b5cf6',
    SUPER_ADMIN_IT: '#f43f5e',
    ADMIN: '#8b5cf6',
    SUPER_ADMIN: '#f43f5e',
  };

  const initials = user?.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) ?? '??';

  // Bottom nav items (max 4 + FAB slot)
  const bottomItems = navItems.slice(0, 4) as any[];

  // Handle logout navigation
  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <div className={styles.shell} data-sidebar-collapsed={sidebarCollapsed}>
      {/* ── Offline banner ─────────────────────────────────────────── */}
      {!isOnline && (
        <div className={styles.offlineBanner}>
          <span>📵</span>
          <span>Hors-ligne — {offlineQueue.length} entrée(s) en attente</span>
        </div>
      )}

      {/* ══ DESKTOP SIDEBAR ════════════════════════════════════════════ */}
      <aside className={`${styles.sidebar} ${sidebarCollapsed ? styles.sidebarCollapsed : ''} desktop-only`}>
        {/* Logo */}
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>🐟</div>
            {!sidebarCollapsed && (
              <div className={styles.logoText}>
                <span className={styles.logoName}>BK TRACKER</span>
              </div>
            )}
          </div>
          <button
            className={styles.collapseBtn}
            onClick={() => setSidebarCollapsed(p => !p)}
            aria-label="Toggle sidebar"
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        {/* Nav */}
        <nav className={styles.sidebarNav}>
          {!sidebarCollapsed && (
            <div className={styles.navSection}>
              Navigation
              <span
                className={styles.rolePill}
                style={{ background: roleColor[user?.role ?? 'WORKER'] }}
              >
                {user?.role}
              </span>
            </div>
          )}
          {navItems.map((item: any) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item.href) ? styles.navActive : ''}`}
              title={sidebarCollapsed ? t(item.label) : undefined}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              {!sidebarCollapsed && <span className={styles.navLabel}>{t(item.label)}</span>}
              {isActive(item.href) && !sidebarCollapsed && (
                <span className={styles.activeBar} />
              )}
            </Link>
          ))}
        </nav>

        {/* Footer */}
        <div className={styles.sidebarFooter}>
          {/* Theme + Language toggles */}
          <div className={styles.footerControls}>
            <button
              className={styles.controlBtn}
              onClick={toggleTheme}
              title="Toggle theme"
            >
              {theme === 'light' ? '🌙' : '☀️'}
              {!sidebarCollapsed && <span>{theme === 'light' ? 'Mode sombre' : 'Mode clair'}</span>}
            </button>
            <button
              className={styles.controlBtn}
              onClick={toggleLanguage}
              title="Toggle language"
            >
              🌐
              {!sidebarCollapsed && <span>{language === 'fr' ? 'العربية' : 'Français'}</span>}
            </button>
          </div>

          {/* User card */}
          {!sidebarCollapsed && user && (
            <div className={styles.userCard}>
              <div
                className={styles.userAvatar}
                style={{ background: roleColor[user.role] }}
              >
                {initials}
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{user.name}</span>
                <span className={styles.userRole}>{roleLabel[user.role]}</span>
              </div>
            </div>
          )}

          <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={logout}>
            <span className={styles.navIcon}>🚪</span>
            {!sidebarCollapsed && <span className={styles.navLabel}>{t('logout')}</span>}
          </button>
        </div>
      </aside>

      {/* ══ MAIN CONTENT ═══════════════════════════════════════════════ */}
      <main className={styles.main}>
        {/* Desktop topbar */}
        <header className={`${styles.topbar} desktop-only`}>
          <div className={styles.topbarLeft}>
            <h1 className={styles.pageTitle}>
              {navItems.find((i: any) => isActive(i.href))
                ? t((navItems.find((i: any) => isActive(i.href)) as any)!.label)
                : 'BK FOOD'}
            </h1>
          </div>
          <div className={styles.topbarRight}>
            {offlineQueue.length > 0 && (
              <span className={styles.queueBadge}>
                ⏳ {offlineQueue.length} en attente
              </span>
            )}
            <NotificationBell />
            {user && (
              <div className={styles.topbarUser}>
                <div
                  className={styles.topbarAvatar}
                  style={{ background: roleColor[user.role] }}
                >
                  {initials}
                </div>
                <span>{user.name}</span>
              </div>
            )}
          </div>
        </header>
       
        {/* Mobile topbar */}
        <header className={`${styles.mobileTopbar} mobile-only`}>
          <div className={styles.fishIcon}>🐟</div>
          <span className={styles.mobileAppName}>BK FOOD</span>
          <div className={styles.mobileHeaderActions}>
            <button onClick={toggleTheme} className={styles.headerActionBtn}>
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button onClick={toggleLanguage} className={styles.headerActionBtn}>
              🌐
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          {children}
        </div>
      </main>

      {/* ══ MOBILE BOTTOM NAV ══════════════════════════════════════════ */}
      <nav className={`${styles.bottomNav} mobile-only`}>
        {/* Left 2 items */}
        {bottomItems.slice(0, 2).map((item: any) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavItem} ${isActive(item.href) ? styles.bottomNavActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{t(item.label)}</span>
          </Link>
        ))}

        {/* ── FAB (center) ─────────────────────────────────────────── */}
        <div className={styles.fabWrapper} ref={fabRef}>
          {/* FAB radial menu items */}
          {fabOpen && WORKER_FAB_ACTIONS.map((action, i) => {
            const angles = [-90, -45, 0, 45, 90];
            const angle = angles[i] ?? -90 + (i * 45);
            const rad = (angle - 90) * (Math.PI / 180);
            const radius = 90;
            const x = Math.round(Math.cos(rad) * radius);
            const y = Math.round(Math.sin(rad) * radius);
            return (
              <Link
                key={action.href}
                href={action.href}
                className={styles.fabMenuItem}
                style={{
                  transform: `translate(${x}px, ${y}px)`,
                  background: action.color,
                  animationDelay: `${i * 40}ms`,
                }}
                onClick={() => setFabOpen(false)}
              >
                <span>{action.icon}</span>
              </Link>
            );
          })}

          {/* FAB button */}
          <button
            className={`${styles.fab} ${fabOpen ? styles.fabOpen : ''}`}
            onClick={() => setFabOpen(p => !p)}
            aria-label="Quick actions"
          >
            <span className={styles.fabIcon}>{fabOpen ? '✕' : '⊕'}</span>
          </button>

          {/* FAB labels shown when open */}
          {fabOpen && (
            <div className={styles.fabLabels}>
              {WORKER_FAB_ACTIONS.map((a, i) => (
                <span
                  key={a.href}
                  className={styles.fabLabel}
                  style={{ animationDelay: `${i * 40}ms` }}
                >
                  {t(a.label)}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Right 2 items */}
        {bottomItems.slice(2, 4).map((item: any) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.bottomNavItem} ${isActive(item.href) ? styles.bottomNavActive : ''}`}
          >
            <span className={styles.bottomNavIcon}>{item.icon}</span>
            <span className={styles.bottomNavLabel}>{t(item.label)}</span>
          </Link>
        ))}
        
        {/* Logout button for RESPONSABLE_CONDITIONNEMENT - Always visible */}
        <button
          className={`${styles.bottomNavItem} ${styles.logoutBtn}`}
          onClick={handleLogout}
          aria-label="Logout"
        >
          <span className={styles.bottomNavIcon}>🚪</span>
          <span className={styles.bottomNavLabel}>{t('logout')}</span>
        </button>
      </nav>

      {/* Mobile overlay */}
      {fabOpen && (
        <div
          className={`${styles.fabOverlay} mobile-only`}
          onClick={() => setFabOpen(false)}
        />
      )}
    </div>
  );
}
