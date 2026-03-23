'use client';

/**
 * TraceabilityMap — Visual Factory Floor Map
 * -------------------------------------------
 * Shows batches as animated icons moving through stations.
 * Clicking a batch opens a split-view panel:
 *   Left  → Raw SQL data (timestamps, workers)
 *   Right → ML Insights (anomaly status, completion %)
 */

import { useState, useEffect, useCallback } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './TraceabilityMap.module.css';

// ── Types ──────────────────────────────────────────────────────────────
interface BatchPosition {
  id: string;
  batchCode: string;
  species: string;
  currentStep: StationKey;
  completionPercent: number;
  isAnomaly: boolean;
  anomalyScore: number | null;
  lastUpdated: string;
}

interface StationEntry {
  station: StationKey;
  workerId: string;
  workerName: string;
  timestamp: string;
  data: Record<string, unknown>;
}

interface BatchDetail {
  batch: BatchPosition;
  entries: StationEntry[];
  mlInsight: {
    status: 'NORMAL' | 'ANOMALY' | 'WARNING';
    confidence: number;
    completionPercent: number;
    flags: string[];
    method: string;
  };
}

type StationKey =
  | 'RECEPTION'
  | 'ABATTOIR'
  | 'CUISSON'
  | 'PARRAGE'
  | 'CHAMBRE'
  | 'MISE_EN_BOITE'
  | 'AUTOCLAVAGE'
  | 'ETIQUETAGE';

// ── Station Config ─────────────────────────────────────────────────────
const STATIONS: Array<{
  key: StationKey;
  label: string;
  icon: string;
  color: string;
  column: number;
  row: number;
}> = [
  { key: 'RECEPTION',    label: 'Réception',     icon: '🚢', color: '#6366f1', column: 0, row: 0 },
  { key: 'ABATTOIR',     label: 'Abattoir',       icon: '🔪', color: '#ef4444', column: 1, row: 0 },
  { key: 'CUISSON',      label: 'Cuisson',        icon: '🔥', color: '#f97316', column: 2, row: 0 },
  { key: 'PARRAGE',      label: 'Parrage',        icon: '⚖️', color: '#eab308', column: 3, row: 0 },
  { key: 'CHAMBRE',      label: 'Chambre froide', icon: '❄️', color: '#3b82f6', column: 4, row: 0 },
  { key: 'MISE_EN_BOITE',label: 'Mise en boîte',  icon: '📦', color: '#8b5cf6', column: 3, row: 1 },
  { key: 'AUTOCLAVAGE',  label: 'Autoclavage',    icon: '🏭', color: '#22c55e', column: 2, row: 1 },
  { key: 'ETIQUETAGE',   label: 'Étiquetage',     icon: '🏷️', color: '#14b8a6', column: 1, row: 1 },
];

// ── Mock data loader (replace with real API in production) ─────────────
const fetchMapData = async (): Promise<BatchPosition[]> => {
  try {
    const res = await fetch('/api/batches?forMap=true');
    if (res.ok) return (await res.json()).batches ?? [];
  } catch {}
  // Fallback demo data
  return [
    { id: 'b1', batchCode: 'TN-2026-001', species: 'Albacore', currentStep: 'PARRAGE',       completionPercent: 60, isAnomaly: false, anomalyScore: null,  lastUpdated: '10:32' },
    { id: 'b2', batchCode: 'TN-2026-002', species: 'Skipjack', currentStep: 'MISE_EN_BOITE', completionPercent: 42, isAnomaly: false, anomalyScore: null,  lastUpdated: '09:15' },
    { id: 'b3', batchCode: 'TN-2026-003', species: 'Yellowfin',currentStep: 'AUTOCLAVAGE',   completionPercent: 88, isAnomaly: false, anomalyScore: null,  lastUpdated: '08:50' },
    { id: 'b4', batchCode: 'TN-2026-004', species: 'Bigeye',   currentStep: 'CUISSON',       completionPercent: 20, isAnomaly: true,  anomalyScore: 0.87,  lastUpdated: '11:05' },
    { id: 'b5', batchCode: 'TN-2026-005', species: 'Albacore', currentStep: 'CHAMBRE',       completionPercent: 50, isAnomaly: false, anomalyScore: null,  lastUpdated: '07:40' },
  ];
};

