'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './page.module.css';

function getRedirectPath(role: string, assignedModule?: string | null): string {
  if (role === 'SUPER_ADMIN_IT' || role === 'SUPER_ADMIN') return '/admin/users';
  if (role === 'ADMIN_PRODUCTION' || role === 'ADMIN') return '/dashboard/admin';
  if (role === 'RESPONSABLE_CONDITIONNEMENT') return '/dashboard/responsable';
  const moduleBase = assignedModule?.toLowerCase();
  if (moduleBase && moduleBase !== 'admin') return `/${moduleBase}/menu`;
  return '/dashboard/worker';
}

export default function LoginPage() {
  const router = useRouter();
  const { login, theme, toggleTheme } = useApp();
  const [loginType, setLoginType] = useState<'matricule' | 'email'>('matricule');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const scanner = useScannerInput({
    onScan: (code) => {
      setIdentifier(code);
      setLoginType('matricule');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = loginType === 'matricule'
        ? '/api/auth/login-matricule'
        : '/api/auth/login-email';

      const body = loginType === 'matricule'
        ? { matricule: identifier, password }
        : { email: identifier, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur de connexion');
      }

      // Save user + token to context/localStorage
      login(data.user, data.token);

      // Redirect immediately — cookie is already set by the API response
      window.location.href = getRedirectPath(data.user.role, data.user.assignedModule);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.loginBox}>
        <div className={styles.header}>
          <img src="/logo-bk.svg" alt="BK Food" className={styles.logo} />
          <h1>BK FOOD</h1>
          <p className={styles.subtitle}>Traceability System v4.0</p>
        </div>

        <div className={styles.toggleRow}>
          <button
            className={`${styles.toggleBtn} ${loginType === 'matricule' ? styles.active : ''}`}
            onClick={() => { setLoginType('matricule'); setIdentifier(''); }}
          >
            Ouvrier
          </button>
          <button
            className={`${styles.toggleBtn} ${loginType === 'email' ? styles.active : ''}`}
            onClick={() => { setLoginType('email'); setIdentifier(''); }}
          >
            Admin
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>
              {loginType === 'matricule' ? 'Matricule (Scanner ou saisir)' : 'Email'}
            </label>
            <input
              type={loginType === 'matricule' ? 'text' : 'email'}
              className="pda-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={loginType === 'matricule' ? 'Ex: ADMIN001' : 'nom@bkfood.tn'}
              required
              {...(loginType === 'matricule' ? scanner.bindInput : {})}
              autoFocus
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Mot de passe</label>
            <input
              type="password"
              className="pda-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="pda-btn pda-btn-primary" disabled={loading}>
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>

        <div className={styles.footer}>
          <button onClick={() => router.push('/register')} className={styles.footerLink}>
            S'inscrire
          </button>
          <button onClick={toggleTheme} className={styles.themeToggle}>
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </div>
    </div>
  );
}