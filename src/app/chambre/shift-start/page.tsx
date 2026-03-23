'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './shift-start.module.css';

export default function ChambreShiftStartPage() {
  const router = useRouter();
  const { token, startShift } = useApp();
  const [formData, setFormData] = useState({
    operatorMatricule: '',
    chefTapis1: '',
    chefTapis2: '',
    chefTapis3: '',
    chefTapis4: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/chambre/shift/start', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur inconnue');

      startShift(data.shift);
      router.push('/chambre/menu');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <span className={styles.icon}>🕒</span>
          <h2>Démarrage Shift Chambre 0</h2>
          <p>Veuillez saisir les matricules pour cette session</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.inputGroup}>
            <label>Matricule Opérateur Chambre 0</label>
            <input 
              type="text" 
              className="pda-input" 
              maxLength={4}
              placeholder="Ex: 1234"
              value={formData.operatorMatricule}
              onChange={e => setFormData({...formData, operatorMatricule: e.target.value})}
              required 
            />
          </div>

          <div className={styles.chefGrid}>
            <div className={styles.inputGroup}>
              <label>Matricule Cheffe Tapis 1</label>
              <input 
                type="text" 
                className="pda-input" 
                value={formData.chefTapis1}
                onChange={e => setFormData({...formData, chefTapis1: e.target.value})}
                required 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Matricule Cheffe Tapis 2</label>
              <input 
                type="text" 
                className="pda-input" 
                value={formData.chefTapis2}
                onChange={e => setFormData({...formData, chefTapis2: e.target.value})}
                required 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Matricule Cheffe Tapis 3</label>
              <input 
                type="text" 
                className="pda-input" 
                value={formData.chefTapis3}
                onChange={e => setFormData({...formData, chefTapis3: e.target.value})}
                required 
              />
            </div>
            <div className={styles.inputGroup}>
              <label>Matricule Cheffe Tapis 4</label>
              <input 
                type="text" 
                className="pda-input" 
                value={formData.chefTapis4}
                onChange={e => setFormData({...formData, chefTapis4: e.target.value})}
                required 
              />
            </div>
          </div>

          <button type="submit" className="pda-btn pda-btn-primary" disabled={loading}>
            {loading ? 'Démarrage...' : 'VALIDER'}
          </button>
        </form>
      </div>
    </div>
  );
}
