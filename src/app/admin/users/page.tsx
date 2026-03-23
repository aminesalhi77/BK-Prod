'use client';

import React, { useState, useEffect } from 'react';
import styles from './users.module.css';

const ALL_ROLES = [
  'WORKER', 'CHEF_LIGNE', 'CHEFFE_TAPIS',
  'RESPONSABLE_CONDITIONNEMENT', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT',
];
const ALL_MODULES = ['CHAMBRE', 'LIGNE', 'AUTOCLAVE', 'EMBALLAGE', 'ADMIN'];
const ROLE_LABELS: Record<string, string> = {
  WORKER: '👷 Ouvrier',
  CHEF_LIGNE: '👨‍🏭 Chef Ligne',
  CHEFFE_TAPIS: '👩‍🏭 Cheffe Tapis',
  RESPONSABLE_CONDITIONNEMENT: '📦 Resp. Conditionnement',
  ADMIN_PRODUCTION: '📊 Admin Production',
  SUPER_ADMIN_IT: '🔑 Super Admin IT',
};

export default function UserManagementPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Role editor modal
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState('');
  const [newModule, setNewModule] = useState('');
  const [saving, setSaving] = useState(false);

  // Password reset modal
  const [resetUser, setResetUser] = useState<any | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/admin/users/list');
    const data = await res.json();
    setUsers(data.users || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleApprove = async (userId: string, approve: boolean) => {
    const res = await fetch('/api/admin/users/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, approve }),
    });
    if (res.ok) fetchUsers();
    else alert('Erreur lors de l\'action');
  };

  const openRoleEditor = (user: any) => {
    setEditingUser(user);
    setNewRole(user.role);
    setNewModule(user.assignedModule || '');
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    const res = await fetch('/api/admin/users/role', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: editingUser.id, role: newRole, assignedModule: newModule || null }),
    });
    if (res.ok) { setEditingUser(null); fetchUsers(); }
    else { const d = await res.json(); alert(d.error || 'Erreur'); }
    setSaving(false);
  };

  const openPasswordReset = (user: any) => {
    setResetUser(user);
    setNewPassword('');
    setShowPw(false);
    setResetSuccess(false);
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPassword) return;
    setResetting(true);
    setResetSuccess(false);
    const res = await fetch('/api/admin/users/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: resetUser.id, newPassword }),
    });
    if (res.ok) {
      setResetSuccess(true);
      setNewPassword('');
    } else {
      const d = await res.json();
      alert(d.error || 'Erreur');
    }
    setResetting(false);
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Supprimer définitivement ${userName} ?`)) return;
    const res = await fetch('/api/admin/users/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (res.ok) fetchUsers();
    else alert('Erreur suppression');
  };

  const filteredUsers = users.filter(u => {
    const matchSearch = u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.matricule?.toLowerCase().includes(search.toLowerCase());
    const matchRole = filterRole === 'ALL' || u.role === filterRole;
    return matchSearch && matchRole;
  });

  const pendingUsers = filteredUsers.filter(u => !u.isApproved);
  const activeUsers = filteredUsers.filter(u => u.isApproved);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem', fontSize: '2rem' }}>⏳</div>
  );

  return (
    <div className={styles.container}>

      {/* ── Role Editor Modal ─────────────────────────────────── */}
      {editingUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>🎭 Modifier le rôle</h3>
            <p className={styles.modalSubtitle}>{editingUser.name} — <code>{editingUser.matricule}</code></p>
            <div className={styles.formGroup}>
              <label>Nouveau Rôle</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className={styles.select}>
                {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Module Assigné</label>
              <select value={newModule} onChange={e => setNewModule(e.target.value)} className={styles.select}>
                <option value="">— Aucun —</option>
                {ALL_MODULES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setEditingUser(null)}>Annuler</button>
              <button className={styles.saveBtn} onClick={handleSaveRole} disabled={saving}>
                {saving ? '⏳' : '✅ Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Password Reset Modal ──────────────────────────────── */}
      {resetUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>🔑 Réinitialiser Mot de Passe</h3>
            <p className={styles.modalSubtitle}>{resetUser.name} — <code>{resetUser.matricule}</code></p>

            {resetSuccess ? (
              <div className={styles.successBanner}>
                ✅ Mot de passe mis à jour avec succès !<br/>
                <small>Communiquez le nouveau mot de passe à l'utilisateur.</small>
              </div>
            ) : (
              <>
                <div className={styles.formGroup}>
                  <label>Nouveau Mot de Passe</label>
                  <div className={styles.pwRow}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      className={styles.pwInput}
                      placeholder="Nouveau mot de passe..."
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleResetPassword()}
                    />
                    <button className={styles.showPwBtn} onClick={() => setShowPw(p => !p)}>
                      {showPw ? 'masquer' : 'afficher'}
                    </button>
                  </div>
                  <small className={styles.hint}>Minimum 4 caractères</small>
                </div>
              </>
            )}

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={() => setResetUser(null)}>
                {resetSuccess ? 'Fermer' : 'Annuler'}
              </button>
              {!resetSuccess && (
                <button
                  className={styles.resetPwBtn}
                  onClick={handleResetPassword}
                  disabled={resetting || newPassword.length < 4}
                >
                  {resetting ? '⏳' : '🔑 Réinitialiser'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Header ───────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <div>
          <h2 className={styles.pageTitle}>👥 Gestion des Utilisateurs</h2>
          <p className={styles.pageSubtitle}>{users.length} utilisateurs · {pendingUsers.length} en attente</p>
        </div>
        <div className={styles.filters}>
          <input className={styles.searchInput} placeholder="🔍 Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className={styles.select} value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="ALL">Tous les rôles</option>
            {ALL_ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r] || r}</option>)}
          </select>
        </div>
      </div>

      {/* ── Pending ──────────────────────────────────────────── */}
      {pendingUsers.length > 0 && (
        <div className={styles.card}>
          <h3>⏳ En attente ({pendingUsers.length})</h3>
          <table className={styles.table}>
            <thead><tr><th>Nom</th><th>Matricule</th><th>Rôle</th><th>Module</th><th>Actions</th></tr></thead>
            <tbody>
              {pendingUsers.map(u => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td><code>{u.matricule}</code></td>
                  <td><span className={styles.roleBadge}>{ROLE_LABELS[u.role] || u.role}</span></td>
                  <td>{u.assignedModule || '—'}</td>
                  <td>
                    <div className={styles.buttonGroup}>
                      <button className={styles.roleBtn} onClick={() => openRoleEditor(u)}>🎭 Rôle</button>
                      <button className={styles.pwBtn} onClick={() => openPasswordReset(u)}>🔑 MDP</button>
                      <button className={styles.approveBtn} onClick={() => handleApprove(u.id, true)}>✅</button>
                      <button className={styles.rejectBtn} onClick={() => handleApprove(u.id, false)}>❌</button>
                      <button className={styles.rejectBtn} onClick={() => handleDelete(u.id, u.name)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pendingUsers.length === 0 && (
        <div className={styles.emptyCard}>✅ Aucun utilisateur en attente</div>
      )}

      {/* ── Active Users ─────────────────────────────────────── */}
      <div className={styles.card} style={{ marginTop: '1.5rem' }}>
        <h3>✅ Utilisateurs Actifs ({activeUsers.length})</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Matricule</th>
              <th>Rôle</th>
              <th>Module</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map(u => (
              <tr key={u.id}>
                <td><strong>{u.name}</strong></td>
                <td><code>{u.matricule}</code></td>
                <td><span className={styles.roleBadge}>{ROLE_LABELS[u.role] || u.role}</span></td>
                <td>{u.assignedModule || '—'}</td>
                <td>
                  <div className={styles.buttonGroup}>
                    <button className={styles.roleBtn} onClick={() => openRoleEditor(u)}>🎭 Rôle</button>
                    <button className={styles.pwBtn} onClick={() => openPasswordReset(u)}>🔑 MDP</button>
                    <button className={styles.rejectBtn} onClick={() => handleDelete(u.id, u.name)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>  
  );
}