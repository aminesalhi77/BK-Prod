'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './saisie.module.css';

export default function SaisieEmballagePage() {
  const router = useRouter();
  const [step, setStep] = useState<'scan' | 'form' | 'success'>('scan');
  const [ticket, setTicket] = useState<any>(null);
  const [formData, setFormData] = useState({
    cartonCount: '',
    boxesPerCarton: '24', // Default
    dluo: new Date(new Date().setFullYear(new Date().getFullYear() + 4)).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scanner = useScannerInput({
    onScan: async (code) => {
      if (code.startsWith('STR-')) {
        fetchTicket(code);
      } else {
        setError('Barcode invalide. Doit être un ticket STR.');
      }
    },
  });

  const fetchTicket = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/emballage/str/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      if (data.ticket.status === 'PACKAGED') {
        throw new Error('Ce ticket a déjà été emballé');
      }

      setTicket(data.ticket);
      setStep('form');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/emballage/record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, strCode: ticket.code }),
      });
      if (!res.ok) throw new Error('Échec de l\'enregistrement');
      setStep('success');
      setTimeout(() => router.push('/emballage/menu'), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {step === 'scan' && (
        <div className={styles.card}>
          <h2>📦 Saisie Emballage</h2>
          <p className={styles.instruction}>Scannez le ticket de stérilisation (STR)</p>
          <div className={styles.scannerWrapper}>
            <div className={styles.scannerIcon}>🔍</div>
            <input 
              className="pda-input" 
              placeholder="Scanner STR-..." 
              autoFocus
              {...scanner.bindInput} 
            />
            <div className={styles.manualInputSection}>
              <input
                className="pda-input"
                id="manual-str-input"
                placeholder="Ou saisir manuellement..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = e.target as HTMLInputElement;
                    if (input.value.trim()) {
                      fetchTicket(input.value.trim());
                      input.value = '';
                    }
                  }
                }}
              />
              <button
                type="button"
                className="pda-btn pda-btn-secondary"
                onClick={() => {
                  const input = document.getElementById('manual-str-input') as HTMLInputElement;
                  if (input && input.value.trim()) {
                    fetchTicket(input.value.trim());
                    input.value = '';
                  }
                }}
              >
                Valider
              </button>
            </div>
            {error && <div className={styles.error}>{error}</div>}
          </div>
        </div>
      )}

      {step === 'form' && ticket && (
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={styles.badge}>{ticket.code}</span>
            <h3>Détails Emballage</h3>
          </div>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Nombre de Cartons</label>
              <input 
                className="pda-input" 
                type="number" 
                value={formData.cartonCount}
                onChange={e => setFormData({...formData, cartonCount: e.target.value})}
                placeholder="Ex: 50"
                required
              />
            </div>

            <div className={styles.inputGroup}>
              <label>Boîtes par Carton</label>
              <select 
                className="pda-input"
                value={formData.boxesPerCarton}
                onChange={e => setFormData({...formData, boxesPerCarton: e.target.value})}
              >
                <option value="12">12</option>
                <option value="24">24</option>
                <option value="48">48</option>
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label>Date Limite (DLUO)</label>
              <input 
                className="pda-input" 
                type="date" 
                value={formData.dluo}
                onChange={e => setFormData({...formData, dluo: e.target.value})}
                required
              />
            </div>

            <button type="submit" className="pda-btn pda-btn-primary" disabled={loading}>
              {loading ? 'Enregistrement...' : '🏁 Finaliser le Lot'}
            </button>
            <button type="button" className={styles.cancelBtn} onClick={() => setStep('scan')}>Annuler</button>
          </form>
        </div>
      )}

      {step === 'success' && (
        <div className={`${styles.card} ${styles.successCard} flash-success`}>
          <div className={styles.successIcon}>📦</div>
          <h3>Enregistrement Réussi</h3>
          <p>La traçabilité de ce lot est maintenant complète.</p>
        </div>
      )}
    </div>
  );
}
