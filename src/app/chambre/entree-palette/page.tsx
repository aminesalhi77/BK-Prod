'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import ChambreMap from '@/components/ChambreMap/ChambreMap';
import styles from './entree.module.css';

interface PaletteData {
  code: string;
  longeType: string;
  weightKg: number;
  position: { num: number; zone: string } | null;
}

const LONGE_TYPES = [
  { value: 'CB Simple parage', label: 'CB Simple parage' },
  { value: 'CB Double parage', label: 'CB Double parage' },
  { value: 'CT simple parage', label: 'CT simple parage' },
  { value: 'Longe précuit', label: 'Longe précuit' },
  { value: 'Miette', label: 'Miette' },
  { value: 'Morcelé', label: 'Morcelé' },
];

export default function EntreePalettePage() {
  const router = useRouter();
  const [step, setStep] = useState<'form' | 'position' | 'success'>('form');
  const [palette, setPalette] = useState<PaletteData>({
    code: '',
    longeType: '',
    weightKg: 0,
    position: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [occupiedPalettes, setOccupiedPalettes] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetch('/api/chambre/stock').then(r => r.json()).then(data => {
      setOccupiedPalettes(data.stock || []);
    });
  }, [step]);

  const scanner = useScannerInput({
    onScan: async (code) => {
      await fetchAndFill(code);
    },
  });

  const fetchAndFill = async (code: string) => {
    setLoading(true);
    setError('');
    setIsScanning(false);
    
    // Just use the code directly - palette is created new
    setPalette(prev => ({
      ...prev,
      code: code,
    }));
    
    setLoading(false);
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

  const handleTypeChange = (longeType: string) => {
    setPalette(prev => ({ ...prev, longeType }));
    // Note: Auto-save happens only after position is selected
  };

  const openPositionSelector = () => {
    setStep('position');
  };

  const handlePositionSelect = async (num: number, zone: string) => {
    setPalette(prev => ({ ...prev, position: { num, zone } }));
    setStep('form');
    
    // Auto-save after position selected
    if (palette.code && palette.longeType) {
      await savePalette({ ...palette, position: { num, zone } });
    }
  };

  const savePalette = async (data: PaletteData) => {
    if (!data.code || !data.longeType || !data.position) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/chambre/entree', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bkfood-token')}`
        },
        body: JSON.stringify({ 
          paletteCode: data.code,
          longeType: data.longeType,
          weightKg: data.weightKg,
          positionNumber: data.position?.num,
          positionZone: data.position?.zone
        }),
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
    setPalette({ code: '', longeType: '', weightKg: 0, position: null });
    setError('');
  };

  return (
    <div className={styles.container}>
      {step === 'form' && (
        <div className={styles.formCard}>
          <div className={styles.header}>
            <span className={styles.icon}>📥</span>
            <h2>Entrée Palette Chambre 0</h2>
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

            {/* Poids Field */}
            <div className={styles.fieldGroup}>
              <label>Poids (KG)</label>
              <input
                className="pda-input"
                type="number"
                placeholder="Poids en kg"
                value={palette.weightKg || ''}
                onChange={(e) => setPalette(prev => ({ ...prev, weightKg: parseFloat(e.target.value) || 0 }))}
              />
            </div>

            {/* Type Longe Field */}
            <div className={styles.fieldGroup}>
              <label>Type Longe</label>
              <select
                className="pda-input"
                value={palette.longeType}
                onChange={(e) => handleTypeChange(e.target.value)}
              >
                <option value="">-- Sélectionner type --</option>
                {LONGE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Position Field */}
            <div className={styles.fieldGroup}>
              <label>Position</label>
              <button
                type="button"
                className={`pda-input ${styles.positionBtn} ${palette.position ? styles.positionSet : ''}`}
                onClick={openPositionSelector}
              >
                {palette.position ? `📍 ${palette.position.zone}${palette.position.num}` : 'Choisir position sur le plan'}
              </button>
            </div>
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.actions}>
            <button 
              className="pda-btn pda-btn-primary" 
              onClick={handleSubmit}
              disabled={saving || !palette.code || !palette.longeType || !palette.position}
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

      {step === 'position' && (
        <div className={styles.formCard}>
          <div className={styles.header}>
            <span className={styles.icon}>📍</span>
            <h2>Sélection Position</h2>
            <p className={styles.instruction}>Cliquez sur une position vide</p>
          </div>

          <div className={styles.mapContainer}>
            <ChambreMap 
              palettes={occupiedPalettes}
              mode="select"
              onPositionSelect={handlePositionSelect}
            />
          </div>
          
          <div className={styles.actions}>
            <button className={styles.cancelBtn} onClick={() => setStep('form')}>
              Retour
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className={`${styles.formCard} ${styles.successCard}`}>
          <div className={styles.successIcon}>✅</div>
          <h3>Palette Enregistrée</h3>
          <p>La palette {palette.code} est maintenant en Chambre 0</p>
          <p className={styles.successDetails}>
            {palette.longeType} - {palette.weightKg}kg - Position: {palette.position?.zone}{palette.position?.num}
          </p>
        </div>
      )}
    </div>
  );
}
