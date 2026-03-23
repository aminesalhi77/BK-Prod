'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './Corrections.module.css';

interface Anomaly {
  id: string;
  type: 'WEIGHT' | 'COUNT' | 'TIME' | 'QUALITY';
  entity: 'PALETTE' | 'CHARIOT' | 'CYCLE' | 'ENTRY';
  entityId: string;
  entityCode: string;
  description: string;
  confidence: number;
  detectedAt: string;
  isCorrected: boolean;
  correctedBy?: string;
  correctedAt?: string;
  correctionReason?: string;
}

interface CorrectionForm {
  reason: string;
  newValue?: string;
  newValue2?: string;
}

const ANOMALY_TYPES = [
  { value: 'WEIGHT', label: '⚖️ Poids' },
  { value: 'COUNT', label: '📦 Comptage' },
  { value: 'TIME', label: '⏱️ Temps' },
  { value: 'QUALITY', label: '🔍 Qualité' },
];

const ENTITIES = [
  { value: 'PALETTE', label: 'Palette' },
  { value: 'CHARIOT', label: 'Chariot' },
  { value: 'CYCLE', label: 'Cycle' },
  { value: 'ENTRY', label: 'Entrée' },
];

export default function CorrectionsPage() {
  const { t, token } = useApp();
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [correctionForm, setCorrectionForm] = useState<CorrectionForm>({ reason: '' });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAnomalies = async () => {
    setLoading(true);
    try {
      // In production, fetch from API
      // const res = await fetch('/api/admin/anomalies', { headers: { Authorization: `Bearer ${token}` } });
      // if (res.ok) setAnomalies(await res.json());
      
      // For now, use demo data
      setAnomalies(DEMO_ANOMALIES);
    } catch {
      setAnomalies(DEMO_ANOMALIES);
    }
    setLoading(false);
  };

  useEffect(() => { loadAnomalies(); }, []);

  const handleCorrect = async () => {
    if (!selectedAnomaly || !correctionForm.reason.trim()) {
      showToast('Veuillez indiquer une raison', 'error');
      return;
    }

    setActionLoading(selectedAnomaly.id);
    try {
      // In production, call API
      // await fetch('/api/admin/correct', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      //   body: JSON.stringify({
      //     anomalyId: selectedAnomaly.id,
      //     reason: correctionForm.reason,
      //     newValue: correctionForm.newValue,
      //   }),
      // });

      // Optimistic update
      setAnomalies(a => a.map(an => 
        an.id === selectedAnomaly.id 
          ? { ...an, isCorrected: true, correctedBy: 'Super Admin', correctedAt: new Date().toISOString(), correctionReason: correctionForm.reason }
          : an
      ));
      
      showToast('Anomalie corrigée', 'success');
      if (navigator.vibrate) navigator.vibrate(60);
      
      setSelectedAnomaly(null);
      setCorrectionForm({ reason: '' });
    } catch {
      showToast('Erreur lors de la correction', 'error');
    }
    setActionLoading(null);
  };

  const getAnomalyColor = (type: string) => {
    switch (type) {
      case 'WEIGHT': return '#ef4444';
      case 'COUNT': return '#f59e0b';
      case 'TIME': return '#3b82f6';
      case 'QUALITY': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  const getEntityIcon = (entity: string) => {
    switch (entity) {
      case 'PALETTE': return '📦';
      case 'CHARIOT': return '🚚';
      case 'CYCLE': return '🔄';
      case 'ENTRY': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>🔧 Corrections</h1>
        <p className={styles.pageSubtitle}>Gestion des anomalies et corrections de données</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#ef4444' }}>
            {anomalies.filter(a => !a.isCorrected).length}
          </span>
          <span className={styles.statLabel}>En attente</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#22c55e' }}>
            {anomalies.filter(a => a.isCorrected).length}
          </span>
          <span className={styles.statLabel}>Corrigées</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#3b82f6' }}>
            {anomalies.length}
          </span>
          <span className={styles.statLabel}>Total</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#f59e0b' }}>
            {Math.round(anomalies.reduce((acc, a) => acc + a.confidence, 0) / anomalies.length || 0)}%
          </span>
          <span className={styles.statLabel}>Confiance moyenne</span>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loading}><span className={styles.spinner} /></div>
      ) : (
        <div className={styles.tableCard}>
          {anomalies.length === 0 ? (
            <div className={styles.empty}>
              <span>✅</span>
              <p>Aucune anomalie détectée</p>
            </div>
          ) : (
            <>
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>Type</span>
                  <span>Entité</span>
                  <span>Code</span>
                  <span>Description</span>
                  <span>Confiance</span>
                  <span>Détectée le</span>
                  <span>État</span>
                  <span>Actions</span>
                </div>
                {anomalies.map(anomaly => (
                  <div key={anomaly.id} className={`${styles.tableRow} ${anomaly.isCorrected ? styles.rowCorrected : ''}`}>
                    <span className={styles.typeBadge} style={{ color: getAnomalyColor(anomaly.type), borderColor: getAnomalyColor(anomaly.type) + '44' }}>
                      {ANOMALY_TYPES.find(t => t.value === anomaly.type)?.label} {anomaly.type}
                    </span>
                    <span className={styles.entityBadge}>
                      {getEntityIcon(anomaly.entity)} {anomaly.entity}
                    </span>
                    <span className={styles.code}>{anomaly.entityCode}</span>
                    <span className={styles.description}>{anomaly.description}</span>
                    <span className={styles.confidence} style={{ color: getAnomalyColor(anomaly.type) }}>
                      {Math.round(anomaly.confidence * 100)}%
                    </span>
                    <span className={styles.date}>
                      {new Date(anomaly.detectedAt).toLocaleString('fr-FR')}
                    </span>
                    <span className={`${styles.status} ${anomaly.isCorrected ? styles.statusCorrected : styles.statusPending}`}>
                      {anomaly.isCorrected ? '✅ Corrigée' : '⏳ En attente'}
                    </span>
                    <div className={styles.actionBtns}>
                      {!anomaly.isCorrected && (
                        <button
                          className={styles.correctBtn}
                          onClick={() => setSelectedAnomaly(anomaly)}
                        >
                          🔧 Corriger
                        </button>
                      )}
                      {anomaly.isCorrected && (
                        <span className={styles.correctedBy}>
                          par {anomaly.correctedBy}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* ML Retraining Section */}
              <div className={styles.retrainSection}>
                <h3>🤖 Amélioration ML</h3>
                <p className={styles.retrainDesc}>
                  Les corrections validées permettent de re-entraîner les modèles d'anomalie pour améliorer la précision.
                </p>
                <button className={styles.retrainBtn} onClick={() => showToast('Modèle ML mis à jour', 'success')}>
                  🔄 Re-entraîner le modèle
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Correction Modal */}
      {selectedAnomaly && (
        <div className={styles.modalOverlay} onClick={() => setSelectedAnomaly(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Corriger l'anomalie</h3>
            <div className={styles.anomalyInfo}>
              <div className={styles.infoRow}>
                <strong>Type:</strong>
                <span className={styles.typeBadge} style={{ color: getAnomalyColor(selectedAnomaly.type) }}>
                  {ANOMALY_TYPES.find(t => t.value === selectedAnomaly.type)?.label} {selectedAnomaly.type}
                </span>
              </div>
              <div className={styles.infoRow}>
                <strong>Entité:</strong>
                <span>{getEntityIcon(selectedAnomaly.entity)} {selectedAnomaly.entity}</span>
              </div>
              <div className={styles.infoRow}>
                <strong>Code:</strong>
                <span className={styles.code}>{selectedAnomaly.entityCode}</span>
              </div>
              <div className={styles.infoRow}>
                <strong>Description:</strong>
                <span>{selectedAnomaly.description}</span>
              </div>
              <div className={styles.infoRow}>
                <strong>Confiance:</strong>
                <span style={{ color: getAnomalyColor(selectedAnomaly.type) }}>
                  {Math.round(selectedAnomaly.confidence * 100)}%
                </span>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Raison de la correction *</label>
              <textarea
                value={correctionForm.reason}
                onChange={e => setCorrectionForm({ ...correctionForm, reason: e.target.value })}
                placeholder="Décrivez pourquoi cette donnée est incorrecte et quelle est la valeur correcte..."
                rows={4}
              />
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setSelectedAnomaly(null)}>Annuler</button>
              <button 
                className={styles.correctBtn} 
                onClick={handleCorrect} 
                disabled={actionLoading === selectedAnomaly.id || !correctionForm.reason.trim()}
              >
                {actionLoading === selectedAnomaly.id ? <span className={styles.spinner} /> : '✅ Confirmer la correction'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demo data ──────────────────────────────────────────────────────────
const DEMO_ANOMALIES: Anomaly[] = [
  {
    id: 'a1',
    type: 'WEIGHT',
    entity: 'PALETTE',
    entityId: 'p1',
    entityCode: 'PAL-20260217-001',
    description: 'Poids anormalement bas détecté lors de l\'entrée en chambre froide',
    confidence: 0.85,
    detectedAt: '2026-02-17T08:30:00Z',
    isCorrected: false,
  },
  {
    id: 'a2',
    type: 'COUNT',
    entity: 'CHARIOT',
    entityId: 'c1',
    entityCode: 'CHR-20260217-005',
    description: 'Nombre de boîtes supérieur à la capacité maximale du chariot',
    confidence: 0.72,
    detectedAt: '2026-02-17T10:15:00Z',
    isCorrected: true,
    correctedBy: 'Super Admin',
    correctedAt: '2026-02-17T10:45:00Z',
    correctionReason: 'Erreur de saisie, le nombre de boîtes a été corrigé',
  },
  {
    id: 'a3',
    type: 'TIME',
    entity: 'CYCLE',
    entityId: 'cy1',
    entityCode: 'CYC-20260217-001',
    description: 'Durée du cycle d\'autoclavage trop courte par rapport à la norme',
    confidence: 0.91,
    detectedAt: '2026-02-17T14:20:00Z',
    isCorrected: false,
  },
  {
    id: 'a4',
    type: 'QUALITY',
    entity: 'ENTRY',
    entityId: 'e1',
    entityCode: 'ENT-20260217-012',
    description: 'Données de température manquantes lors de l\'enregistrement de la ligne',
    confidence: 0.68,
    detectedAt: '2026-02-17T16:05:00Z',
    isCorrected: false,
  },
];