'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './pending.module.css';

export default function PendingApprovalPage() {
  const router = useRouter();
  const { logout, theme, toggleTheme, language, toggleLanguage, t } = useApp();

  

  return (
    <div className={styles.container}>
      {/* Banner with theme, language, and logout buttons */}
      <div className={styles.banner}>
        <div className={styles.bannerActions}>
          <button onClick={toggleTheme} className={styles.themeBtn} title="Toggle theme">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={toggleLanguage} className={styles.languageBtn} title="Toggle language">
            🌐
          </button>
          <button onClick= {logout} className={styles.logoutBtn} title="Logout">
            🚪
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.icon}>🕒</div>
        <h1>En attente d'approbation</h1>
        <p>Votre inscription a été reçue. Un administrateur doit approuver votre compte avant que vous ne puissiez vous connecter.</p>
        <button onClick={() => router.push('/login')} className="pda-btn pda-btn-primary">
          Retour à la connexion
        </button>
      </div>
    </div>
  );
}