const fetchBatchDetail = async (batchId: string): Promise<BatchDetail | null> => {
  try {
    const res = await fetch(`/api/batches/${batchId}/detail`);
    if (res.ok) return res.json();
  } catch {}
  // Demo detail
  const found = (await fetchMapData()).find(b => b.id === batchId);
  if (!found) return null;
  return {
    batch: found,
    entries: [
      { station: 'RECEPTION',    workerId: 'w1', workerName: 'Ahmed Ben Ali',   timestamp: '2026-02-17 06:00:00', data: { weight: 520, quality: 'A' } },
      { station: 'ABATTOIR',     workerId: 'w2', workerName: 'Fatima El Amri',  timestamp: '2026-02-17 07:15:00', data: { weight: 480, temp: 4 } },
      { station: 'CUISSON',      workerId: 'w3', workerName: 'Karim Mansouri',  timestamp: '2026-02-17 08:45:00', data: { temp: 95, duration: 90 } },
      { station: 'PARRAGE',      workerId: 'w1', workerName: 'Ahmed Ben Ali',   timestamp: '2026-02-17 10:20:00', data: { weight: 385, notes: 'RAS' } },
    ],
    mlInsight: {
      status: found.isAnomaly ? 'ANOMALY' : 'NORMAL',
      confidence: found.isAnomaly ? 87 : 94,
      completionPercent: found.completionPercent,
      flags: found.isAnomaly
        ? ['Temperature déviante (+8°C)', 'Durée cuisson hors norme']
        : [],
      method: 'IsolationForest v2.1',
    },
  };
};

