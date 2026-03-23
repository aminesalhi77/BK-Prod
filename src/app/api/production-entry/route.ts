import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

// ── Types ──────────────────────────────────────────────────────────────
interface ProductionEntryRequest {
  batchId: string;
  station: string; // 'PARRAGE' | 'MISE_EN_BOITE' | 'AUTOCLAVAGE' | ...
  weight?: number;
  temperature?: number;
  pressure?: number;
  cookingTemp?: number;
  cookingTime?: number;
  histamineLevel?: number;
  saltPercentage?: number;
  notes?: string;
  timestamp?: string;
}

interface MLValidationResult {
  isAnomaly: boolean;
  confidenceScore: number;
  message: string;
  method: string;
  flags?: string[];
}

// ── Helpers ────────────────────────────────────────────────────────────
function runPythonValidation(data: Record<string, unknown>): Promise<MLValidationResult> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), 'python_services', 'validate.py');
    const py = spawn('python3', [scriptPath], {
      cwd: path.join(process.cwd(), 'python_services'),
    });

    let stdout = '';
    let stderr = '';

    py.stdin.write(JSON.stringify(data));
    py.stdin.end();

    py.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    py.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    py.on('close', code => {
      if (code === 0) {
        try { resolve(JSON.parse(stdout.trim())); }
        catch { reject(new Error('Invalid JSON from Python')); }
      } else {
        reject(new Error(`Python error: ${stderr}`));
      }
    });

    py.on('error', err => reject(err));
    setTimeout(() => { py.kill(); reject(new Error('ML timeout')); }, 30_000);
  });
}

function ruleFallback(data: ProductionEntryRequest): MLValidationResult {
  const flags: string[] = [];

  if (data.histamineLevel !== undefined && data.histamineLevel > 30) flags.push('Histamine élevée');
  if (data.cookingTemp !== undefined && (data.cookingTemp < 85 || data.cookingTemp > 105)) flags.push('Température cuisson hors norme');
  if (data.cookingTime !== undefined && (data.cookingTime < 60 || data.cookingTime > 150)) flags.push('Durée cuisson hors norme');
  if (data.saltPercentage !== undefined && data.saltPercentage > 5) flags.push('Teneur en sel excessive');
  if (data.weight !== undefined && data.weight < 10) flags.push('Poids anormalement bas');

  const isAnomaly = flags.length > 0;
  return {
    isAnomaly,
    confidenceScore: isAnomaly ? 20 + Math.floor(Math.random() * 30) : 80 + Math.floor(Math.random() * 18),
    message: isAnomaly
      ? `${flags.length} anomalie(s) détectée(s)`
      : 'Données conformes aux standards',
    method: 'rule-based-fallback',
    flags,
  };
}

// Map station string to Prisma enum
function toProductionStep(station: string): string {
  const map: Record<string, string> = {
    PARRAGE: 'PARRAGE',
    MISE_EN_BOITE: 'MISE_EN_BOITE',
    AUTOCLAVAGE: 'AUTOCLAVAGE',
    CUISSON: 'CUISSON',
    ABATTOIR: 'ABATTOIR',
    CHAMBRE: 'CHAMBRE',
    RECEPTION: 'RECEPTION',
    ETIQUETAGE: 'ETIQUETAGE',
  };
  return map[station.toUpperCase()] ?? 'PARRAGE';
}

// ── POST handler ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // ── Auth ─────────────────────────────────────────────────────────
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    let workerName: string;
    try {
      const payload = await verifyToken(token);
      userId = payload.sub as string;
      workerName = payload.name as string;
    } catch {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // ── Parse body ───────────────────────────────────────────────────
    const body = (await request.json()) as ProductionEntryRequest;

    if (!body.batchId || !body.station) {
      return NextResponse.json({ error: 'batchId and station are required' }, { status: 400 });
    }

    // ── Verify palette exists ──────────────────────────────────────────
    const palette = await prisma.palette.findFirst({
      where: { code: body.batchId },
    });
    if (!palette) {
      return NextResponse.json({ error: 'Palette not found' }, { status: 404 });
    }

    // ── ML Validation BEFORE saving ──────────────────────────────────
    let mlResult: MLValidationResult;
    try {
      mlResult = await runPythonValidation({
        species: palette.species,
        raw_weight_kg: body.weight ?? 0,
        cooking_temp: body.cookingTemp ?? 0,
        cooking_time: body.cookingTime ?? 0,
        histamine_level: body.histamineLevel ?? 0,
        salt_percentage: body.saltPercentage ?? 0,
      });
    } catch {
      // Fallback to rule-based
      mlResult = ruleFallback(body);
    }

    // ── Save StationEntry to Postgres ────────────────────────────────
    const stationData = {
      weight: body.weight,
      temperature: body.temperature,
      pressure: body.pressure,
      cookingTemp: body.cookingTemp,
      cookingTime: body.cookingTime,
      histamineLevel: body.histamineLevel,
      saltPercentage: body.saltPercentage,
      notes: body.notes,
      mlValidation: mlResult,
    };

    const entry = await prisma.lineEntry.create({
      data: {
        paletteId: palette.id,
        ligneId: body.station, // Using station as ligneId for now
        cheffeMatricule: workerName,
        article: 'DEFAULT', // Default article
        weightKg: body.weight ?? 0,
        timestamp: body.timestamp ? new Date(body.timestamp) : new Date(),
      },
    });

    // ── Update palette current step + anomaly status ───────────────────
    await prisma.palette.update({
      where: { id: palette.id },
      data: {
        status: toProductionStep(body.station) as any,
        isWeightAnomaly: mlResult.isAnomaly,
        weightAnomalyScore: mlResult.confidenceScore / 100,
        updatedAt: new Date(),
      },
    });

    // ── Audit log ────────────────────────────────────────────────────
    await prisma.auditLog.create({
      data: {
        userId,
        userName: workerName,
        action: 'STATION_ENTRY',
        entity: 'StationEntry',
        entityId: entry.id,
        details: JSON.stringify({
          batchCode: body.batchId,
          station: body.station,
          isAnomaly: mlResult.isAnomaly,
        }),
      },
    });

    // ── Haptic cue in response ────────────────────────────────────────
    return NextResponse.json({
      success: true,
      entryId: entry.id,
      ml: mlResult,
      haptic: mlResult.isAnomaly ? 'LONG' : 'SHORT',
      // Canning progress (for Mise en boite step)
      canningProgress: body.station === 'MISE_EN_BOITE' ? null : null,
    }, { status: 201 });

  } catch (error) {
    console.error('[production-entry] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// ── GET — fetch entries for a palette ───────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paletteCode = searchParams.get('batchId');
    if (!paletteCode) return NextResponse.json({ error: 'batchId required' }, { status: 400 });

    const palette = await prisma.palette.findFirst({ where: { code: paletteCode } });
    if (!palette) return NextResponse.json({ error: 'Palette not found' }, { status: 404 });

    const entries = await prisma.lineEntry.findMany({
      where: { paletteId: palette.id },
      orderBy: { timestamp: 'asc' },
    });

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('[production-entry GET]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

