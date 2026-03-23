'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import styles from './choix.module.css';

export default function ChoixLignePage() {
  const router = useRouter();
  const { user } = useApp();
  const [selected, setSelected] = useState('');

  const lines = [
    { id: 'Ligne 5/2 [1]', name: 'Ligne 5/2 [1]', description: 'Ligne automatique 5/2' },
    { id: 'Ligne 5/2 [2]', name: 'Ligne 5/2 [2]', description: 'Ligne automatique 5/2' },
    { id: 'Ligne 400', name: 'Ligne 400', description: 'Ligne automatique 400' },
    { id: 'Ligne 1/5', name: 'Ligne 1/5', description: 'Ligne automatique 1/5' },
    { id: 'Ligne Manuel', name: 'Ligne Manuel', description: 'Ligne manuelle' },
  ];

  const handleConfirm = () => {
    if (!selected) {
      alert('❌ Veuillez sélectionner une ligne');
      return;
    }
    
    // Save line selection
    localStorage.setItem('bkfood-active-line', selected);
    router.push('/ligne/menu');
  };

  const handleRetour = () => {
    router.push('/ligne/menu');
  };

  return (
    <div className={styles.container}>
      {/* Header with Navigation */}
      <div className={styles.header}>
        <h2>🔧 Choix de Ligne de Production</h2>
        <p className={styles.subtitle}>Sélectionnez votre ligne de travail</p>
      </div>

      {/* Worker Information */}
      <div className={styles.workerInfo}>
        <div className={styles.workerCard}>
          <span className={styles.workerLabel}>Opérateur:</span>
          <span className={styles.workerName}>{user?.name || 'Non connecté'}</span>
        </div>
        <div className={styles.workerCard}>
          <span className={styles.workerLabel}>Matricule:</span>
          <span className={styles.workerMatricule}>{user?.matricule || 'N/A'}</span>
        </div>
      </div>

      {/* Line Selection Grid */}
      <div className={styles.linesGrid}>
        {lines.map((line) => (
          <div
            key={line.id}
            className={`${styles.lineCard} ${selected === line.id ? styles.selected : ''}`}
            onClick={() => setSelected(line.id)}
          >
            <div className={styles.lineContent}>
              <div className={styles.lineIcon}>🏭</div>
              <div className={styles.lineDetails}>
                <h3 className={styles.lineName}>{line.name}</h3>
                <p className={styles.lineDescription}>{line.description}</p>
                <div className={styles.lineIdBadge}>LIGNE {line.id}</div>
              </div>
              {selected === line.id && (
                <div className={styles.selectedIndicator}>✓ Sélectionnée</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h4>📋 Instructions:</h4>
        <ul>
          <li>Choisissez votre ligne de production en cliquant dessus</li>
          <li>Les lignes 1-4 sont automatiques</li>
          <li>La ligne 5 est manuelle</li>
          <li>Une fois sélectionnée, vous êtes responsable de cette ligne</li>
        </ul>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button 
          className="pda-btn pda-btn-primary" 
          disabled={!selected}
          onClick={handleConfirm}
        >
          ✅ Confirmer la Ligne
        </button>
        <button 
          className="pda-btn pda-btn-secondary" 
          onClick={handleRetour}
        >
          ← Retour au Menu
        </button>
      </div>

      {/* Selected Line Summary */}
      {selected && (
        <div className={styles.selectionSummary}>
          <h4>🎯 Ligne Sélectionnée:</h4>
          <p><strong>{lines.find(l => l.id === selected)?.name}</strong></p>
          <p>{lines.find(l => l.id === selected)?.description}</p>
        </div>
      )}
    </div>
  );
}
