'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './historique.module.css';

export default function LigneHistoryPage() {
  const { user } = useApp();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [correctionData, setCorrectionData] = useState({ weightKg: '', reason: '' });
  const [activeLine, setActiveLine] = useState('');

  const fetchHistory = async () => {
    const lineId = localStorage.getItem('bkfood-active-line') || '1';
    setActiveLine(lineId);
    const res = await fetch(`/api/ligne/history?ligneId=${lineId}`);
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
    if (!correctionData.reason.trim()) {
      alert('❌ Une raison est obligatoire pour toute correction');
      return;
    }
    
    if (!correctionData.weightKg || parseFloat(correctionData.weightKg) <= 0) {
      alert('❌ Nouveau poids invalide');
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/production/correct', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('bkfood-token')}`
        },
        body: JSON.stringify({
          entity: 'lineEntry',
          id: editingId,
          data: { weightKg: parseFloat(correctionData.weightKg) },
          reason: correctionData.reason.trim(),
          correctedBy: user?.matricule || user?.name,
          timestamp: new Date().toISOString()
        })
      });

      if (res.ok) {
        setEditingId(null);
        setCorrectionData({ weightKg: '', reason: '' });
        fetchHistory();
      } else {
        const d = await res.json();
        alert(`❌ ${d.error || 'Échec de la correction'}`);
      }
    } catch (err) {
      alert('❌ Erreur réseau lors de la correction');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    if (!confirm('⚠️ Cette opération est irréversible. Confirmer la suppression ?')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch(`/api/ligne/history/${recordId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('bkfood-token')}`
        }
      });
      
      if (res.ok) {
        fetchHistory();
      } else {
        const d = await res.json();
        alert(`❌ ${d.error || 'Échec de la suppression'}`);
      }
    } catch (err) {
      alert('❌ Erreur réseau lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  if (loading && history.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.loadingSpinner}></div>
          <p>Chargement de l'historique ligne {activeLine}...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>📜 Historique Ligne {activeLine} (Consommation)</h2>
        <div className={styles.headerActions}>
          <span className={styles.recordCount}>Total: {history.length} opérations</span>
          <button 
            className="pda-btn pda-btn-secondary"
            onClick={fetchHistory}
            disabled={loading}
          >
            🔄 Actualiser
          </button>
        </div>
      </div>

      {history.length === 0 ? (
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon}>📜</div>
          <p>Aucune opération enregistrée pour la ligne {activeLine}</p>
          <p className={styles.emptyHint}>Les consommations de palettes apparaîtront ici</p>
        </div>
      ) : (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Date/Heure</th>
                <th>Palette</th>
                <th>Article</th>
                <th>Poids (Kg)</th>
                <th>Opérateur</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record, index) => (
                <tr key={record.id} className={index === 0 ? styles.latestRow : ''}>
                  <td className={styles.dateCell}>
                    {new Date(record.timestamp).toLocaleString()}
                  </td>
                  <td>
                    <span className={styles.paletteCode}>{record.paletteCode || 'N/A'}</span>
                  </td>
                  <td>
                    <span className={styles.articleCell}>{record.article}</span>
                  </td>
                  <td>
                    <span className={styles.weightCell}>{record.weightKg} kg</span>
                  </td>
                  <td>
                    <span className={styles.operatorCell}>{record.operatorMatricule || 'N/A'}</span>
                  </td>
                  <td className={styles.actionCell}>
                    {canCorrect(record, index) && (
                      <>
                        <button 
                          className={`${styles.editBtn} ${styles.correctBtn}`}
                          onClick={() => {
                            setEditingId(record.id);
                            setCorrectionData({ 
                              weightKg: record.weightKg.toString(), 
                              reason: '' 
                            });
                          }}
                          disabled={loading}
                        >
                          ✏️ Corriger
                        </button>
                        {user?.role === 'SUPER_ADMIN_IT' && (
                          <button 
                            className={`${styles.deleteBtn} ${styles.dangerBtn}`}
                            onClick={() => handleDelete(record.id)}
                            disabled={loading}
                          >
                            🗑️ Supprimer
                          </button>
                        )}
                      </>
                    )}
                    {index === 0 && (
                      <span className={styles.latestBadge}>Dernier</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editingId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>✏️ Correction de Consommation</h3>
              <span className={styles.modalHint}>Seule la dernière opération peut être corrigée</span>
            </div>
            
            <div className={styles.modalContent}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Nouveau poids (Kg)</label>
                <input 
                  type="number" 
                  className="pda-input"
                  step="0.01"
                  min="0"
                  value={correctionData.weightKg}
                  onChange={e => setCorrectionData({...correctionData, weightKg: e.target.value})}
                  placeholder="Ex: 25.5"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Raison de la correction <span className={styles.required}>*</span></label>
                <textarea 
                  className="pda-input"
                  rows={3}
                  value={correctionData.reason}
                  onChange={e => setCorrectionData({...correctionData, reason: e.target.value})}
                  placeholder="Ex: Erreur de saisie du poids, correction suite à vérification..."
                />
                <div className={styles.formHint}>Cette raison sera enregistrée dans l'historique des modifications</div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button 
                onClick={handleCorrect} 
                className="pda-btn pda-btn-primary"
                disabled={loading || !correctionData.reason.trim() || !correctionData.weightKg}
              >
                {loading ? '⏳ Enregistrement...' : '✅ Valider Correction'}
              </button>
              <button 
                onClick={() => {
                  setEditingId(null);
                  setCorrectionData({ weightKg: '', reason: '' });
                }} 
                className="pda-btn"
                disabled={loading}
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
