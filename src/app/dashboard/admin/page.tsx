'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin-dashboard.module.css';

type Period = 'day' | 'week' | 'month' | 'year';
type FlowChartType = 'bar' | 'line';
type LigneChartType = 'bar' | 'doughnut';
type WeightChartType = 'line' | 'bar';

const PERIOD_LABELS: Record<Period, string> = {
  day: "Aujourd'hui",
  week: 'Cette semaine',
  month: 'Ce mois',
  year: 'Cette année',
};

export default function AdminProductionDashboard() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>('day');
  const [stats, setStats] = useState<any>(null);
  const [flowChartData, setFlowChartData] = useState<any>(null);
  const [weightChartData, setWeightChartData] = useState<any>(null);
  const [statusDistribution, setStatusDistribution] = useState<any>(null);
  const [chariotsPerLigne, setChariotsPerLigne] = useState<any[]>([]);
  const [topWorkers, setTopWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [searchResult, setSearchResult] = useState<any | null>(null);
  const [searchError, setSearchError] = useState('');
  const [searching, setSearching] = useState(false);

  // Chart type states
  const [flowChartType, setFlowChartType] = useState<FlowChartType>('bar');
  const [ligneChartType, setLigneChartType] = useState<LigneChartType>('bar');
  const [weightChartType, setWeightChartType] = useState<WeightChartType>('line');

  // Chart refs
  const flowRef = useRef<HTMLCanvasElement>(null);
  const ligneRef = useRef<HTMLCanvasElement>(null);
  const weightRef = useRef<HTMLCanvasElement>(null);
  const flowInstance = useRef<any>(null);
  const ligneInstance = useRef<any>(null);
  const weightInstance = useRef<any>(null);

  const fetchStats = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stats?period=${p}`);
      const data = await res.json();
      setStats(data.stats);
      setFlowChartData(data.flowChartData);
      setWeightChartData(data.weightChartData);
      setStatusDistribution(data.statusDistribution);
      setChariotsPerLigne(data.chariotsPerLigne || []);
      setTopWorkers(data.topWorkers || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(period); }, [period, fetchStats]);
  useEffect(() => {
    const interval = setInterval(() => fetchStats(period), 30000);
    return () => clearInterval(interval);
  }, [period, fetchStats]);

  const buildChart = useCallback((
    ref: React.RefObject<HTMLCanvasElement>,
    instanceRef: React.MutableRefObject<any>,
    type: string,
    data: any,
    options: any
  ) => {
    const Chart = (window as any).Chart;
    if (!Chart || !ref.current || !data) return;
    if (instanceRef.current) { instanceRef.current.destroy(); instanceRef.current = null; }
    instanceRef.current = new Chart(ref.current, { type, data, options });
  }, []);

  // Flow chart
  useEffect(() => {
    if (!flowChartData) return;
    const isLine = flowChartType === 'line';
    buildChart(flowRef, flowInstance, flowChartType, {
      labels: flowChartData.labels,
      datasets: [
        {
          label: 'Entrées Palettes',
          data: flowChartData.entriesData,
          backgroundColor: isLine ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.75)',
          borderColor: '#3b82f6',
          borderWidth: 2,
          fill: isLine,
          tension: 0.4,
          borderRadius: isLine ? 0 : 4,
          pointBackgroundColor: '#3b82f6',
        },
        {
          label: 'Sorties Palettes',
          data: flowChartData.exitsData,
          backgroundColor: isLine ? 'rgba(139,92,246,0.1)' : 'rgba(139,92,246,0.75)',
          borderColor: '#8b5cf6',
          borderWidth: 2,
          fill: isLine,
          tension: 0.4,
          borderRadius: isLine ? 0 : 4,
          pointBackgroundColor: '#8b5cf6',
        },
        {
          label: 'Chariots',
          data: flowChartData.chariotsData,
          backgroundColor: isLine ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.75)',
          borderColor: '#10b981',
          borderWidth: 2,
          fill: isLine,
          tension: 0.4,
          borderRadius: isLine ? 0 : 4,
          pointBackgroundColor: '#10b981',
        },
      ],
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
        y: { beginAtZero: true, ticks: { stepSize: 1 } },
      },
    });
  }, [flowChartData, flowChartType, buildChart]);

  // Ligne chart
  useEffect(() => {
    if (!chariotsPerLigne.length) return;
    const labels = chariotsPerLigne.map(l => l.ligne.replace('Ligne ', ''));
    const counts = chariotsPerLigne.map(l => l.count);
    const boxes = chariotsPerLigne.map(l => l.boxes);
    const colors = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'];

    if (ligneChartType === 'doughnut') {
      buildChart(ligneRef, ligneInstance, 'doughnut', {
        labels: chariotsPerLigne.map(l => l.ligne),
        datasets: [{
          data: counts,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#fff',
        }],
      }, {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        cutout: '60%',
      });
    } else {
      buildChart(ligneRef, ligneInstance, 'bar', {
        labels,
        datasets: [
          {
            label: 'Chariots',
            data: counts,
            backgroundColor: colors,
            borderRadius: 4,
            borderWidth: 0,
          },
          {
            label: 'Boites',
            data: boxes,
            backgroundColor: colors.map(c => c + '55'),
            borderRadius: 4,
            borderWidth: 0,
          },
        ],
      }, {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true },
        },
      });
    }
  }, [chariotsPerLigne, ligneChartType, buildChart]);

  // Weight chart
  useEffect(() => {
    if (!weightChartData) return;
    const isLine = weightChartType === 'line';
    buildChart(weightRef, weightInstance, weightChartType, {
      labels: weightChartData.labels,
      datasets: [
        {
          label: 'Poids (kg)',
          data: weightChartData.weightData,
          backgroundColor: isLine ? 'rgba(245,158,11,0.15)' : 'rgba(245,158,11,0.75)',
          borderColor: '#f59e0b',
          borderWidth: 2,
          fill: isLine,
          tension: 0.4,
          borderRadius: isLine ? 0 : 4,
          yAxisID: 'y',
        },
        {
          label: 'Boites',
          data: weightChartData.boxesData,
          backgroundColor: isLine ? 'rgba(236,72,153,0.1)' : 'rgba(236,72,153,0.6)',
          borderColor: '#ec4899',
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          borderRadius: isLine ? 0 : 4,
          yAxisID: 'y1',
        },
      ],
    }, {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { mode: 'index', intersect: false } },
      scales: {
        x: { grid: { display: false }, ticks: { maxTicksLimit: 12, maxRotation: 45 } },
        y: { beginAtZero: true, position: 'left', title: { display: true, text: 'kg' } },
        y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'boites' } },
      },
    });
  }, [weightChartData, weightChartType, buildChart]);

  const handleSearch = async () => {
    if (!searchCode.trim()) return;
    setSearching(true); setSearchError(''); setSearchResult(null);
    try {
      const res = await fetch(`/api/chambre/stock?code=${searchCode.trim()}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data.palette || null);
        if (!data.palette) setSearchError('Aucune palette trouvée avec ce code.');
      } else { setSearchError('Palette introuvable.'); }
    } catch (e) { setSearchError('Erreur de recherche.'); }
    finally { setSearching(false); }
  };

  const handleExcelExport = () => {
    const headers = ['Période','Palettes Entrées','Palettes Sorties','En Chambre','Poids Total (kg)','Boites','Chariots','Cycles Autoclave','Emballages','Mouvements','Utilisateurs'];
    const row = stats ? [period, stats.palettesIn, stats.palettesOut, stats.palettesInChambre, stats.totalWeightKg?.toFixed(1), stats.totalBoxes, stats.chariotsCreated, stats.autoclaveCycles, stats.packagingRecords, stats.movements, stats.userCount] : [];
    const csv = [headers.join(','), row.join(',')].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rapport-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleLogout = () => {
    localStorage.removeItem('bkfood-token');
    localStorage.removeItem('bkfood-user');
    router.push('/');
  };

  return (
    <>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js" async />
      <div className={styles.container}>

        {/* Mobile Header */}
        <div className={`${styles.mobileHeader} mobile-only`}>
          <h2 className={styles.title}>📊 Admin Production</h2>
          <button className={styles.mobileLogoutBtn} onClick={handleLogout}>🚪</button>
        </div>

        {/* Desktop Header */}
        <div className={`${styles.header} desktop-only`}>
          <div>
            <h2 className={styles.title}>📊 Admin Production</h2>
            <p className={styles.subtitle}>Consultation totale · Rapports · Statistiques · Traçabilité</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.exportBtn} onClick={handleExcelExport}> Exporter Excel</button>
          </div>
        </div>

        {/* Period Tabs */}
        <div className={styles.periodTabs}>
          {(Object.keys(PERIOD_LABELS) as Period[]).map(p => (
            <button key={p} className={`${styles.periodTab} ${period === p ? styles.periodTabActive : ''}`} onClick={() => setPeriod(p)}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        {/* Stats Grid */}
        {loading ? (
          <div className={styles.loadingRow}>⏳ Chargement...</div>
        ) : stats ? (
          <div className={styles.statsGrid}>
            <StatCard icon="📥" label="Palettes Entrées" value={stats.palettesIn} color="#3b82f6" />
            <StatCard icon="📤" label="Palettes Sorties" value={stats.palettesOut} color="#8b5cf6" />
            <StatCard icon="❄️" label="En Chambre" value={stats.palettesInChambre} color="#06b6d4" />
            <StatCard icon="⚖️" label="Poids Total" value={`${stats.totalWeightKg?.toFixed(0)} kg`} color="#f59e0b" />
            <StatCard icon="📦" label="Boites Produites" value={stats.totalBoxes} color="#ec4899" />
            <StatCard icon="🛒" label="Chariots" value={stats.chariotsCreated} color="#10b981" />
            <StatCard icon="♨️" label="Cycles Autoclave" value={stats.autoclaveCycles} color="#f97316" />
            <StatCard icon="✅" label="Cycles Terminés" value={stats.completedCycles} color="#16a34a" />
            <StatCard icon="📦" label="Emballages" value={stats.packagingRecords} color="#a855f7" />
            <StatCard icon="⏱️" label="Durée Moy. Cycle" value={`${stats.avgCycleDurationMin} min`} color="#0ea5e9" />
            <StatCard icon="🔄" label="Mouvements" value={stats.movements} color="#14b8a6" />
            <StatCard icon="👥" label="Utilisateurs Actifs" value={stats.userCount} color="#f43f5e" />
          </div>
        ) : <div className={styles.loadingRow}>❌ Erreur</div>}

        {/* Chart 1: Production Flow */}
        <div className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3 className={styles.sectionTitle}>📈 Flux de Production</h3>
              <p className={styles.chartSubtitle}>Palettes entrées / sorties · Chariots créés</p>
            </div>
            <div className={styles.chartTypeSelector}>
              <button className={`${styles.chartTypeBtn} ${flowChartType === 'bar' ? styles.chartTypeBtnActive : ''}`} onClick={() => setFlowChartType('bar')}>▊ Barres</button>
              <button className={`${styles.chartTypeBtn} ${flowChartType === 'line' ? styles.chartTypeBtnActive : ''}`} onClick={() => setFlowChartType('line')}>↗ Courbe</button>
            </div>
          </div>
          <div className={styles.chartLegendRow}>
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#3b82f6' }} />Entrées</span>
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#8b5cf6' }} />Sorties</span>
            <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#10b981' }} />Chariots</span>
          </div>
          <div className={styles.chartContainer}><canvas ref={flowRef} /></div>
        </div>

        {/* Chart 2 + 3 side by side */}
        <div className={styles.chartsRow}>
          {/* Ligne Activity */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>🏭 Activité par Ligne</h3>
                <p className={styles.chartSubtitle}>Chariots et boites par ligne</p>
              </div>
              <div className={styles.chartTypeSelector}>
                <button className={`${styles.chartTypeBtn} ${ligneChartType === 'bar' ? styles.chartTypeBtnActive : ''}`} onClick={() => setLigneChartType('bar')}>▊ Barres</button>
                <button className={`${styles.chartTypeBtn} ${ligneChartType === 'doughnut' ? styles.chartTypeBtnActive : ''}`} onClick={() => setLigneChartType('doughnut')}>◎ Cercle</button>
              </div>
            </div>
            {chariotsPerLigne.length === 0 ? (
              <div className={styles.emptyChart}>Aucune donnée pour cette période</div>
            ) : ligneChartType === 'doughnut' ? (
              <div className={styles.doughnutWrapper}>
                <div className={styles.doughnutContainer}><canvas ref={ligneRef} /></div>
                <div className={styles.doughnutLegend}>
                  {chariotsPerLigne.map((l, i) => (
                    <div key={l.ligne} className={styles.doughnutLegendItem}>
                      <span className={styles.legendDot} style={{ background: ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444'][i] }} />
                      <span className={styles.doughnutLegendLabel}>{l.ligne.replace('Ligne ','L.')}</span>
                      <span className={styles.doughnutLegendValue}>{l.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={styles.chartContainerSm}><canvas ref={ligneRef} /></div>
            )}
          </div>

          {/* Weight Trend */}
          <div className={styles.chartCard}>
            <div className={styles.chartHeader}>
              <div>
                <h3 className={styles.sectionTitle}>⚖️ Poids & Boites</h3>
                <p className={styles.chartSubtitle}>Kg traités · Boites produites</p>
              </div>
              <div className={styles.chartTypeSelector}>
                <button className={`${styles.chartTypeBtn} ${weightChartType === 'line' ? styles.chartTypeBtnActive : ''}`} onClick={() => setWeightChartType('line')}>↗ Courbe</button>
                <button className={`${styles.chartTypeBtn} ${weightChartType === 'bar' ? styles.chartTypeBtnActive : ''}`} onClick={() => setWeightChartType('bar')}>▊ Barres</button>
              </div>
            </div>
            <div className={styles.chartLegendRow}>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#f59e0b' }} />Poids (kg)</span>
              <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: '#ec4899' }} />Boites</span>
            </div>
            <div className={styles.chartContainerSm}><canvas ref={weightRef} /></div>
          </div>
        </div>

        {/* Top Workers */}
        {topWorkers.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>🏆 Top 5 Opérateurs</h3>
            <div className={styles.workersGrid}>
              {topWorkers.map((w, i) => (
                <div key={w.matricule} className={styles.workerCard}>
                  <span className={styles.workerRank}>#{i + 1}</span>
                  <span className={styles.workerMatricule}>{w.matricule}</span>
                  <span className={styles.workerCount}>{w.movements} mvts</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Search */}
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🔍 Recherche Trajet Produit</h3>
          <div className={styles.searchRow}>
            <input className={styles.searchInput} placeholder="Code palette (ex: PAL-20260318-0001)..." value={searchCode} onChange={e => setSearchCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <button className={styles.searchBtn} onClick={handleSearch} disabled={searching}>{searching ? '⏳' : '🔍 Rechercher'}</button>
          </div>
          {searchError && <p className={styles.searchError}>❌ {searchError}</p>}
          {searchResult && (
            <div className={styles.resultCard}>
              <h4>📦 Palette : {searchResult.code}</h4>
              <div className={styles.resultGrid}>
                <InfoRow label="Statut" value={searchResult.status} />
                <InfoRow label="Espèce" value={searchResult.species} />
                <InfoRow label="Article" value={searchResult.article} />
                <InfoRow label="Poids" value={`${searchResult.weightKg} kg`} />
                <InfoRow label="Origine" value={searchResult.origin} />
                <InfoRow label="Entrée Chambre" value={searchResult.entryTime ? new Date(searchResult.entryTime).toLocaleString('fr-FR') : '—'} />
                <InfoRow label="Sortie Chambre" value={searchResult.exitTime ? new Date(searchResult.exitTime).toLocaleString('fr-FR') : '—'} />
                <InfoRow label="Opérateur" value={searchResult.chambreWorkerId || '—'} />
                <InfoRow label="Position" value={searchResult.positionZone ? `${searchResult.positionZone}${searchResult.positionNumber}` : '—'} />
              </div>
              {searchResult.movements?.length > 0 && (
                <div className={styles.timeline}>
                  <h5>🗺️ Trajet Complet</h5>
                  {searchResult.movements.map((m: any, i: number) => (
                    <div key={i} className={styles.timelineItem}>
                      <div className={styles.timelineDot} />
                      <div>
                        <strong>{m.fromStation} → {m.toStation}</strong>
                        <span className={styles.timelineOp}> · {m.workerMatricule}</span>
                        <div className={styles.timelineDate}>{new Date(m.timestamp).toLocaleString('fr-FR')}</div>
                        {m.notes && <div className={styles.timelineNotes}>{m.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statIcon} style={{ background: color + '18', color }}>{icon}</div>
      <div className={styles.statValue} style={{ color }}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}