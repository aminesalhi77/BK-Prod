'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import ChambreMap from '@/components/ChambreMap/ChambreMap';
import styles from './visuel.module.css';

export default function ChambreVisualPage() {
    const { t } = useApp();
    const [stock, setStock] = useState<any[]>([]);
    const [indicators, setIndicators] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPalette, setSelectedPalette] = useState<any>(null);

    const fetchData = async () => {
        try {
            const [stockRes, indRes] = await Promise.all([
                fetch('/api/chambre/stock'),
                fetch('/api/chambre/indicators')
            ]);
            
            const stockData = await stockRes.json();
            const indData = await indRes.json();
            
            setStock(stockData.stock || []);
            setIndicators(indData.indicators || null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // 30s auto-refresh
        return () => clearInterval(interval);
    }, []);

    const handleSelect = (num: number, zone: string) => {
        const p = stock.find(item => item.positionNumber === num && item.positionZone === zone);
        setSelectedPalette(p || null);
    };

    const getWaitTime = (entryTime: string) => {
        const start = new Date(entryTime).getTime();
        const diff = Date.now() - start;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    };

    if (loading) return <div className="p-4">Chargement du stock...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <h2>👁️ Visuel Chambre 0</h2>
                    <span className={styles.lastUpdate}>Dernière mise à jour: {new Date().toLocaleTimeString()}</span>
                </div>
                <div className={styles.legend}>
                    <div className={styles.legendItem}><span className={styles.boxEmpty}></span> Vide</div>
                    <div className={styles.legendItem}><span className={styles.boxFull}></span> Occupé</div>
                    <div className={styles.legendItem}><span className={styles.boxAlert}></span> Alerte ({'>'}8h)</div>
                </div>
            </div>

            <div className={styles.mainLayout}>
                <div className={styles.mapSection}>
                    <ChambreMap 
                        palettes={stock}
                        onPositionSelect={handleSelect}
                    />
                </div>

                <div className={styles.infoSection}>
                    {indicators && (
                        <div className={styles.indicatorsPanel}>
                            <div className={styles.statLine}>
                                <div className={styles.statBox}>
                                    <label>Tonnage Total</label>
                                    <span className={styles.val}>{(indicators.totalTonnage / 1000).toFixed(2)} T</span>
                                </div>
                                <div className={styles.statBox}>
                                    <label>Alerte ({'>'}8h)</label>
                                    <span className={indicators.inAlert > 0 ? styles.valAlert : styles.val}>{indicators.inAlert}</span>
                                </div>
                            </div>
                            <div className={styles.statBox}>
                                <label>Occupancy</label>
                                <div className={styles.progressBar}>
                                    <div className={styles.progress} style={{ width: `${(indicators.totalPalettes / 36) * 100}%` }}></div>
                                </div>
                                <span className={styles.sub}>{indicators.totalPalettes}/36 positions</span>
                            </div>
                        </div>
                    )}

                    {selectedPalette ? (
                        <div className={styles.paletteDetails}>
                            <h3>Détails Position {selectedPalette.positionZone}{selectedPalette.positionNumber}</h3>
                            <div className={styles.card}>
                                <div className={styles.infoRow}>
                                    <label>Code Palette:</label>
                                    <span>{selectedPalette.code}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <label>Type Longe:</label>
                                    <span>{selectedPalette.longeType}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <label>Entrée:</label>
                                    <span>{new Date(selectedPalette.entryTime).toLocaleString()}</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <label>Attente:</label>
                                    <span className={styles.alertText}>
                                        {getWaitTime(selectedPalette.entryTime)}
                                    </span>
                                </div>
                                <div className={styles.infoRow}>
                                    <label>Poids:</label>
                                    <span>{selectedPalette.weightKg} kg</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className={styles.emptyInfo}>
                            <img src="/placeholder-map.png" alt="" className={styles.placeholderImg} />
                            <p>Sélectionnez un emplacement sur le plan pour voir les détails de la palette.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
