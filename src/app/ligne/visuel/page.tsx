'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './visuel.module.css';

export default function LigneVisuelPage() {
  const router = useRouter();
  const [data, setData] = useState<{ palettes: any[], chariots: any[] }>({ palettes: [], chariots: [] });
  const [loading, setLoading] = useState(true);
  const [activeLine, setActiveLine] = useState('');
  const [tonnageStats, setTonnageStats] = useState({
    totalInput: 0,
    totalOutput: 0,
    efficiency: 0,
    activeChariots: 0
  });

  const fetchData = async () => {
    const lineId = localStorage.getItem('bkfood-active-line') || '1';
    setActiveLine(lineId);
    try {
      const res = await fetch(`/api/ligne/visuel?ligneId=${lineId}`);
      const d = await res.json();
      setData(d);
      
      // Calculate production metrics
      if (d.palettes && d.chariots) {
        calculateMetrics(d.palettes, d.chariots);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateMetrics = (palettes: any[], chariots: any[]) => {
    // Calculate total input tonnage (from consumed palettes)
    const totalInput = palettes.reduce((sum, p) => sum + (p.weightKg || 0), 0);
    
    // Calculate total output (chariots converted to approximate tonnage)
    // Assuming 240 boxes per chariot, 170g per box = 41.8kg per chariot
    const totalOutput = chariots.reduce((sum, c) => sum + (c.boxCount * 0.170), 0);
    
    // Calculate efficiency (output/input * 100)
    const efficiency = totalInput > 0 ? (totalOutput / totalInput) * 100 : 0;
    
    setTonnageStats({
      totalInput,
      totalOutput,
      efficiency,
      activeChariots: chariots.length
    });
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const handleSortieChariot = () => {
    router.push('/ligne/sortie-chariot');
  };

  const handleEntreePalette = () => {
    router.push('/ligne/entree-palette');
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement du visuel ligne...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <h2>👁️ Visuel Ligne {activeLine}</h2>
          <div className={styles.lineStatus}>
            <span className={styles.statusDot}></span> EN PRODUCTION
          </div>
        </div>
        
        {/* Production Metrics */}
        <div className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>📥</div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Tonnage Entrée</span>
              <span className={styles.metricValue}>{tonnageStats.totalInput.toFixed(2)} kg</span>
            </div>
          </div>
          
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>📤</div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Tonnage Sortie</span>
              <span className={styles.metricValue}>{tonnageStats.totalOutput.toFixed(2)} kg</span>
            </div>
          </div>
          
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>📊</div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Rendement</span>
              <span className={`${styles.metricValue} ${tonnageStats.efficiency < 85 ? styles.warning : styles.success}`}>
                {tonnageStats.efficiency.toFixed(1)}%
              </span>
            </div>
          </div>
          
          <div className={styles.metricCard}>
            <div className={styles.metricIcon}>🛒</div>
            <div className={styles.metricContent}>
              <span className={styles.metricLabel}>Chariots Actifs</span>
              <span className={styles.metricValue}>{tonnageStats.activeChariots}</span>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.mainGrid}>
        {/* Active Palettes */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>📥 Palettes en cours de traitement</h3>
            <div className={styles.sectionActions}>
              <span className={styles.countBadge}>{data.palettes.length}</span>
              <button 
                className="pda-btn pda-btn-primary"
                onClick={handleEntreePalette}
              >
                ➕ Nouvelle Palette
              </button>
            </div>
          </div>
          <div className={styles.list}>
            {data.palettes.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>📦</div>
                <p>Aucune palette active sur la ligne</p>
                <p className={styles.emptyHint}>Scannez une palette depuis Chambre 0 pour commencer</p>
              </div>
            )}
            {data.palettes.map(p => (
              <div key={p.id} className={`${styles.itemCard} ${styles.paletteCard}`}>
                <div className={styles.itemHeader}>
                  <span className={`${styles.badge} ${styles.paletteBadge}`}>{p.code}</span>
                  <span className={styles.timeStamp}>{new Date(p.updatedAt).toLocaleTimeString()}</span>
                </div>
                <div className={styles.itemMain}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemArticle}>{p.article}</span>
                    <span className={styles.itemOrigin}>Origine: {p.origin}</span>
                  </div>
                  <div className={styles.itemWeight}>
                    <span className={styles.weightValue}>{p.weightKg} kg</span>
                    <span className={styles.weightLabel}>Poids restant</span>
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.metaItem}>Position: {p.positionZone}{p.positionNumber}</span>
                  <span className={styles.metaItem}>Ligne: {p.ligneId}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Ready Chariots */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3>🛒 Chariots prêts pour Autoclave</h3>
            <div className={styles.sectionActions}>
              <span className={styles.countBadge}>{data.chariots.length}</span>
              <button 
                className="pda-btn pda-btn-secondary"
                onClick={handleSortieChariot}
              >
                🚚 Nouveau Chariot
              </button>
            </div>
          </div>
          <div className={styles.list}>
            {data.chariots.length === 0 && (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>🛒</div>
                <p>Aucun chariot prêt</p>
                <p className={styles.emptyHint}>Terminez la ligne pour créer un chariot</p>
              </div>
            )}
            {data.chariots.map(c => (
              <div key={c.id} className={`${styles.itemCard} ${styles.chariotCard}`}>
                <div className={styles.itemHeader}>
                  <span className={`${styles.badge} ${styles.chariotBadge}`}>#{c.numero}</span>
                  <span className={styles.timeStamp}>{new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
                <div className={styles.itemMain}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemArticle}>{c.article}</span>
                    <span className={styles.itemCode}>{c.code}</span>
                  </div>
                  <div className={styles.itemStats}>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{c.boxCount}</span>
                      <span className={styles.statLabel}>Boîtes</span>
                    </div>
                    <div className={styles.statItem}>
                      <span className={styles.statValue}>{(c.boxCount * 0.170).toFixed(1)}</span>
                      <span className={styles.statLabel}>kg estimé</span>
                    </div>
                  </div>
                </div>
                <div className={styles.itemMeta}>
                  <span className={styles.metaItem}>Ligne: {c.ligneId}</span>
                  <span className={styles.metaItem}>Prêt depuis: {new Date(c.createdAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Production Summary */}
      <div className={styles.summary}>
        <div className={styles.summaryCard}>
          <h4>📈 Résumé Production</h4>
          <div className={styles.summaryStats}>
            <div className={styles.summaryRow}>
              <span>Efficiency globale:</span>
              <span className={`${styles.summaryValue} ${tonnageStats.efficiency < 85 ? styles.warning : styles.success}`}>
                {tonnageStats.efficiency.toFixed(1)}%
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Taux de transformation:</span>
              <span className={styles.summaryValue}>
                {(tonnageStats.totalOutput / Math.max(tonnageStats.totalInput, 1) * 100).toFixed(1)}%
              </span>
            </div>
            <div className={styles.summaryRow}>
              <span>Objectif rendement:</span>
              <span className={styles.summaryValue}>≥ 85%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
