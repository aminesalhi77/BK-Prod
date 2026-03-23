'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './historique.module.css';

export default function AutoclaveHistoryPage() {
  const { user } = useApp();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionData, setCorrectionData] = useState({ totalBoxes: '', reason: '' });

  const fetchHistory = async () => {
    const res = await fetch('/api/autoclave/history');
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
        entity: 'autoclaveCycle',
        id: editingId,
        data: { totalBoxes: parseInt(correctionData.totalBoxes) },
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
      <h2>Historique Autoclave (Cycles)</h2>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Autoclave</th>
            <th>Boîtes</th>
            <th>Statut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {history.map((record, index) => (
            <tr key={record.id}>
              <td>{new Date(record.startTime).toLocaleString()}</td>
              <td>{record.autoclaveId}</td>
              <td>{record.totalBoxes}</td>
              <td>{record.status}</td>
              <td>
                {canCorrect(record, index) && (
                  <button 
                    className={styles.editBtn}
                    onClick={() => {
                        setEditingId(record.id);
                        setCorrectionData({ totalBoxes: record.totalBoxes.toString(), reason: '' });
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
            <h3>Correction de cycle</h3>
            <label>Nouveau nombre de boîtes</label>
            <input 
              type="number" 
              className="pda-input" 
              value={correctionData.totalBoxes}
              onChange={e => setCorrectionData({...correctionData, totalBoxes: e.target.value})}
            />
            <label>Raison de la correction</label>
            <textarea 
              className="pda-input" 
              value={correctionData.reason}
              onChange={e => setCorrectionData({...correctionData, reason: e.target.value})}
              placeholder="Ex: Erreur de décompte..."
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
