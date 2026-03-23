'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './chargement.module.css';

export default function ChargementAutoclavePage() {
  const router = useRouter();
  const [autoclaveId, setAutoclaveId] = useState('');
  const [assistant, setAssistant] = useState('');
  const [scannedChariots, setScannedChariots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scanner = useScannerInput({
    onScan: async (code) => {
      if (code.startsWith('CHR-')) {
        validateAndAddChariot(code);
      } else {
        setAssistant(code);
      }
    },
  });

  const validateAndAddChariot = async (code: string) => {
    if (scannedChariots.find(c => c.code === code)) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/ligne/chariot/${code}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Chariot invalide');
      
      if (data.chariot.status !== 'READY_FOR_AUTOCLAVE') {
        throw new Error('Statut invalide');
      }

      setScannedChariots(prev => [...prev, data.chariot]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async () => {
    if (!autoclaveId || scannedChariots.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/autoclave/cycle/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          autoclaveId,
          assistantMatricule: assistant,
          chariotCodes: scannedChariots.map(c => c.code)
        }),
      });
      if (!res.ok) throw new Error('Échec du lancement');
      router.push('/autoclave/menu');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.mainCard}>
        <h2>📥 Chargement Autoclave</h2>
        
        <div className={styles.configGrid}>
          <div className={styles.inputGroup}>
            <label>Choisir Autoclave</label>
            <select 
              className="pda-input" 
              value={autoclaveId} 
              onChange={e => setAutoclaveId(e.target.value)}
            >
              <option value="">Sélectionner...</option>
              <option value="AC-01">AC-01</option>
              <option value="AC-02">AC-02</option>
              <option value="AC-03">AC-03</option>
              <option value="AC-04">AC-04</option>
              <option value="AC-05">AC-05</option>
            </select>
          </div>
          
          <div className={styles.inputGroup}>
            <label>Assistant (Scan ou Saisir)</label>
            <input 
              className="pda-input" 
              value={assistant} 
              onChange={e => setAssistant(e.target.value)}
              placeholder="Scanner badge assistant"
            />
          </div>
        </div>

        <div className={styles.scannerSection}>
          <div className={styles.sectionHeader}>
            <h3>Chariots Scannés ({scannedChariots.length})</h3>
            <span className={styles.totalBoxes}>
              Total: {scannedChariots.reduce((s, c) => s + c.boxCount, 0)} boîtes
            </span>
          </div>

          <div className={styles.scannerInputBox}>
            <div className={styles.pulseDot}></div>
            <input 
              className={styles.invisibleInput}
              autoFocus
              {...scanner.bindInput}
              placeholder="Scanner les chariots..."
            />
            <span className={styles.scanningLabel}>Prêt pour scan...</span>
          </div>

          <div className={styles.manualInputSection}>
            <input
              className="pda-input"
              id="manual-chariot-input"
              placeholder="Ou saisir code chariot (CHR-...)"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const input = e.target as HTMLInputElement;
                  if (input.value.trim()) {
                    validateAndAddChariot(input.value.trim());
                    input.value = '';
                  }
                }
              }}
            />
            <button
              type="button"
              className="pda-btn pda-btn-secondary"
              onClick={() => {
                const input = document.getElementById('manual-chariot-input') as HTMLInputElement;
                if (input && input.value.trim()) {
                  validateAndAddChariot(input.value.trim());
                  input.value = '';
                }
              }}
            >
              Ajouter
            </button>
          </div>

          <div className={styles.list}>
            {scannedChariots.map((c, i) => (
              <div key={c.code} className={styles.listRow}>
                <span>#{c.numero} - {c.code}</span>
                <strong>{c.boxCount} B</strong>
                <button onClick={() => setScannedChariots(prev => prev.filter((_, idx) => idx !== i))}>✕</button>
              </div>
            ))}
          </div>
        </div>

        <button 
          className="pda-btn pda-btn-primary" 
          disabled={!autoclaveId || scannedChariots.length === 0 || loading}
          onClick={handleLaunch}
        >
          🚀 Lancer le Cycle
        </button>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
