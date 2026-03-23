'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './sortie.module.css';

const DESTINATION_LINES = [
    { id: '5/2 [1]', name: '5/2 [1]' },
    { id: '5/2 [2]', name: '5/2 [2]' },
    { id: '400', name: '400' },
    { id: '1/5', name: '1/5' },
    { id: 'Manuel', name: 'Manuel' },
];

interface PaletteData {
  code: string;
  longeType: string;
  weightKg: number;
  position: { num: number; zone: string } | null;
  destination: string;
}

export default function SortiePalettePage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [palette, setPalette] = useState<PaletteData>({
    code: '',
    longeType: '',
    weightKg: 0,
    position: null,
    destination: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);

  const scanner = useScannerInput({
    onScan: async (code) => {
      await fetchAndFill(code);
    },
  });

  const fetchAndFill = async (code: string) => {
    setLoading(true);
    setError('');
    setIsScanning(false);
    try {
      const res = await fetch(`/api/palettes/${code}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || 'Palette introuvable');
        return;
      }
      
      if (data.palette.status !== 'IN_CHAMBRE') {
        setError(`Palette non en Chambre 0 (${data.palette.status})`);
        return;
      }

      setPalette(prev => ({
        ...prev,
        code: data.palette.code,
        longeType: data.palette.longeType || '',
        weightKg: data.palette.weightKg || 0,
        position: data.palette.positionNumber && data.palette.positionZone 
          ? { num: data.palette.positionNumber, zone: data.palette.positionZone }
          : null
      }));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleScanClick = () => {
    // Toggle scanning on/off
    setIsScanning(prev => !prev);
    if (!isScanning) {
      setError('');
    }
  };

  const handleCodeChange = (value: string) => {
    setPalette(prev => ({ ...prev, code: value }));
  };

  const handleCodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && palette.code.trim()) {
      fetchAndFill(palette.code.trim());
    }
  };

  const handleDestinationSelect = async (destination: string) => {
    setPalette(prev => ({ ...prev, destination }));
    
    // Auto-save when destination selected
    if (palette.code && destination) {
      await savePalette({ ...palette, destination });
    }
  };

  const savePalette = async (data: PaletteData) => {
    if (!data.code || !data.destination) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/chambre/sortie', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bkfood-token')}`
        },
        body: JSON.stringify({ paletteCode: data.code, destination: data.destination }),
      });
      
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Erreur lors de la sauvegarde');
        return;
      }

      
      setStep('success');
      setTimeout(() => {
        router.push('/chambre/menu');
      }, 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = () => {
    savePalette(palette);
  };

  const resetForm = () => {
    setPalette({ code: '', longeType: '', weightKg: 0, position: null, destination: '' });
    setError('');
  };

  return (
    <div className={styles.container}>
      {step === 'form' && (
        <div className={styles.formCard}>
          <div className={styles.header}>
            <span className={styles.icon}>📤</span>
            <h2>Sortie Palette Chambre 0</h2>
          </div>

          <div className={styles.formGrid}>
            {/* Code Field */}
            <div className={styles.fieldGroup}>
              <label>Code Palette</label>
              <div className={styles.fieldWithScan}>
                <input
                  className="pda-input"
                  placeholder="Saisir code PAL-..."
                  value={palette.code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleCodeKeyDown}
                />
                <button
                  type="button"
                  className={`${styles.scanIconBtn} ${isScanning ? styles.scanningActive : ''}`}
                  onClick={handleScanClick}
                  title="Cliquer pour scanner"
                >
                  {isScanning ? '📡' : '🔍'}
                </button>
              </div>
              {isScanning && (
                <div className={styles.scanMessage}>
                  📡 Scanner le code-barres...
                </div>
              )}
            </div>

            {/* Type Field */}
            <div className={styles.fieldGroup}>
              <label>Type Longe</label>
              <input
                className="pda-input"
                value={palette.longeType || '-'}
                disabled
              />
            </div>

            {/* Poids Field */}
            <div className={styles.fieldGroup}>
              <label>Poids (KG)</label>
              <input
                className="pda-input"
                value={palette.weightKg ? `${palette.weightKg} kg` : '-'}
                disabled
              />
            </div>

            {/* Position Field */}
            <div className={styles.fieldGroup}>
              <label>Position</label>
              <input
                className="pda-input"
                value={palette.position ? `${palette.position.zone}${palette.position.num}` : '-'}
                disabled
              />
            </div>

            {/* Destination Field */}
            <div className={styles.fieldGroup}>
              <label>Destination</label>
              <div className={styles.destinationGrid}>
                {DESTINATION_LINES.map(line => (
                  <button 
                    key={line.id}
                    type="button"
                    className={`${styles.destBtn} ${palette.destination === line.id ? styles.destActive : ''}`}
                    onClick={() => handleDestinationSelect(line.id)}
                  >
                    {line.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button 
              className="pda-btn pda-btn-primary" 
              onClick={handleSubmit}
              disabled={saving || !palette.code || !palette.destination}
            >
              {saving ? 'Sauvegarde...' : 'VALIDER'}
            </button>
            <button 
              type="button"
              className={styles.resetBtn} 
              onClick={resetForm}
            >
              Réinitialiser
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className={`${styles.formCard} ${styles.successCard}`}>
          <div className={styles.successIcon}>✅</div>
          <h3>Palette Sortie</h3>
          <p>La palette {palette.code} est envoyée vers {palette.destination}</p>
        </div>
      )}
    </div>
  );
}
