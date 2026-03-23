'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './indicateurs.module.css';

export default function ChambreIndicateursPage() {
    const { t } = useApp();
    const [indicators, setIndicators] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const fetchIndicators = async () => {
        try {
            const res = await fetch('/api/chambre/indicators');
            const data = await res.json();
            setIndicators(data.indicators);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchIndicators();
    }, []);

    if (loading) return <div className="p-4">Chargement...</div>;

    return (
        <div className={styles.container}>
            <h2>📈 Indicateurs Chambre 0</h2>
            
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <label>Tonnage Actuel</label>
                    <span className={styles.value}>{(indicators?.totalTonnage / 1000 || 0).toFixed(2)} T</span>
                </div>
                <div className={styles.statCard}>
                    <label>Nombre de Palettes</label>
                    <span className={styles.value}>{indicators?.totalPalettes || 0}</span>
                </div>
                <div className={styles.statCard}>
                    <label>Palettes en Alerte</label>
                    <span className={`${styles.value} ${indicators?.inAlert > 0 ? styles.alert : ''}`}>
                        {indicators?.inAlert || 0}
                    </span>
                </div>
            </div>

            <div className={styles.chartSection}>
                <h3>Répartition par type de longe</h3>
                <div className={styles.barList}>
                    {indicators?.byType && Object.entries(indicators.byType).map(([type, weight]: [string, any]) => (
                        <div key={type} className={styles.barRow}>
                            <span className={styles.barLabel}>{type}</span>
                            <div className={styles.barContainer}>
                                <div 
                                    className={styles.bar} 
                                    style={{ width: `${(weight / indicators.totalTonnage) * 100}%` }}
                                ></div>
                            </div>
                            <span className={styles.barValue}>{((weight as number) / 1000).toFixed(1)} T</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
