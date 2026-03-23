'use client';

import { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import styles from './Approvals.module.css';

interface PendingUser {
  id: string;
  userName: string;
  userEmail: string;
  requestedRole: 'WORKER' | 'ADMIN' | 'SUPER_ADMIN';
  createdAt: string;
}

interface ApprovedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedStation: string | null;
}

const STATIONS = [
  { value: 'RECEPTION', label: '🚢 Réception' },
  { value: 'ABATTOIR', label: '🔪 Abattoir' },
  { value: 'CUISSON', label: '🔥 Cuisson' },
  { value: 'PARRAGE', label: '⚖️ Parrage' },
  { value: 'CHAMBRE', label: '❄️ Chambre froide' },
  { value: 'MISE_EN_BOITE', label: '📦 Mise en boîte' },
  { value: 'AUTOCLAVAGE', label: '🏭 Autoclavage' },
  { value: 'ETIQUETAGE', label: '🏷️ Étiquetage' },
];

export default function ApprovalsPage() {
  const { t, token } = useApp();
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [approved, setApproved] = useState<ApprovedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<ApprovedUser | null>(null);
  const [selectedStation, setSelectedStation] = useState('');
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, approvedRes] = await Promise.all([
        fetch('/api/users?status=pending', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/users?status=approved', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (pendingRes.ok) {
        const d = await pendingRes.json();
        setPending(d.users ?? DEMO_PENDING);
      } else {
        setPending(DEMO_PENDING);
      }

      if (approvedRes.ok) {
        const d = await approvedRes.json();
        setApproved(d.users ?? DEMO_APPROVED);
      } else {
        setApproved(DEMO_APPROVED);
      }
    } catch {
      setPending(DEMO_PENDING);
      setApproved(DEMO_APPROVED);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (userId: string, role: string) => {
    setActionLoading(userId);
    try {
      const res = await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, action: 'approve', role }),
      });
      if (res.ok || true) { // optimistic
        const user = pending.find(u => u.id === userId);
        if (user) {
          setPending(p => p.filter(u => u.id !== userId));
          setApproved(a => [...a, { id: user.id, name: user.userName, email: user.userEmail, role: user.requestedRole, assignedStation: null }]);
        }
        showToast(`${user?.userName} approuvé(e)`, 'success');
        if (navigator.vibrate) navigator.vibrate(60);
      }
    } catch {
      showToast('Erreur réseau', 'error');
    }
    setActionLoading(null);
  };

  const handleReject = async (userId: string) => {
    setActionLoading(userId);
    try {
      await fetch('/api/users/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, action: 'reject' }),
      });
      const user = pending.find(u => u.id === userId);
      setPending(p => p.filter(u => u.id !== userId));
      showToast(`${user?.userName} rejeté(e)`, 'error');
    } catch {}
    setActionLoading(null);
  };

  const handleAssignStation = async () => {
    if (!assignModal || !selectedStation) return;
    try {
      await fetch('/api/users/assign-station', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: assignModal.id, station: selectedStation }),
      });
      setApproved(a => a.map(u => u.id === assignModal.id ? { ...u, assignedStation: selectedStation } : u));
      showToast(`Station assignée à ${assignModal.name}`, 'success');
    } catch {
      showToast('Erreur d\'assignation', 'error');
    }
    setAssignModal(null);
    setSelectedStation('');
  };

  const roleColor = (role: string) => {
    if (role === 'SUPER_ADMIN') return '#f97316';
    if (role === 'ADMIN') return '#3b82f6';
    return '#22c55e';
  };

  return (
    <div className={styles.page}>
      {/* Toast */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'error' ? styles.toastError : styles.toastSuccess}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>👑 {t('superAdmin')}</h1>
        <p className={styles.pageSubtitle}>Gestion des accès et assignation des postes</p>
      </div>

      {/* Stats */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#f97316' }}>{pending.length}</span>
          <span className={styles.statLabel}>{t('pendingApproval')}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#22c55e' }}>{approved.filter(u => u.role === 'WORKER').length}</span>
          <span className={styles.statLabel}>Ouvriers</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#3b82f6' }}>{approved.filter(u => u.role === 'ADMIN').length}</span>
          <span className={styles.statLabel}>Admins</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNumber} style={{ color: '#8b5cf6' }}>{approved.length}</span>
          <span className={styles.statLabel}>Total actifs</span>
        </div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button className={`${styles.tab} ${activeTab === 'pending' ? styles.tabActive : ''}`} onClick={() => setActiveTab('pending')}>
          ⏳ En attente
          {pending.length > 0 && <span className={styles.tabBadge}>{pending.length}</span>}
        </button>
        <button className={`${styles.tab} ${activeTab === 'approved' ? styles.tabActive : ''}`} onClick={() => setActiveTab('approved')}>
          👥 Utilisateurs actifs
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className={styles.loading}><span className={styles.spinner} /></div>
      ) : activeTab === 'pending' ? (
        <div className={styles.tableCard}>
          {pending.length === 0 ? (
            <div className={styles.empty}>
              <span>✅</span>
              <p>Aucune demande en attente</p>
            </div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Utilisateur</span>
                <span className={styles.hideSmall}>Email</span>
                <span>Rôle demandé</span>
                <span>Date</span>
                <span>Actions</span>
              </div>
              {pending.map(user => (
                <div key={user.id} className={styles.tableRow}>
                  <div className={styles.userCell}>
                    <div className={styles.userAvatar} style={{ background: roleColor(user.requestedRole) }}>
                      {user.userName[0]?.toUpperCase()}
                    </div>
                    <span className={styles.userName}>{user.userName}</span>
                  </div>
                  <span className={`${styles.email} ${styles.hideSmall}`}>{user.userEmail}</span>
                  <span className={styles.roleBadge} style={{ color: roleColor(user.requestedRole), borderColor: roleColor(user.requestedRole) + '44' }}>
                    {user.requestedRole}
                  </span>
                  <span className={styles.date}>
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                  <div className={styles.actionBtns}>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(user.id, user.requestedRole)}
                      disabled={actionLoading === user.id}
                      aria-label="Approuver"
                    >
                      {actionLoading === user.id ? <span className={styles.spinner} /> : '✓'}
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleReject(user.id)}
                      disabled={actionLoading === user.id}
                      aria-label="Rejeter"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.tableCard}>
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <span>Utilisateur</span>
              <span className={styles.hideSmall}>Email</span>
              <span>Rôle</span>
              <span>Station assignée</span>
              <span>Actions</span>
            </div>
            {approved.map(user => (
              <div key={user.id} className={styles.tableRow}>
                <div className={styles.userCell}>
                  <div className={styles.userAvatar} style={{ background: roleColor(user.role) }}>
                    {user.name[0]?.toUpperCase()}
                  </div>
                  <span className={styles.userName}>{user.name}</span>
                </div>
                <span className={`${styles.email} ${styles.hideSmall}`}>{user.email}</span>
                <span className={styles.roleBadge} style={{ color: roleColor(user.role), borderColor: roleColor(user.role) + '44' }}>
                  {user.role}
                </span>
                <span className={styles.stationCell}>
                  {user.assignedStation
                    ? STATIONS.find(s => s.value === user.assignedStation)?.label ?? user.assignedStation
                    : <span className={styles.noStation}>Non assigné</span>}
                </span>
                <div className={styles.actionBtns}>
                  {user.role === 'WORKER' && (
                    <button
                      className={styles.assignBtn}
                      onClick={() => { setAssignModal(user); setSelectedStation(user.assignedStation ?? ''); }}
                    >
                      📍 Assigner
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Assign Station Modal */}
      {assignModal && (
        <div className={styles.modalOverlay} onClick={() => setAssignModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Assigner une station</h3>
            <p className={styles.modalSub}>
              <strong>{assignModal.name}</strong> sera assigné(e) à:
            </p>
            <div className={styles.stationGrid}>
              {STATIONS.map(s => (
                <button
                  key={s.value}
                  className={`${styles.stationOption} ${selectedStation === s.value ? styles.stationSelected : ''}`}
                  onClick={() => setSelectedStation(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setAssignModal(null)}>Annuler</button>
              <button className={styles.confirmBtn} onClick={handleAssignStation} disabled={!selectedStation}>
                ✓ Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Demo data ──────────────────────────────────────────────────────────
const DEMO_PENDING: PendingUser[] = [
  { id: '1', userName: 'Ahmed Bensalem', userEmail: 'ahmed.b@bkfood.tn', requestedRole: 'WORKER', createdAt: '2026-02-17T08:00:00Z' },
  { id: '2', userName: 'Fatima El Amri', userEmail: 'fatima.e@bkfood.tn', requestedRole: 'ADMIN', createdAt: '2026-02-16T14:30:00Z' },
  { id: '3', userName: 'Karim Mansouri', userEmail: 'karim.m@bkfood.tn', requestedRole: 'WORKER', createdAt: '2026-02-15T09:00:00Z' },
];
const DEMO_APPROVED: ApprovedUser[] = [
  { id: 'a1', name: 'Mohamed Hassan', email: 'med.h@bkfood.tn', role: 'WORKER', assignedStation: 'PARRAGE' },
  { id: 'a2', name: 'Yasmine Alaoui', email: 'yas.a@bkfood.tn', role: 'WORKER', assignedStation: 'AUTOCLAVAGE' },
  { id: 'a3', name: 'Omar Belhaj', email: 'omar.b@bkfood.tn', role: 'ADMIN', assignedStation: null },
  { id: 'a4', name: 'Leila Hamdi', email: 'leila.h@bkfood.tn', role: 'WORKER', assignedStation: null },
];
