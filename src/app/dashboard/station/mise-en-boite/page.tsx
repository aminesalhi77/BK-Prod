'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './MiseEnBoite.module.css';

interface CanningSession {
  batchId: string;
  batchCode: string;
  initialParrageWeight: number; // from PARRAGE step
  processedWeight: number;      // accumulated so far
}

type FeedbackState = 'idle' | 'saving' | 'success' | 'anomaly' | 'transition';

export default function MiseEnBoitePage() {
  const { t, user, token, isOnline, addToOfflineQueue } = useApp();
  const router = useRouter();

  const [session, setSession] = useState<CanningSession | null>(null);
  const [batchInput, setBatchInput] = useState('');
  const [boxWeight, setBoxWeight] = useState<number | ''>('');
  const [canCount, setCanCount] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState<FeedbackState>('idle');
  const [mlResult, setMlResult] = useState<{ message: string; isAnomaly: boolean } | null>(null);
  const [showTransitionModal, setShowTransitionModal] = useState(false);

  // Progress = processedWeight / initialParrageWeight * 100
  const progress = session
    ? Math.min(100, Math.round((session.processedWeight / session.initialParrageWeight) * 100))
    : 0;

  const canTransition = progress >= 100;

  // ── Load session from API ─────────────────────────────────────────
  const loadSession = useCallback(async (barcode: string) => {
    try {
      const res = await fetch(`/api/production-entry?batchId=${encodeURIComponent(barcode)}`);
      if (!res.ok) return;
      const data = await res.json();
      const entries = data.entries ?? [];

      const parrageEntry = entries.find((e: any) => e.station === 'PARRAGE');
      if (!parrageEntry) return;

      const parrageData = JSON.parse(parrageEntry.data ?? '{}');
      const initialWeight = parrageData.weight ?? 0;

      // Sum all MISE_EN_BOITE entries so far
      const mibEntries = entries.filter((e: any) => e.station === 'MISE_EN_BOITE');
      const processedWeight = mibEntries.reduce((sum: number, e: any) => {
        const d = JSON.parse(e.data ?? '{}');
        return sum + (d.weight ?? 0);
      }, 0);

      setSession({
        batchId: parrageEntry.batchId,
        batchCode: barcode,
        initialParrageWeight: initialWeight,
        processedWeight,
      });
    } catch {}
  }, []);

  const scanner = useScannerInput({
    onScan: (barcode) => {
      setBatchInput(barcode);
      loadSession(barcode);
      if (navigator.vibrate) navigator.vibrate(60);
    },
  });

  // ── Submit an entry ───────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || boxWeight === '') return;

    setFeedback('saving');

    const payload = {
      batchId: session.batchCode,
      station: 'MISE_EN_BOITE',
      weight: Number(boxWeight),
      notes: notes || undefined,
      timestamp: new Date().toISOString(),
    };

    if (!isOnline) {
      addToOfflineQueue({ module: 'EMBALLAGE', action: 'mise-en-boite', data: payload, timestamp: new Date().toISOString() });
      // Optimistic update
      setSession(prev => prev ? { ...prev, processedWeight: prev.processedWeight + Number(boxWeight) } : null);
      setBoxWeight('');
      setNotes('');
      setFeedback('success');
      if (navigator.vibrate) navigator.vibrate(60);
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
        setMlResult(data.ml ?? null);

        // Update session weight
        const newProcessed = session.processedWeight + Number(boxWeight);
        setSession(prev => prev ? { ...prev, processedWeight: newProcessed } : null);
        setBoxWeight('');
        setNotes('');

        if (data.ml?.isAnomaly) {
          setFeedback('anomaly');
          if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
        } else {
          setFeedback('success');
          if (navigator.vibrate) navigator.vibrate(60);
          // Check if complete
          const newPct = Math.min(100, Math.round((newProcessed / session.initialParrageWeight) * 100));
          if (newPct >= 100) {
            setTimeout(() => { setFeedback('transition'); setShowTransitionModal(true); }, 800);
          } else {
            setTimeout(() => setFeedback('idle'), 2000);
          }
        }
      }
    } catch {
      addToOfflineQueue({ module: 'EMBALLAGE', action: 'mise-en-boite', data: payload, timestamp: new Date().toISOString() });
      setSession(prev => prev ? { ...prev, processedWeight: prev.processedWeight + Number(boxWeight) } : null);
      setBoxWeight('');
      setFeedback('success');
      setTimeout(() => setFeedback('idle'), 2000);
    }
  };

  const goToAutoclavage = () => {
    setShowTransitionModal(false);
    router.push('/dashboard/station/autoclavage');
  };

  return (
    <div className={`${styles.page} ${feedback === 'anomaly' ? styles.pageAnomaly : ''}`}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <div className={styles.icon}>📦</div>
        <div>
          <h1 className={styles.title}>{t('miseEnBoite')}</h1>
          <p className={styles.subtitle}>Saisie des boîtes remplies</p>
        </div>
        {!isOnline && <span className={styles.offlinePill}>📵 Hors-ligne</span>}
      </div>

      {/* ── Scanner ────────────────────────────────────────────────── */}
      <div className={styles.scannerCard}>
        <div className={styles.scannerLabel}>
          {session ? '✅ Lot actif' : '🔍 Scanner le lot'}
        </div>
        <input
          className={`${styles.scannerInput} ${scanner.isScanning ? styles.scannerPulse : ''}`}
          placeholder="Scanner ou taper l'ID du lot"
          autoFocus={!session}
          {...scanner.bindInput}
          onChange={e => setBatchInput(e.target.value)}
        />
        {batchInput && !session && (
          <button className={styles.manualBtn} onClick={() => loadSession(batchInput)}>
            Charger le lot →
          </button>
        )}
      </div>

      {/* ── Progress Card ──────────────────────────────────────────── */}
      {session && (
        <div className={`${styles.progressCard} ${canTransition ? styles.progressComplete : ''}`}>
          <div className={styles.progressHeader}>
            <div>
              <p className={styles.progressLabel}>{t('canning_progress')}</p>
              <p className={styles.batchCode}>{session.batchCode}</p>
            </div>
            <div className={styles.progressPct} style={{
              color: canTransition ? '#22c55e' : progress > 80 ? '#f97316' : 'var(--maritime-blue)'
            }}>
              {progress}%
            </div>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={`${styles.progressFill} ${canTransition ? styles.progressFillGreen : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={styles.weightRow}>
            <div className={styles.weightInfo}>
              <span className={styles.weightLabel}>{t('initial_weight')}</span>
              <span className={styles.weightValue}>{session.initialParrageWeight} kg</span>
            </div>
            <div className={styles.weightInfo}>
              <span className={styles.weightLabel}>{t('processed_weight')}</span>
              <span className={styles.weightValue}>{session.processedWeight.toFixed(1)} kg</span>
            </div>
          </div>

          {canTransition && (
            <div className={styles.transitionBadge}>
              🎉 {t('transition_autoclave')}
            </div>
          )}
        </div>
      )}

      {/* ── Entry Form ─────────────────────────────────────────────── */}
      {session && !canTransition && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Poids boîte(s) ajoutée(s) <span style={{ color: '#ef4444' }}>*</span></label>
            <input
              type="number" step="0.1" min="0" required
              className={styles.input}
              placeholder="ex: 45.5"
              value={boxWeight}
              onChange={e => setBoxWeight(e.target.value !== '' ? parseFloat(e.target.value) : '')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Nombre de boîtes</label>
            <input
              type="number" min="1"
              className={styles.input}
              placeholder="ex: 24"
              value={canCount}
              onChange={e => setCanCount(e.target.value !== '' ? parseInt(e.target.value) : '')}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>{t('notes')}</label>
            <textarea
              className={`${styles.input} ${styles.textarea}`}
              rows={2}
              placeholder="Observations…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          <div className={styles.formActions}>
            <button
              type="submit"
              className={`${styles.submitBtn} ${feedback === 'saving' ? styles.submitBtnLoading : ''}`}
              disabled={feedback === 'saving' || boxWeight === ''}
            >
              {feedback === 'saving' ? (
                <><span className={styles.spinner} /> Enregistrement…</>
              ) : (
                <><span>📦</span> Ajouter au lot</>
              )}
            </button>
          </div>

          {feedback === 'success' && (
            <div className={styles.successFlash}>✅ Ajouté — {(session.processedWeight).toFixed(1)} kg total</div>
          )}
          {feedback === 'anomaly' && mlResult && (
            <div className={styles.anomalyFlash}>⚠️ {mlResult.message}</div>
          )}
        </form>
      )}

      {/* ── Transition Modal ──────────────────────────────────────── */}
      {showTransitionModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.transitionModal}>
            <div className={styles.transitionEmoji}>🏭</div>
            <h2>Mise en boîte terminée!</h2>
            <p>Le lot <strong>{session?.batchCode}</strong> est prêt pour l'Autoclavage.</p>
            <div className={styles.transitionActions}>
              <button className={styles.btnGhost} onClick={() => setShowTransitionModal(false)}>
                Rester ici
              </button>
              <button className={styles.btnSuccess} onClick={goToAutoclavage}>
                → Aller à l'Autoclavage
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
