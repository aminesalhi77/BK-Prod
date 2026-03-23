'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './entree.module.css';

export default function LigneEntreePalettePage() {
  const router = useRouter();
  const [step, setStep] = useState<'scan' | 'confirm' | 'success'>('scan');
  const [palette, setPalette] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ligneId, setLigneId] = useState('');
  const [operatorMatricule, setOperatorMatricule] = useState('');
  const [tonnageStats, setTonnageStats] = useState({ total: 0, today: 0, used: 0 });
  const [article, setArticle] = useState('');
  const [cheffeMatricule, setCheffeMatricule] = useState('');
  const [positionNumber, setPositionNumber] = useState('');
  const [positionZone, setPositionZone] = useState('');
  
  // New states for scan/type mode
  const [inputMode, setInputMode] = useState<'scan' | 'manual'>('scan');
  const [manualPaletteInput, setManualPaletteInput] = useState('');
  const manualInputRef = useRef<HTMLInputElement>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const scanner = useScannerInput({
    onScan: async (code) => {
      if (inputMode === 'scan') {
        // Auto-fill on scan mode
        await fetchPalette(code);
      }
    },
  });

  // Initialize line and operator data
  useEffect(() => {
    const activeLine = localStorage.getItem('bkfood-active-line') || '1';
    const user = JSON.parse(localStorage.getItem('bkfood-user') || '{}');
    setLigneId(activeLine);
    setOperatorMatricule(user.matricule || '');
    
    // Fetch production stats
    fetchProductionStats(activeLine);
  }, []);

  const fetchProductionStats = async (lineId: string) => {
    try {
      const res = await fetch(`/api/ligne/visuel?ligneId=${lineId}`);
      const data = await res.json();
      
      if (res.ok) {
        // Calculate tonnage stats
        const totalWeight = data.palettes?.reduce((sum: number, p: any) => sum + (p.weightKg || 0), 0) || 0;
        const usedWeight = data.chariots?.reduce((sum: number, c: any) => sum + (c.boxCount * 0.170), 0) || 0; // Approximate weight per box
        
        setTonnageStats({
          total: totalWeight,
          today: totalWeight + usedWeight,
          used: usedWeight
        });
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchPalette = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/palettes/${code}`);
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Palette introuvable');
      
      // Enhanced validation: Palette must come from Chambre 0
      if (data.palette.status === 'CONSUMED') {
        throw new Error('❌ Palette déjà consommée');
      }
      
      if (data.palette.status !== 'SENT_TO_LIGNE' && data.palette.status !== 'IN_CHAMBRE') {
        throw new Error('❌ Palette non disponible depuis Chambre 0');
      }

      // Validate that palette is assigned to current line
      if (data.palette.ligneId && data.palette.ligneId !== ligneId) {
        throw new Error(`❌ Palette assignée à la ligne ${data.palette.ligneId}, pas à la ligne ${ligneId}`);
      }

      setPalette(data.palette);
      
      // Auto-fill related fields from sortie chambre 0
      if (data.palette.positionZone) setPositionZone(data.palette.positionZone);
      if (data.palette.positionNumber) setPositionNumber(data.palette.positionNumber);
      if (data.palette.article) setArticle(data.palette.article);
      if (data.palette.cheffeMatricule) setCheffeMatricule(data.palette.cheffeMatricule);
      
      setStep('confirm');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleManualValidate = async () => {
    if (manualPaletteInput.trim()) {
      await fetchPalette(manualPaletteInput.trim());
      setManualPaletteInput('');
    }
  };

  const handleConfirm = async () => {
    setLoading(true);
    setError('');
    
    if (!operatorMatricule) {
      setError('❌ Matricule opérateur requis');
      setLoading(false);
      return;
    }
    
    if (!article) {
      setError('❌ Article produit requis');
      setLoading(false);
      return;
    }
    
    try {
      const res = await fetch('/api/ligne/entree-palette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paletteCode: palette.code, 
          ligneId,
          operatorMatricule,
          article,
          cheffeMatricule,
          positionZone,
          positionNumber,
          origin: palette.origin,
          timestamp: new Date().toISOString()
        }),
      });
      
      const result = await res.json();
      
      if (!res.ok) {
        throw new Error(result.error || 'Échec de validation');
      }
      
      // Update stats
      setTonnageStats(prev => ({
        ...prev,
        total: prev.total + (palette.weightKg || 0),
        today: prev.today + (palette.weightKg || 0)
      }));
      
      setStep('success');
      setTimeout(() => router.push('/ligne/menu'), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleInputMode = () => {
    setInputMode(prev => prev === 'scan' ? 'manual' : 'scan');
    setError('');
    // Focus appropriate input after mode change
    setTimeout(() => {
      if (inputMode === 'scan' && manualInputRef.current) {
        manualInputRef.current.focus();
      } else if (inputMode === 'manual' && scanInputRef.current) {
        scanInputRef.current.focus();
      }
    }, 100);
  };

  const handleMatriculeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOperatorMatricule(e.target.value);
  };

  const handleArticleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setArticle(e.target.value);
  };

  const articles = [
    'Thon Entier à l\'huile',
    'Thon en morceaux à l\'huile',
    'Thon nature',
    'Thon en filets',
    'Thon à la sauce tomate'
  ];

  const positionZones = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I'];

  return (
    <div className={styles.container}>
      {/* Production Stats Header */}
      <div className={styles.statsHeader}>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Ligne</span>
          <span className={styles.statValue}>{ligneId}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Tonnage Total</span>
          <span className={styles.statValue}>{tonnageStats.total.toFixed(2)} kg</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statLabel}>Aujourd'hui</span>
          <span className={styles.statValue}>{tonnageStats.today.toFixed(2)} kg</span>
        </div>
      </div>

      {step === 'scan' && (
        <div className={styles.card}>
          <h2>📥 Réception Palette sur Ligne {ligneId}</h2>
          <p className={styles.instruction}>Palette doit venir de Chambre 0</p>
          
          {/* Operator Input - Auto-filled */}
          <div className={styles.operatorSection}>
            <label className={styles.operatorLabel}>Matricule Opérateur</label>
            <input
              className="pda-input"
              placeholder="Matricule (auto-rempli)..."
              value={operatorMatricule}
              onChange={handleMatriculeChange}
              disabled={loading}
            />
          </div>

          {/* Mode Toggle Button */}
          <div className={styles.modeToggle}>
            <button
              type="button"
              className={`pda-btn ${inputMode === 'scan' ? 'pda-btn-primary' : 'pda-btn-secondary'}`}
              onClick={toggleInputMode}
              disabled={loading}
            >
              {inputMode === 'scan' ? '🔍 Mode Scan' : '✏️ Mode Saisie'}
            </button>
          </div>
          
          <div className={styles.scannerWrapper}>
            {inputMode === 'scan' ? (
              // Scan Mode - Auto submit on scan
              <>
                <div className={styles.scannerIcon}>🔍</div>
                <input
                  ref={scanInputRef}
                  className="pda-input"
                  placeholder="Scanner PAL-..."
                  autoFocus
                  disabled={loading || !operatorMatricule}
                  {...scanner.bindInput}
                />
                <p className={styles.modeHint}>Scan automatique - pas de bouton nécessaire</p>
              </>
            ) : (
              // Manual Mode - Requires validate button
              <>
                <div className={styles.manualInputSection}>
                  <input
                    ref={manualInputRef}
                    className="pda-input"
                    placeholder="Saisir code palette..."
                    value={manualPaletteInput}
                    onChange={(e) => setManualPaletteInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleManualValidate();
                      }
                    }}
                    disabled={loading || !operatorMatricule}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="pda-btn pda-btn-primary"
                    onClick={handleManualValidate}
                    disabled={loading || !manualPaletteInput.trim() || !operatorMatricule}
                  >
                    Valider
                  </button>
                </div>
              </>
            )}
            {error && <div className={styles.error}>{error}</div>}
          </div>
        </div>
      )}

      {step === 'confirm' && palette && (
        <div className={styles.card}>
          <div className={styles.header}>
            <span className={`${styles.badge} ${styles.paletteBadge}`}>{palette.code}</span>
            <h3>Confirmer Consommation</h3>
          </div>
          
          <div className={styles.details}>
            <div className={styles.row}><span>Article:</span> <strong>{palette.article}</strong></div>
            <div className={styles.row}><span>Poids:</span> <strong>{palette.weightKg} kg</strong></div>
            <div className={styles.row}><span>Origine:</span> <strong>{palette.origin}</strong></div>
            <div className={styles.row}><span>Position Chambre 0:</span> <strong>{palette.positionZone}{palette.positionNumber}</strong></div>
            <div className={styles.row}><span>Cheffe:</span> <strong>{palette.cheffeMatricule || 'Non spécifié'}</strong></div>
            <div className={styles.row}><span>Opérateur:</span> <strong>{operatorMatricule}</strong></div>
            <div className={styles.row}><span>Ligne:</span> <strong>{ligneId}</strong></div>
          </div>

          {/* Article Selection (pre-filled from palette) */}
          <div className={styles.articleSection}>
            <label className={styles.articleLabel}>Article Produit</label>
            <select
              className="pda-input"
              value={article}
              onChange={handleArticleChange}
              disabled={loading}
            >
              <option value="">Sélectionner l'article produit...</option>
              {articles.map((art) => (
                <option key={art} value={art}>{art}</option>
              ))}
            </select>
          </div>

          {/* Position fields (pre-filled from palette) */}
          <div className={styles.positionSection}>
            <div className={styles.positionRow}>
              <div className={styles.positionField}>
                <label>Zone</label>
                <input
                  type="text"
                  className="pda-input"
                  value={positionZone}
                  onChange={(e) => setPositionZone(e.target.value)}
                  placeholder="Zone"
                  disabled={loading}
                />
              </div>
              <div className={styles.positionField}>
                <label>Numéro</label>
                <input
                  type="text"
                  className="pda-input"
                  value={positionNumber}
                  onChange={(e) => setPositionNumber(e.target.value)}
                  placeholder="Numéro"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Cheffe field (pre-filled from palette) */}
          <div className={styles.cheffeSection}>
            <label>Matricule Cheffe</label>
            <input
              type="text"
              className="pda-input"
              value={cheffeMatricule}
              onChange={(e) => setCheffeMatricule(e.target.value)}
              placeholder="Matricule cheffe"
              disabled={loading}
            />
          </div>
          
          <div className={styles.actions}>
            <button 
              className="pda-btn pda-btn-primary" 
              onClick={handleConfirm} 
              disabled={loading || !article}
            >
              {loading ? '⏳ Validation...' : '✅ Confirmer et Verser'}
            </button>
            <button className={styles.cancelBtn} onClick={() => setStep('scan')} disabled={loading}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {step === 'success' && (
        <div className={`${styles.card} ${styles.successCard} flash-success`}>
          <div className={styles.successIcon}>🏗️</div>
          <h3>✅ Palette Consommée</h3>
          <p>Le stock de la ligne {ligneId} a été mis à jour.</p>
          <p><strong>+{palette?.weightKg || 0} kg</strong> ajoutés à la production</p>
          <p><strong>Article:</strong> {article}</p>
          <p><strong>Position Chambre 0:</strong> {positionZone}{positionNumber}</p>
          <p><strong>Cheffe:</strong> {cheffeMatricule}</p>
        </div>
      )}
    </div>
  );
}