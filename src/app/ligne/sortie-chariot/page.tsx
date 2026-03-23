'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useScannerInput } from '@/hooks/useScannerInput';
import BarcodeDisplay from '@/components/BarcodeDisplay/BarcodeDisplay';
import styles from './sortie.module.css';

export default function SortieChariotPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    numero: '',
    article: '',
    boxCount: '',
    operatorMatricule: '',
  });
  const [loading, setLoading] = useState(false);
  const [chariot, setChariot] = useState<any>(null);
  const [error, setError] = useState('');
  const [ligneId, setLigneId] = useState('');

  const articles = [
    'Thon Entier à l\'Huile',
    'Thon en Morceaux au Naturel',
    'Thon émietté ',
  ];

  const scanner = useScannerInput({
    onScan: async (code) => {
      // Auto-fill chariot number if scanned
      if (code.startsWith('CHAR-')) {
        setFormData(prev => ({ ...prev, numero: code.replace('CHAR-', '') }));
      }
    },
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('bkfood-user') || '{}');
    const activeLine = localStorage.getItem('bkfood-active-line') || '1';
    setLigneId(activeLine);
    setFormData(prev => ({ ...prev, operatorMatricule: user.matricule || '' }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    // Validation
    if (!formData.operatorMatricule) {
      setError('❌ Matricule opérateur requis');
      setLoading(false);
      return;
    }
    
    if (!formData.numero) {
      setError('❌ Numéro de chariot requis');
      setLoading(false);
      return;
    }
    
    if (!formData.article) {
      setError('❌ Article requis');
      setLoading(false);
      return;
    }
    
    if (!formData.boxCount || parseInt(formData.boxCount) <= 0) {
      setError('❌ Nombre de boîtes invalide');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/ligne/sortie-chariot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          numero: formData.numero,
          article: formData.article,
          boxCount: parseInt(formData.boxCount),
          ligneId: ligneId,
          operatorMatricule: formData.operatorMatricule,
          timestamp: new Date().toISOString()
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Échec de création du chariot');
      }
      
      setChariot(data.chariot);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setChariot(null);
    setFormData({
      numero: '',
      article: '',
      boxCount: '',
      operatorMatricule: '',
    });
    setError('');
  };

  if (chariot) {
    return (
      <div className={styles.ticketContainer} id="print-ticket">
        <div className={styles.ticket}>
          <div className={styles.ticketHeader}>
            <h2>TICKET CHARIOT</h2>
          </div>
          
          {/* Barcode */}
          <div className={styles.barcodeSection}>
            <BarcodeDisplay value={chariot.code} />
          </div>

          <div className={styles.ticketDetails}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>NUMERO CHARIOT:</span>
              <span className={styles.detailValue}>{chariot.numero}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>ARTICLE:</span>
              <span className={styles.detailValue}>{chariot.article}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>NOMBRE BOITES:</span>
              <span className={styles.detailValue}>{chariot.boxCount}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>LIGNE:</span>
              <span className={styles.detailValue}>{chariot.ligneId}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>OPERATEUR:</span>
              <span className={styles.detailValue}>{chariot.operatorMatricule}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>DATE/HEURE:</span>
              <span className={styles.detailValue}>{new Date(chariot.createdAt).toLocaleString()}</span>
            </div>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>NOMBRE BOITES:</span>
              <span className={styles.detailValue}>{chariot.boxCount} BOITES</span>
            </div>
          </div>

          <div className={styles.ticketActions}>
            <button className="pda-btn pda-btn-primary" onClick={() => window.print()}>
              🖨️ Imprimer Ticket
            </button>
            <button className={styles.backBtn} onClick={() => router.push('/ligne/menu')}>
              Retour au Menu
            </button>
            <button className={styles.newBtn} onClick={handleReset}>
              ➕ Nouveau Chariot
            </button>
          </div>

          <div className={styles.ticketFooter}>
            <p><strong>IMPORTANT:</strong> Ce chariot doit être transféré vers l'autoclave</p>
            <p>Conservation: <strong>{chariot.article}</strong></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.formHeader}>
          <h2>🛒 Sortie Chariot Plein - Ligne {ligneId}</h2>
          <div className={styles.formHint}>
            <span className={styles.hintIcon}>ℹ️</span>
            <span>Créez un ticket pour le chariot prêt à être envoyé en autoclave</span>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Matricule Opérateur</label>
            <input
              className="pda-input"
              type="text"
              value={formData.operatorMatricule}
              onChange={(e) => setFormData({ ...formData, operatorMatricule: e.target.value })}
              placeholder="Votre matricule..."
              required
              disabled={loading}
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Numéro de Chariot (Physique)</label>
            <div className={styles.scannerInput}>
              <input
                className="pda-input"
                type="text"
                value={formData.numero}
                onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                placeholder="Ex: 42 (ou scannez CHAR-...)"
                disabled={loading}
                {...scanner.bindInput}
              />
              <div className={styles.scannerHint}>🔍 Scan ou Saisie manuelle</div>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <label>Article</label>
            <select
              className="pda-input"
              value={formData.article}
              onChange={(e) => setFormData({ ...formData, article: e.target.value })}
              required
              disabled={loading}
            >
              <option value="">Sélectionner...</option>
              {articles.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>

          <div className={styles.inputGroup}>
            <label>Nombre de Boîtes</label>
            <input
              className="pda-input"
              type="number"
              value={formData.boxCount}
              onChange={(e) => setFormData({ ...formData, boxCount: e.target.value })}
              placeholder="Ex: 240"
              min="1"
              max="500"
              required
              disabled={loading}
            />
            <div className={styles.boxHint}>
              💡 Standard: 240 boîtes par chariot (41.8 kg)
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="submit" 
              className="pda-btn pda-btn-primary" 
              disabled={loading}
            >
              {loading ? '⏳ Validation...' : '🏁 Valider et Imprimer'}
            </button>
            <button 
              type="button" 
              className="pda-btn pda-btn-secondary"
              onClick={() => router.push('/ligne/menu')}
              disabled={loading}
            >
              Annuler
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
