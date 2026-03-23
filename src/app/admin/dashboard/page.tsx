'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './dashboard.module.css';

export default function AdminDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/admin/kpis').then(r => r.json()).then(d => setData(d.kpis));
  }, []);

  if (!data) return <div>Initialisation...</div>;

  const cards = [
    { title: 'Palettes Totales', value: data.palettesCount, icon: '📥', color: '#3b82f6' },
    { title: 'Chariots Produits', value: data.chariotsCount, icon: '🛒', color: '#10b981' },
    { title: 'Cycles Stérilisation', value: data.cyclesCount, icon: '🔥', color: '#f59e0b' },
    { title: 'Lots Emballés', value: data.recordsCount, icon: '📦', color: '#6366f1' },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        {cards.map(card => (
          <div key={card.title} className={styles.card}>
            <div className={styles.icon} style={{ backgroundColor: card.color + '20', color: card.color }}>
              {card.icon}
            </div>
            <div className={styles.info}>
              <span className={styles.label}>{card.title}</span>
              <span className={styles.value}>{card.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.chartPlaceholder}>
          <h3>Rendement de Production (%)</h3>
          <div className={styles.yieldBox}>
            <span className={styles.yieldValue}>{data.yieldPct}%</span>
            <p>Conformité IA: HAUTE ✅</p>
          </div>
        </div>

        <div className={styles.recentActivity}>
          <h3>Personnel Actif</h3>
          <span className={styles.workerCount}>{data.activeWorkers} Opérateurs</span>
        </div>
      </div>

      {/* AI Interface Card */}
      <div className={styles.aiCard} onClick={() => {
        const router = useRouter();
        router.push('/admin/ai');
      }}>
        <div className={styles.aiContent}>
          <div className={styles.aiInfo}>
            <span className={styles.aiIcon}>🤖</span>
            <div>
              <h3>IA Production</h3>
              <p>Générez le plan d'action pour demain basé sur les données d'aujourd'hui</p>
            </div>
          </div>
          <div className={styles.aiActions}>
            <button onClick={(e) => {
              e.stopPropagation();
              const router = useRouter();
              router.push('/admin/ai');
            }}>
              Ouvrir l'interface IA →
            </button>
            <span className={styles.aiStatus}>Serveur en ligne ✅</span>
          </div>
        </div>
      </div>
    </div>
  );
}
