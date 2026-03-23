'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './historique.module.css';

export default function EmballageHistoryPage() {
  const { user } = useApp();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionData, setCorrectionData] = useState({ cartonCount: '', reason: '' });

  const fetchHistory = async () => {
    const res = await fetch('/api/emballage/history');
    const data = await res.json();
    setHistory(data.history || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const canCorrect = (record: any, index: number) => {
    if (user?.role === 'SUPER_ADMIN_IT') return true;
    if (user?.role === 'RESPONSABLE_CONDITIONNEMENT' && index === 0) return true;
    return false;
  };

  const handleCorrect = async () => {
    if (!correctionData.reason) return alert('Une raison est obligatoire');
    
    const res = await fetch('/api/production/correct', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('bkfood-token')}`
      },
      body: JSON.stringify({
        entity: 'packagingRecord',
        id: editingId,
        data: { actualBoxCount: parseInt(correctionData.cartonCount) * 24 }, // Simple example
        reason: correctionData.reason
      })
    });

    if (res.ok) {
      setEditingId(null);
      fetchHistory();
    } else {
      const d = await res.json();
      alert(d.error);
    }
  };

  if (loading) return <div>Chargement...</div>;

  return (
    <div className={styles.container}>
      <h2>Historique Emballage</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Ticket STR</th>
            <th>Boîtes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record, index) => (
            <tr key={record.id}>
              <td>{new Date(record.createdAt).toLocaleString()}</td>
              <td>{record.ticket?.code}</td>
              <td>{record.actualBoxCount}</td>
              <td>
                {canCorrect(record, index) && (
                  <button 
                    className={styles.editBtn}
                    onClick={() => {
                        setEditingId(record.id);
                        setCorrectionData({ cartonCount: (record.actualBoxCount / 24).toString(), reason: '' });
                    }}
                  >
                    ✏️ Corriger
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {editingId && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Correction de saisie</h3>
            <label>Nouveau nombre de cartons</label>
            <input 
              type="number" 
              className="pda-input" 
              value={correctionData.cartonCount}
              onChange={e => setCorrectionData({...correctionData, cartonCount: e.target.value})}
            />
            <label>Raison de la correction</label>
            <textarea 
              className="pda-input" 
              value={correctionData.reason}
              onChange={e => setCorrectionData({...correctionData, reason: e.target.value})}
              placeholder="Ex: Erreur de frappe..."
            />
            <div className={styles.modalActions}>
              <button onClick={handleCorrect} className="pda-btn pda-btn-primary">Valider</button>
              <button onClick={() => setEditingId(null)} className="pda-btn">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