// ── Component ──────────────────────────────────────────────────────────
export function TraceabilityMap() {
  const { t } = useApp();
  const [batches, setBatches] = useState<BatchPosition[]>([]);
  const [selected, setSelected] = useState<BatchDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'sql' | 'ml'>('sql');

  const load = useCallback(async () => {
    setLoading(true);
    setBatches(await fetchMapData());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [load]);

  const selectBatch = async (batchId: string) => {
    setDetailLoading(true);
    const detail = await fetchBatchDetail(batchId);
    setSelected(detail);
    setDetailLoading(false);
  };

  const getBatchesAt = (stationKey: StationKey) =>
    batches.filter(b => b.currentStep === stationKey);

  return (
    <div className={styles.container}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className={styles.header}>
        <h2 className={styles.title}>🗺️ {t('floorMap')}</h2>
        <div className={styles.headerRight}>
          <div className={styles.legend}>
            <span className={styles.legendDot} style={{ background: '#22c55e' }} />
            <span>Normal</span>
            <span className={styles.legendDot} style={{ background: '#ef4444', marginLeft: '0.75rem' }} />
            <span>Anomalie</span>
          </div>
          <button className={styles.refreshBtn} onClick={load}>↻ Actualiser</button>
        </div>
      </div>

      {/* ── Stats row ─────────────────────────────────────────────── */}
      <div className={styles.statsRow}>
        <div className={styles.stat}>
          <span className={styles.statValue}>{batches.length}</span>
          <span className={styles.statLabel}>Lots actifs</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: '#22c55e' }}>
            {batches.filter(b => !b.isAnomaly).length}
          </span>
          <span className={styles.statLabel}>Normaux</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue} style={{ color: '#ef4444' }}>
            {batches.filter(b => b.isAnomaly).length}
          </span>
          <span className={styles.statLabel}>Anomalies</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statValue}>
            {batches.length > 0
              ? Math.round(batches.reduce((s, b) => s + b.completionPercent, 0) / batches.length)
              : 0}%
          </span>
          <span className={styles.statLabel}>Avancement moy.</span>
        </div>
      </div>

      {/* ── Main split layout ─────────────────────────────────────── */}
      <div className={styles.splitLayout}>
        {/* ── Factory Map ─────────────────────────────────────────── */}
        <div className={styles.mapPanel}>
          {loading ? (
            <div className={styles.mapLoading}>
              <span className={styles.spinner} />
              <span>Chargement de la carte…</span>
            </div>
          ) : (
            <div className={styles.factoryGrid}>
              {/* Conveyor arrows */}
              <div className={styles.conveyorRow1} aria-hidden>
                {[0,1,2,3].map(i => (
                  <span key={i} className={styles.arrow}>→</span>
                ))}
              </div>
              <div className={styles.conveyorRow2} aria-hidden>
                {[0,1,2].map(i => (
                  <span key={i} className={`${styles.arrow} ${styles.arrowLeft}`}>←</span>
                ))}
              </div>

              {/* Row 0 stations */}
              <div className={styles.stationRow}>
                {STATIONS.filter(s => s.row === 0).sort((a, b) => a.column - b.column).map(station => {
                  const stationBatches = getBatchesAt(station.key);
                  return (
                    <div key={station.key} className={styles.stationBox}>
                      <div className={styles.stationHeader} style={{ borderTopColor: station.color }}>
                        <span className={styles.stationIcon}>{station.icon}</span>
                        <span className={styles.stationLabel}>{station.label}</span>
                        {stationBatches.length > 0 && (
                          <span className={styles.stationCount} style={{ background: station.color }}>
                            {stationBatches.length}
                          </span>
                        )}
                      </div>
                      <div className={styles.batchList}>
                        {stationBatches.length === 0 ? (
                          <div className={styles.emptyStation}>—</div>
                        ) : (
                          stationBatches.map(batch => (
                            <button
                              key={batch.id}
                              className={`${styles.batchToken} ${batch.isAnomaly ? styles.batchAnomaly : styles.batchNormal} ${selected?.batch.id === batch.id ? styles.batchSelected : ''}`}
                              onClick={() => selectBatch(batch.id)}
                            >
                              <span className={styles.batchCode}>{batch.batchCode}</span>
                              <div className={styles.batchMeta}>
                                <span className={styles.batchSpecies}>{batch.species}</span>
                                <span className={styles.batchPct}>{batch.completionPercent}%</span>
                              </div>
                              <div className={styles.miniProgress}>
                                <div
                                  className={styles.miniProgressBar}
                                  style={{
                                    width: `${batch.completionPercent}%`,
                                    background: batch.isAnomaly ? '#ef4444' : station.color,
                                  }}
                                />
                              </div>
                              {batch.isAnomaly && (
                                <span className={styles.anomalyBadge}>⚠ Anomalie</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Row 1 stations (reversed for snake flow) */}
              <div className={`${styles.stationRow} ${styles.stationRowReversed}`}>
                {STATIONS.filter(s => s.row === 1).sort((a, b) => b.column - a.column).map(station => {
                  const stationBatches = getBatchesAt(station.key);
                  return (
                    <div key={station.key} className={styles.stationBox}>
                      <div className={styles.stationHeader} style={{ borderTopColor: station.color }}>
                        <span className={styles.stationIcon}>{station.icon}</span>
                        <span className={styles.stationLabel}>{station.label}</span>
                        {stationBatches.length > 0 && (
                          <span className={styles.stationCount} style={{ background: station.color }}>
                            {stationBatches.length}
                          </span>
                        )}
                      </div>
                      <div className={styles.batchList}>
                        {stationBatches.length === 0 ? (
                          <div className={styles.emptyStation}>—</div>
                        ) : (
                          stationBatches.map(batch => (
                            <button
                              key={batch.id}
                              className={`${styles.batchToken} ${batch.isAnomaly ? styles.batchAnomaly : styles.batchNormal} ${selected?.batch.id === batch.id ? styles.batchSelected : ''}`}
                              onClick={() => selectBatch(batch.id)}
                            >
                              <span className={styles.batchCode}>{batch.batchCode}</span>
                              <div className={styles.batchMeta}>
                                <span className={styles.batchSpecies}>{batch.species}</span>
                                <span className={styles.batchPct}>{batch.completionPercent}%</span>
                              </div>
                              <div className={styles.miniProgress}>
                                <div
                                  className={styles.miniProgressBar}
                                  style={{
                                    width: `${batch.completionPercent}%`,
                                    background: batch.isAnomaly ? '#ef4444' : station.color,
                                  }}
                                />
                              </div>
                              {batch.isAnomaly && (
                                <span className={styles.anomalyBadge}>⚠ Anomalie</span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Detail Panel (split-view) ────────────────────────────── */}
        {selected && (
          <div className={styles.detailPanel}>
            <div className={styles.detailHeader}>
              <div>
                <h3 className={styles.detailTitle}>{selected.batch.batchCode}</h3>
                <span className={styles.detailSpecies}>{selected.batch.species}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${activeTab === 'sql' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('sql')}
              >
                🗄 Données SQL
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'ml' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('ml')}
              >
                🧠 Analyse IA
              </button>
            </div>

            {detailLoading ? (
              <div className={styles.detailLoading}><span className={styles.spinner} /></div>
            ) : (
              <div className={styles.tabContent}>
                {/* ── SQL Tab ─────────────────────────────────────────── */}
                {activeTab === 'sql' && (
                  <div className={styles.sqlPanel}>
                    <p className={styles.panelSubtitle}>Historique des stations</p>
                    <div className={styles.entriesTable}>
                      <div className={styles.tableHead}>
                        <span>Station</span>
                        <span>Ouvrier</span>
                        <span>Heure</span>
                      </div>
                      {selected.entries.map((entry, i) => {
                        const station = STATIONS.find(s => s.key === entry.station);
                        return (
                          <div key={i} className={styles.tableRow}>
                            <span className={styles.entrStation}>
                              <span>{station?.icon}</span>
                              {station?.label ?? entry.station}
                            </span>
                            <span className={styles.entrWorker}>{entry.workerName}</span>
                            <span className={styles.entrTime}>
                              {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className={styles.rawDataSection}>
                      <p className={styles.panelSubtitle}>Dernière entrée (JSON brut)</p>
                      <pre className={styles.codeBlock}>
                        {JSON.stringify(selected.entries.at(-1)?.data ?? {}, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* ── ML Tab ──────────────────────────────────────────── */}
                {activeTab === 'ml' && (
                  <div className={styles.mlPanel}>
                    {/* Status card */}
                    <div
                      className={`${styles.mlStatusCard} ${
                        selected.mlInsight.status === 'ANOMALY' ? styles.mlStatusDanger : styles.mlStatusOk
                      }`}
                    >
                      <span className={styles.mlStatusIcon}>
                        {selected.mlInsight.status === 'ANOMALY' ? '⚠️' : '✅'}
                      </span>
                      <div>
                        <p className={styles.mlStatusLabel}>
                          {selected.mlInsight.status === 'ANOMALY' ? 'Anomalie détectée' : 'Lot normal'}
                        </p>
                        <p className={styles.mlStatusConfidence}>
                          Confiance: {selected.mlInsight.confidence}%
                        </p>
                      </div>
                    </div>

                    {/* Completion */}
                    <div className={styles.mlMetric}>
                      <div className={styles.mlMetricHeader}>
                        <span>Avancement global</span>
                        <strong>{selected.mlInsight.completionPercent}%</strong>
                      </div>
                      <div className={styles.progress}>
                        <div
                          className={styles.progressBar}
                          style={{ width: `${selected.mlInsight.completionPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Flags */}
                    {selected.mlInsight.flags.length > 0 && (
                      <div className={styles.mlFlags}>
                        <p className={styles.panelSubtitle}>Alertes détectées</p>
                        {selected.mlInsight.flags.map((flag, i) => (
                          <div key={i} className={styles.mlFlag}>
                            <span className={styles.mlFlagIcon}>🚩</span>
                            {flag}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Model info */}
                    <div className={styles.mlModelInfo}>
                      <span>Modèle: </span>
                      <code>{selected.mlInsight.method}</code>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
