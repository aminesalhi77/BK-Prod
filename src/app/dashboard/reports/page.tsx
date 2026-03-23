'use client';

import React from 'react';
import styles from './reports.module.css';

export default function ReportsPage() {
  return (
    <div className={styles.container}>
      <h1>Rapports de Production</h1>
      <p>Consultation des rapports par jour, mois et année.</p>
      
      <div className={styles.actions}>
        <button className="action-btn">Exporter Excel</button>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <h3>Production Journalière</h3>
          <p>Chargement des données...</p>
        </div>
        <div className={styles.statCard}>
          <h3>Stats Mensuelles</h3>
          <p>Chargement des données...</p>
        </div>
      </div>
    </div>
  );
}
