'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './Parrage.module.css';

// ── Types ──────────────────────────────────────────────────────────────
interface FormData {
  batchId: string;
  initialWeight: number | '';
  temperature: number | '';
  notes: string;
}

interface BatchInfo {
  id: string;
  batchCode: string;
  species: string;
  currentStep: string;
  arrivalDate: string;
}

type FeedbackState = 'idle' | 'scanning' | 'found' | 'not-found' | 'saving' | 'success' | 'anomaly';

// ── Component ──────────────────────────────────────────────────────────
export default function ParragePage() {
  const { t, user, token, isOnline, addToOfflineQueue } = useApp();
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null);
  const [mlResult, setMlResult] = useState<{ isAnomaly: boolean; message: string; confidenceScore: number } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const weightRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    batchId: '',
    initialWeight: '',
    temperature: '',
    notes: '',
  });

  // ── Scanner hook ─────────────────────────────────────────────────────
  const lookupBatch = useCallback(async (barcode: string) => {
    setFeedback('scanning');
    setBatchInfo(null);
    try {
      const res = await fetch(`/api/batches?search=${encodeURIComponent(barcode)}`);
      if (res.ok) {
        const data = await res.json();
        const found = data.batches?.[0] ?? null;
        if (found) {
          setBatchInfo(found);
          setFormData(f => ({ ...f, batchId: found.batchCode }));
          setFeedback('found');
          // Vibrate short + shift focus to weight
          if (navigator.vibrate) navigator.vibrate(60);
          setTimeout(() => weightRef.current?.focus(), 100);
        } else {
          setFeedback('not-found');
        }
      } else {
        setFeedback('not-found');
      }
    } catch {
      // Offline — still let user enter data manually
      setFeedback('not-found');
    }
  }, []);

  const scanner = useScannerInput({ onScan: lookupBatch, minLength: 4 });

  // Sync scanner value → formData.batchId
  useEffect(() => {
    if (scanner.isScanning || feedback === 'found') {
      // Scanner is handling the value
    }
  }, [scanner.isScanning, feedback]);

  // ── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.batchId || formData.initialWeight === '') return;

    setFeedback('saving');

    const payload = {
      batchId: formData.batchId,
      station: 'PARRAGE',
      weight: Number(formData.initialWeight),
      temperature: formData.temperature !== '' ? Number(formData.temperature) : undefined,
      notes: formData.notes || undefined,
      timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      addToOfflineQueue({ module: 'CHAMBRE', action: 'parrage', data: payload, timestamp: new Date().toISOString() });
      setFeedback('success');
      if (navigator.vibrate) navigator.vibrate(60);
      setTimeout(resetForm, 2500);
      return;
    }

    try {
      const res = await fetch('/api/production-entry', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setMlResult(data.ml);

        if (data.ml?.isAnomaly) {
          setFeedback('anomaly');
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
          setShowModal(true);
        } else {
          setFeedback('success');
          if (navigator.vibrate) navigator.vibrate(60);
          setTimeout(resetForm, 2500);
        }
      } else {
        setFeedback('idle');
      }
    } catch {
      // Network error — save offline
      addToOfflineQueue({ module: 'CHAMBRE', action: 'parrage', data: payload, timestamp: new Date().toISOString() });
      setFeedback('success');
      setTimeout(resetForm, 2500);
    }
  };

  const resetForm = () => {
    setFormData({ batchId: '', initialWeight: '', temperature: '', notes: '' });
    setBatchInfo(null);
    setMlResult(null);
    setFeedback('idle');
    setShowModal(false);
  };

  const feedbackClass =
    feedback === 'success' ? styles.feedbackSuccess :
    feedback === 'anomaly' ? styles.feedbackAnomaly :
    feedback === 'found'   ? styles.feedbackFound   : '';

  return (
    <div className={`${styles.page} ${feedbackClass}`}>
      {/* ── Station Header ────────────────────────────────────────────── */}
      <div className={styles.stationHeader}>
        <div className={styles.stationIcon} style={{ background: '#eab30820', border: '2px solid #eab308' }}>
          ⚖️
        </div>
        <div>
          <h1 className={styles.stationTitle}>{t('parrage')}</h1>
          <p className={styles.stationSubtitle}>Saisie du poids initial — étape de départ</p>
        </div>
        {!isOnline && (
          <span className={styles.offlinePill}>📵 Hors-ligne</span>
        )}
      </div>

      {/* ── Scanner Section ───────────────────────────────────────────── */}
      <div className={styles.scannerCard}>
        <div className={styles.scannerLabel}>
          <span className={styles.scannerIcon}>
            {scanner.isScanning ? '📡' : feedback === 'found' ? '✅' : feedback === 'not-found' ? '❌' : '🔍'}
          </span>
          <span>
            {scanner.isScanning ? 'Lecture en cours…'
              : feedback === 'found' ? `Lot trouvé: ${batchInfo?.batchCode}`
              : feedback === 'not-found' ? 'Lot introuvable — saisie manuelle'
              : t('scanBarcode')}
          </span>
        </div>
        <input
          className={`${styles.scannerInput} ${scanner.isScanning ? styles.scannerActive : ''}`}
          placeholder="Scanner ou taper l'ID du lot"
          autoFocus
          aria-label="Batch ID scanner"
          {...scanner.bindInput}
          onChange={e => setFormData(f => ({ ...f, batchId: e.target.value }))}
        />
        {feedback !== 'idle' && feedback !== 'scanning' && (
          <button className={styles.scanAgainBtn} onClick={resetForm}>
            ↩ Nouveau scan
          </button>
        )}
      </div>

      {/* ── Batch Info Card ───────────────────────────────────────────── */}
      {batchInfo && (
        <div className={styles.batchCard}>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Lot</span>
            <span className={styles.batchValue}>{batchInfo.batchCode}</span>
          </div>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Espèce</span>
            <span className={styles.batchValue}>{batchInfo.species}</span>
          </div>
          <div className={styles.batchRow}>
            <span className={styles.batchLabel}>Étape actuelle</span>
            <span className={styles.batchValue}>{batchInfo.currentStep}</span>
          </div>
        </div>
      )}

      {/* ── Entry Form ────────────────────────────────────────────────── */}
      <form ref={formRef} onSubmit={handleSubmit} className={styles.form}>
        {/* Initial weight — KEY field */}
        <div className={styles.field}>
          <label className={styles.label}>
            {t('weight')}
            <span className={styles.required}>*</span>
            <span className={styles.hint}> — Poids initial Parrage</span>
          </label>
          <input
            ref={weightRef}
            type="number"
            step="0.1"
            min="0"
            className={styles.input}
            placeholder="ex: 520.5"
            required
            value={formData.initialWeight}
            onChange={e => setFormData(f => ({ ...f, initialWeight: e.target.value !== '' ? parseFloat(e.target.value) : '' }))}
          />
          <span className={styles.inputUnit}>kg</span>
        </div>

        {/* Temperature */}
        <div className={styles.field}>
          <label className={styles.label}>{t('temperature')}</label>
          <input
            type="number"
            step="0.1"
            className={styles.input}
            placeholder="ex: 4.5"
            value={formData.temperature}
            onChange={e => setFormData(f => ({ ...f, temperature: e.target.value !== '' ? parseFloat(e.target.value) : '' }))}
          />
          <span className={styles.inputUnit}>°C</span>
        </div>

        {/* Notes */}
        <div className={styles.field}>
          <label className={styles.label}>{t('notes')}</label>
          <textarea
            className={`${styles.input} ${styles.textarea}`}
            placeholder="Observations…"
            rows={3}
            value={formData.notes}
            onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
          />
        </div>

        {/* Submit */}
        <div className={styles.actions}>
          <button type="button" className={`${styles.btn} ${styles.btnGhost}`} onClick={resetForm}>
            {t('cancel')}
          </button>
          <button
            type="submit"
            className={`${styles.btn} ${styles.btnPrimary}`}
            disabled={feedback === 'saving' || !formData.batchId || formData.initialWeight === ''}
          >
            {feedback === 'saving' ? (
              <><span className={styles.btnSpinner} /> Enregistrement…</>
            ) : (
              <><span>💾</span> {t('submit')}</>
            )}
          </button>
        </div>
      </form>

      {/* ── Success Flash ─────────────────────────────────────────────── */}
      {feedback === 'success' && (
        <div className={styles.successBanner}>
          ✅ Données enregistrées avec succès — {isOnline ? 'synchronisé' : 'hors-ligne'}
        </div>
      )}

      {/* ── Anomaly Modal ─────────────────────────────────────────────── */}
      {showModal && mlResult && (
        <div className={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div className={styles.anomalyModal} onClick={e => e.stopPropagation()}>
            <div className={styles.anomalyIcon}>⚠️</div>
            <h2 className={styles.anomalyTitle}>Anomalie détectée</h2>
            <p className={styles.anomalyMessage}>{mlResult.message}</p>
            <p className={styles.anomalyConfidence}>
              Score IA: <strong>{mlResult.confidenceScore}%</strong>
            </p>
            <p className={styles.anomalyAdvice}>
              Veuillez informer le superviseur avant de continuer.
            </p>
            <div className={styles.anomalyActions}>
              <button className={`${styles.btn} ${styles.btnGhost}`} onClick={() => setShowModal(false)}>
                Ignorer
              </button>
              <button className={`${styles.btn} ${styles.btnDanger}`} onClick={resetForm}>
                Nouveau lot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
