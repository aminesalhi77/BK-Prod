import { Palette, Chariot, AutoclaveCycle, User, LineEntry, PackagingRecord } from '@prisma/client';
import { utils, writeFile } from 'xlsx';

// ── Types ──────────────────────────────────────────────────────────────
interface ExportData {
  palettes: Palette[];
  chariots: Chariot[];
  cycles: AutoclaveCycle[];
  users: User[];
  lineEntries: LineEntry[];
  packagingRecords: PackagingRecord[];
}

// ── Helper: Format date ────────────────────────────────────────────────
function formatDate(date: Date | null | undefined): string {
  if (!date) return '';
  return new Date(date).toLocaleString('fr-FR');
}

// ── Helper: Format boolean ─────────────────────────────────────────────
function formatBoolean(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return 'Non';
  return value ? 'Oui' : 'Non';
}

// ── Export functions ───────────────────────────────────────────────────
export function exportPalettesToExcel(palettes: Palette[]) {
  const ws = utils.json_to_sheet(
    palettes.map(p => ({
      'Code': p.code,
      'Code Batch': p.batchCode,
      'Espèce': p.species,
      'Article': p.article,
      'Poids (kg)': p.weightKg,
      'Origine': p.origin,
      'Statut': p.status,
      'Notes': p.notes,
      'Entrée': formatDate(p.entryTime),
      'Sortie': formatDate(p.exitTime),
      'Ligne Destination': p.destinationLine,
      'ID Worker Chambre': p.chambreWorkerId,
      'ID Worker Ligne': p.ligneWorkerId,
      'Créé le': formatDate(p.createdAt),
      'Mis à jour le': formatDate(p.updatedAt),
      'Anomalie Poids': formatBoolean(p.isWeightAnomaly),
      'Score Anomalie': p.weightAnomalyScore,
      'Position Numéro': p.positionNumber,
      'Position Zone': p.positionZone,
      'Type Longe': p.longeType,
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Palettes');
  writeFile(wb, 'export_palettes.xlsx');
}

export function exportChariotsToExcel(chariots: Chariot[]) {
  const ws = utils.json_to_sheet(
    chariots.map(c => ({
      'ID': c.id,
      'Code': c.code,
      'Numéro': c.numero,
      'Article': c.article,
      'Nombre de Boîtes': c.boxCount,
      'Poids Estimé (kg)': c.estimatedWeight,
      'Statut': c.status,
      'ID Ligne': c.ligneId,
      'Matricule Cheffe': c.cheffeMatricule,
      'ID Palette': c.paletteId,
      'Créé le': formatDate(c.createdAt),
      'Anomalie Boîtes': formatBoolean(c.isBoxCountAnomaly),
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Chariots');
  writeFile(wb, 'export_chariots.xlsx');
}

export function exportCyclesToExcel(cycles: AutoclaveCycle[]) {
  const ws = utils.json_to_sheet(
    cycles.map(c => ({
      'ID': c.id,
      'ID Autoclave': c.autoclaveId,
      'Matricule Conducteur': c.conducteurMatricule,
      'Matricule Assistant': c.assistantMatricule,
      'Début': formatDate(c.startTime),
      'Fin': formatDate(c.endTime),
      'Durée Réelle (min)': c.actualDurationMin,
      'Durée Prévue (min)': c.predictedDurationMin,
      'Statut': c.status,
      'Total Boîtes': c.totalBoxes,
      'Total Poids (kg)': c.totalWeightKg,
      'Anomalie': formatBoolean(c.isAnomaly),
      'Score Anomalie': c.anomalyScore,
      'Flags Anomalie': c.anomalyFlags,
      'Créé le': formatDate(c.createdAt),
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Cycles');
  writeFile(wb, 'export_cycles.xlsx');
}

export function exportUsersToExcel(users: User[]) {
  const ws = utils.json_to_sheet(
    users.map(u => ({
      'ID': u.id,
      'Matricule': u.matricule,
      'Email': u.email,
      'Nom': u.name,
      'Rôle': u.role,
      'Approuvé': formatBoolean(u.isApproved),
      'Créé le': formatDate(u.createdAt),
      'Approuvé par': u.approvedBy,
      'Approuvé le': formatDate(u.approvedAt),
      'Module Assigné': u.assignedModule,
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Utilisateurs');
  writeFile(wb, 'export_utilisateurs.xlsx');
}

export function exportLineEntriesToExcel(entries: LineEntry[]) {
  const ws = utils.json_to_sheet(
    entries.map(e => ({
      'ID': e.id,
      'ID Palette': e.paletteId,
      'ID Ligne': e.ligneId,
      'Matricule Cheffe': e.cheffeMatricule,
      'Article': e.article,
      'Poids (kg)': e.weightKg,
      'Timestamp': formatDate(e.timestamp),
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Entrées Ligne');
  writeFile(wb, 'export_entrees_ligne.xlsx');
}

export function exportPackagingRecordsToExcel(records: PackagingRecord[]) {
  const ws = utils.json_to_sheet(
    records.map(r => ({
      'ID': r.id,
      'ID Ticket Stérilisation': r.sterilizationTicketId,
      'Matricule Cheffe': r.cheffeMatricule,
      'Ligne Emballage': r.packagingLine,
      'Shift': r.shift,
      'Nombre Réel de Boîtes': r.actualBoxCount,
      'Nombre Rejetées': r.rejectedCount,
      'Début': formatDate(r.startTime),
      'Fin': formatDate(r.endTime),
      'Notes': r.notes,
    }))
  );
  const wb = utils.book_new();
  utils.book_append_sheet(wb, ws, 'Emballage');
  writeFile(wb, 'export_emballage.xlsx');
}

// ── Bulk export ────────────────────────────────────────────────────────
export function exportAllToExcel(data: ExportData) {
  const wb = utils.book_new();

  // Palettes
  const ws1 = utils.json_to_sheet(
    data.palettes.map(p => ({
      'Code': p.code,
      'Espèce': p.species,
      'Poids (kg)': p.weightKg,
      'Statut': p.status,
      'Entrée': formatDate(p.entryTime),
      'Anomalie': formatBoolean(p.isWeightAnomaly),
    }))
  );
  utils.book_append_sheet(wb, ws1, 'Palettes');

  // Chariots
  const ws2 = utils.json_to_sheet(
    data.chariots.map(c => ({
      'Code': c.code,
      'Article': c.article,
      'Boîtes': c.boxCount,
      'Statut': c.status,
      'Créé le': formatDate(c.createdAt),
    }))
  );
  utils.book_append_sheet(wb, ws2, 'Chariots');

  // Cycles
  const ws3 = utils.json_to_sheet(
    data.cycles.map(c => ({
      'ID Autoclave': c.autoclaveId,
      'Début': formatDate(c.startTime),
      'Durée (min)': c.actualDurationMin,
      'Boîtes': c.totalBoxes,
      'Anomalie': formatBoolean(c.isAnomaly),
    }))
  );
  utils.book_append_sheet(wb, ws3, 'Cycles');

  // Users
  const ws4 = utils.json_to_sheet(
    data.users.map(u => ({
      'Nom': u.name,
      'Email': u.email,
      'Rôle': u.role,
      'Approuvé': formatBoolean(u.isApproved),
      'Créé le': formatDate(u.createdAt),
    }))
  );
  utils.book_append_sheet(wb, ws4, 'Utilisateurs');

  // Line Entries
  const ws5 = utils.json_to_sheet(
    data.lineEntries.map(e => ({
      'ID Palette': e.paletteId,
      'Ligne': e.ligneId,
      'Poids (kg)': e.weightKg,
      'Timestamp': formatDate(e.timestamp),
    }))
  );
  utils.book_append_sheet(wb, ws5, 'Entrées Ligne');

  // Packaging
  const ws6 = utils.json_to_sheet(
    data.packagingRecords.map(r => ({
      'Ligne': r.packagingLine,
      'Shift': r.shift,
      'Boîtes': r.actualBoxCount,
      'Rejetées': r.rejectedCount,
      'Début': formatDate(r.startTime),
    }))
  );
  utils.book_append_sheet(wb, ws6, 'Emballage');

  writeFile(wb, 'export_complet.xlsx');
}

// ── Utility: Export from API response ──────────────────────────────────
export async function exportFromApi(endpoint: string, filename: string) {
  try {
    const res = await fetch(endpoint);
    if (!res.ok) throw new Error('Failed to fetch data');
    const data = await res.json();

    // Determine sheet name from endpoint
    const sheetName = endpoint.split('/').pop() || 'Data';

    const ws = utils.json_to_sheet(data);
    const wb = utils.book_new();
    utils.book_append_sheet(wb, ws, sheetName);
    writeFile(wb, filename);
  } catch (err) {
    console.error('Export failed:', err);
    alert('Échec de l\'export');
  }
}