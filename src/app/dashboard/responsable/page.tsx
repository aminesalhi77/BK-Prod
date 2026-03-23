'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useApp } from '@/context/AppContext';
import styles from './responsable.module.css';

const MODULES = [
  { label: '❄️ Chambre 0', href: '/chambre/menu', color: '#06b6d4', stat: 'palettesInChambre', statLabel: 'palettes en stock' },
  { label: '🏭 Lignes', href: '/ligne/menu', color: '#3b82f6', stat: 'ligneActive', statLabel: 'lignes actives' },
  { label: '🔥 Autoclaves', href: '/autoclave/menu', color: '#f59e0b', stat: 'cyclesRunning', statLabel: 'cycles en cours' },
  { label: '📦 Emballage', href: '/emballage/menu', color: '#8b5cf6', stat: 'packagingToday', statLabel: "boîtes aujourd'hui" },
];

export default function ResponsableDashboard() {
  const { user, token } = useApp();
  const [stats, setStats] = useState<any>(null);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState<any | null>(null);
  const [corrNotes, setCorrNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, movRes] = await Promise.all([
        fetch('/api/admin/stats?period=day'),
        fetch('/api/chambre/movements?limit=20', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
      ]);
      if (statsRes.ok) {
        const d = await statsRes.json();
        setStats(d.stats);
      }
      if (movRes.ok) {
        const d = await movRes.json();
        setMovements(d.movements || []);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCorrect = async () => {
    if (!correcting || !corrNotes.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/chambre/correct-last', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          movementId: correcting.id,
          notes: corrNotes,
          correctedBy: user?.matricule || user?.name,
        }),
      });
      if (res.ok) {
        setCorrecting(null);
        setCorrNotes('');
        fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Erreur lors de la correction');
      }
    } finally {
      setSaving(false);
    }
  };

  const lastMovement = movements[0];

  return (
    <div className={styles.container}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Responsable Conditionnement</h2>
          <p className={styles.subtitle}>Vue temps réel · Consultation totale · Correction dernière saisie</p>
        </div>
        <button className={styles.refreshBtn} onClick={fetchData}>🔄 Rafraîchir</button>
      </div>

      {/* ── Welcome Card ────────────────────────────────────── */}
      <div className={styles.welcomeCard}>
        <div className={styles.welcomeAvatar}>{user?.name?.slice(0, 2).toUpperCase()}</div>
        <div>
          <strong>{user?.name}</strong>
          <p>Responsable Conditionnement · Accès production complète</p>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────────────── */}
      {loading ? (
        <div className={styles.loadingRow}>⏳ Chargement des données...</div>
      ) : stats && (
        <div className={styles.kpiGrid}>
          <KPI icon="📥" label="Entrées (aujourd'hui)" value={stats.palettesIn} color="#3b82f6" />
          <KPI icon="📤" label="Sorties (aujourd'hui)" value={stats.palettesOut} color="#8b5cf6" />
          <KPI icon="❄️" label="En Chambre (stock)" value={stats.palettesInChambre} color="#06b6d4" />
          <KPI icon="⚖️" label="Tonnage (kg)" value={`${(stats.totalWeightKg || 0).toFixed(0)} kg`} color="#f59e0b" />
          <KPI icon="🔄" label="Mouvements / jour" value={stats.movements} color="#10b981" />
          <KPI icon="📊" label="Total palettes" value={stats.totalPalettes} color="#f43f5e" />
        </div>
      )}

      {/* ── Quick Access Modules ─────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>🏭 Accès Rapide — Tous les Modules</h3>
        <div className={styles.modulesGrid}>
          {MODULES.map(m => (
            <Link key={m.href} href={m.href} className={styles.moduleCard} style={{ borderColor: m.color }}>
              <div className={styles.moduleIcon} style={{ background: m.color + '18', color: m.color }}>{m.label.split(' ')[0]}</div>
              <span className={styles.moduleLabel}>{m.label.slice(2)}</span>
              <span className={styles.moduleHint} style={{ color: m.color }}>→ Voir</span>
            </Link>
          ))}
          <Link href="/emballage/tracabilite" className={styles.moduleCard} style={{ borderColor: '#f43f5e' }}>
            <div className={styles.moduleIcon} style={{ background: '#f43f5e18', color: '#f43f5e' }}>🔍</div>
            <span className={styles.moduleLabel}>Recherche Trajet Produit</span>
            <span className={styles.moduleHint} style={{ color: '#f43f5e' }}>→ Voir</span>
          </Link>
          <Link href="/dashboard/reports" className={styles.moduleCard} style={{ borderColor: '#16a34a' }}>
            <div className={styles.moduleIcon} style={{ background: '#16a34a18', color: '#16a34a' }}>📈</div>
            <span className={styles.moduleLabel}>Rapports & Historique</span>
            <span className={styles.moduleHint} style={{ color: '#16a34a' }}>→ Voir</span>
          </Link>
        </div>
      </div>

      {/* ── Last Entry Correction ─────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>✏️ Correction — Dernière Saisie Uniquement</h3>
        <div className={styles.correctionNotice}>
          ⚠️ Vous ne pouvez corriger que la <strong>dernière saisie</strong> en cas d'erreur de frappe. Toute correction est enregistrée dans l'historique avec votre identifiant.
        </div>

        {lastMovement ? (
          <div className={styles.lastEntryCard}>
            <div className={styles.lastEntryInfo}>
              <span className={styles.lastEntryLabel}>Dernière saisie :</span>
              <strong>{lastMovement.fromStation} → {lastMovement.toStation}</strong>
              <span className={styles.smallText}> · Palette: {lastMovement.palette?.code || lastMovement.paletteId}</span>
              <span className={styles.smallText}> · Par: {lastMovement.workerMatricule}</span>
              <span className={styles.smallText}> · {new Date(lastMovement.timestamp).toLocaleString('fr-FR')}</span>
            </div>

            {correcting?.id === lastMovement.id ? (
              <div className={styles.correctionForm}>
                <textarea
                  className={styles.correctionTextarea}
                  placeholder="Motif de la correction (obligatoire)..."
                  value={corrNotes}
                  onChange={e => setCorrNotes(e.target.value)}
                  rows={2}
                />
                <div className={styles.correctionActions}>
                  <button className={styles.cancelCorrBtn} onClick={() => { setCorrecting(null); setCorrNotes(''); }}>Annuler</button>
                  <button className={styles.saveCorrBtn} onClick={handleCorrect} disabled={saving || !corrNotes.trim()}>
                    {saving ? '⏳' : '✅ Valider Correction'}
                  </button>
                </div>
              </div>
            ) : (
              <button className={styles.correctBtn} onClick={() => setCorrecting(lastMovement)}>
                ✏️ Corriger cette saisie
              </button>
            )}
          </div>
        ) : (
          <p className={styles.noEntry}>Aucune saisie récente à corriger.</p>
        )}
      </div>

      {/* ── Recent History ───────────────────────────────────── */}
      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>📋 Historique des 20 Derniers Mouvements</h3>
        {movements.length === 0 ? (
          <p className={styles.noEntry}>Aucun mouvement enregistré.</p>
        ) : (
          <div className={styles.historyTable}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Palette</th>
                  <th>De → Vers</th>
                  <th>Opérateur</th>
                  <th>Date/Heure</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, i) => (
                  <tr key={m.id} className={i === 0 ? styles.lastRow : ''}>
                    <td><code>{m.palette?.code || m.paletteId?.slice(0, 8)}</code></td>
                    <td><span className={styles.movArrow}>{m.fromStation} → {m.toStation}</span></td>
                    <td>{m.workerMatricule}</td>
                    <td className={styles.dateCell}>{new Date(m.timestamp).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</td>
                    <td className={styles.notesCell}>{m.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

function KPI({ icon, label, value, color }: { icon: string; label: string; value: any; color: string }) {
  return (
    <div className={styles.kpi}>
      <div className={styles.kpiIcon} style={{ background: color + '18', color }}>{icon}</div>
      <div className={styles.kpiValue} style={{ color }}>{value}</div>
      <div className={styles.kpiLabel}>{label}</div>
    </div>
  );
}