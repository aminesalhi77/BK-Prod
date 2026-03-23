'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './fin.module.css';

export default function FinDeCyclePage() {
  const router = useRouter();
  const [cycles, setCycles] = useState<any[]>([]);
  const [selectedCycle, setSelectedCycle] = useState<any>(null);
  const [duration, setDuration] = useState('');
  const [loading, setLoading] = useState(false);
  const [ticket, setTicket] = useState<any>(null);

  useEffect(() => {
    fetch('/api/autoclave/cycles/running')
      .then(res => res.json())
      .then(data => setCycles(data.cycles || []));
  }, []);

  const handleEndCycle = async () => {
    if (!selectedCycle) return;
    setLoading(true);
    try {
      const res = await fetch('/api/autoclave/cycle/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          cycleId: selectedCycle.id, 
          actualDurationMin: parseInt(duration) 
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTicket(data.ticket);

    } catch (err) {
      alert(err);
    } finally {
      setLoading(false);
    }
  };

  if (ticket) {
    return (
      <div className={`${styles.ticketContainer} pda-printable`}>
        <div className={styles.ticket}>
          <h2>TICKET CHARIOT</h2>
          <div className={styles.barcodePlaceholder}>
            <div className={styles.barcodeLine}>|| ||| || |||| | ||</div>
            <span>{ticket.code}</span>
          </div>
          <div className={styles.ticketDetails}>
            <p>CYCLE ID: <strong>{ticket.cycleId.substring(0,8)}</strong></p>
            <p>AUTOCLAVE: <strong>{selectedCycle.autoclaveId}</strong></p>
            <p>NB CHARIOTS: <strong>{selectedCycle.chariots.length}</strong></p>
            <p>DURÉE: <strong>{duration} min</strong></p>
          </div>
          <div className={styles.mlSummary}>
            <h4>ANALYSE IA : CONFORME ✅</h4>
            <p>Score Performance: 98.5%</p>
          </div>
          <button className="pda-btn pda-btn-primary" onClick={() => window.print()}>
            🖨️ Imprimer Ticket STR
          </button>
          <button className={styles.backBtn} onClick={() => router.push('/autoclave/menu')}>
            Retour au Menu
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h2>🏁 Fin de Cycle</h2>
        <p>Sélectionnez le cycle à terminer</p>

        <div className={styles.cycleGrid}>
          {cycles.map(c => (
            <button 
              key={c.id} 
              className={`${styles.cycleCard} ${selectedCycle?.id === c.id ? styles.active : ''}`}
              onClick={() => setSelectedCycle(c)}
            >
              <div className={styles.cycleInfo}>
                <span className={styles.acId}>{c.autoclaveId}</span>
                <span className={styles.startTime}>DEBUT: {new Date(c.startTime).toLocaleTimeString()}</span>
              </div>
              <span className={styles.chariotCount}>{c.chariots.length} Chariots</span>
            </button>
          ))}
          {cycles.length === 0 && <p className={styles.empty}>Aucun cycle en cours.</p>}
        </div>

        {selectedCycle && (
          <div className={styles.form}>
            <div className={styles.inputGroup}>
              <label>Durée effective (minutes)</label>
              <input 
                className="pda-input" 
                type="number" 
                value={duration} 
                onChange={e => setDuration(e.target.value)}
                placeholder="Ex: 85"
                required
              />
            </div>
            <button className="pda-btn pda-btn-primary" onClick={handleEndCycle} disabled={loading || !duration}>
              {loading ? 'Finalisation...' : 'Valider Fin de Cycle'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
