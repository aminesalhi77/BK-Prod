'use client';

import React, { useState } from 'react';
import { useScannerInput } from '@/hooks/useScannerInput';
import styles from './tracabilite.module.css';

export default function TraceabilitePage() {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const scanner = useScannerInput({
    onScan: (code) => {
      setQuery(code);
      handleSearch(code);
    },
  });

  const handleSearch = async (code: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/emballage/traceability/${code}`);
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setData(result);
    } catch (err: any) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.searchCard}>
        <h2>🔍 Traçabilité Universelle</h2>
        <p>Scannez n'importe quel code (STR, CHR, PAL) pour voir sa généalogie.</p>
        <div className={styles.searchWrapper}>
          <input 
            className="pda-input" 
            value={query} 
            onChange={e => setQuery(e.target.value)}
            placeholder="Ex: STR-2024..."
            {...scanner.bindInput}
          />
          <button className="pda-btn pda-btn-primary" onClick={() => handleSearch(query)}>Rechercher</button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
      </div>

      {data && (
        <div className={styles.results}>
          <div className={styles.timeline}>
            {/* Packaging */}
            <div className={styles.timelineItem}>
              <div className={styles.node}>📦</div>
              <div className={styles.nodeContent}>
                <h4>Conditionnement</h4>
                {data.record ? (
                  <>
                    <p>Lot: <strong>{data.record.ticketCode}</strong></p>
                    <p>Quantité: {data.record.cartonCount} cartons ({data.record.totalBoxes} btes)</p>
                    <p>DLUO: {new Date(data.record.dluo).toLocaleDateString()}</p>
                  </>
                ) : <p className={styles.muted}>Non encore emballé</p>}
              </div>
            </div>

            {/* Sterilization */}
            <div className={styles.timelineItem}>
              <div className={styles.node}>🔥</div>
              <div className={styles.nodeContent}>
                <h4>Stérilisation</h4>
                <p>Cycle: <strong>{data.ticket.cycleId.substring(0,8)}</strong></p>
                <p>Autoclave: {data.ticket.cycle?.autoclaveId}</p>
                <p>Durée: {data.ticket.cycle?.actualDurationMin} min</p>
              </div>
            </div>

            {/* Chariots */}
            <div className={styles.timelineItem}>
              <div className={styles.node}>🛒</div>
              <div className={styles.nodeContent}>
                <h4>Chariots ({data.ticket.cycle?.chariots.length})</h4>
                <div className={styles.miniList}>
                  {data.ticket.cycle?.chariots.map((rc: any) => (
                    <div key={rc.chariot.code} className={styles.miniItem}>
                      <span>#{rc.chariot.numero}</span>
                      <span>{rc.chariot.article}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
