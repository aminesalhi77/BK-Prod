'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './register.module.css';

export default function RegisterPage() {
  const router = useRouter();
  const { t } = useApp();
  const [formData, setFormData] = useState({
    matricule: '',
    email: '',
    password: '',
    name: '',
    role: 'WORKER',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur d\'inscription');
      }

      router.push('/pending-approval');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.registerBox}>
        <div className={styles.header}>
          <h1>Inscription</h1>
          <p>Créez votre compte BK Food</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.errorBanner}>{error}</div>}

          <div className={styles.inputGroup}>
            <label className={styles.label}>Nom complet</label>
            <input
              name="name"
              type="text"
              className="pda-input"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Matricule</label>
            <input
              name="matricule"
              type="text"
              className="pda-input"
              value={formData.matricule}
              onChange={handleChange}
              required
              placeholder="Ex: ADMIN001"
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Email (Optionnel pour ouvriers)</label>
            <input
              name="email"
              type="email"
              className="pda-input"
              value={formData.email}
              onChange={handleChange}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Rôle souhaité</label>
            <select 
              name="role" 
              className="pda-input" 
              value={formData.role}
              onChange={handleChange}
              required
            >
              <option value="WORKER">Ouvrier / Opérateur</option>
              <option value="RESPONSABLE_CONDITIONNEMENT">Responsable Conditionnement</option>
              <option value="ADMIN_PRODUCTION">Admin Production</option>
              <option value="SUPER_ADMIN_IT">Super Admin IT</option>
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.label}>Mot de passe</label>
            <input
              name="password"
              type="password"
              className="pda-input"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="pda-btn pda-btn-primary" disabled={loading}>
            {loading ? 'Inscription...' : 'S\'inscrire'}
          </button>
        </form>

        <div className={styles.footer}>
          <button onClick={() => router.push('/')} className={styles.footerLink}>
            Retour à la connexion
          </button>
        </div>
      </div>
    </div>
  );
}
