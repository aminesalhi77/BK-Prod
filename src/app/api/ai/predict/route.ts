// Modified: Added AI prediction proxy route to get today's stats and call Flask
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

const FLASK_URL = process.env.FLASK_AI_URL || 'http://127.0.0.1:5001';

// Timeout wrapper for Flask calls
async function fetchWithTimeout(url: string, options: RequestInit = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  
  try {
    const res = await fetch(url, { signal: controller.signal, ...options });
    clearTimeout(timeout);
    return res;
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === 'AbortError') throw new Error('Serveur IA timeout');
    throw new Error('Serveur IA non disponible');
  }
}

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const now = new Date();
    const eightHoursAgo = new Date(now.getTime() - 8 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    // Build today's production stats
    const stats = {
      palettes_entrees: await prisma.palette.count({
        where: { entryTime: { gte: today } }
      }),
      tonnage_total_kg: (await prisma.palette.aggregate({
        _sum: { weightKg: true },
        where: { entryTime: { gte: today } }
      }))._sum.weightKg || 0,
      tonnage_moyen_palette: 0, // Will calculate below
      nb_alertes_8h: await prisma.palette.count({
        where: {
          status: 'IN_CHAMBRE',
          entryTime: { lt: eightHoursAgo }
        }
      }),
      stock_fin_jour: await prisma.palette.count({
        where: { status: 'IN_CHAMBRE' }
      }),
      palettes_alimentees_ligne: await prisma.lineEntry.count({
        where: { timestamp: { gte: today } }
      }),
      nb_articles_differents: (await prisma.lineEntry.groupBy({
        by: ['article'],
        where: { timestamp: { gte: today } }
      })).length,
      nb_cycles_autoclave: await prisma.autoclaveCycle.count({
        where: { 
          AND: [
            { startTime: { gte: today } },
            { status: 'COMPLETED' }
          ]
        }
      }),
      duree_moyenne_cycle: 0, // Will calculate below
      boites_emballees: (await prisma.packagingRecord.aggregate({
        _sum: { actualBoxCount: true },
        where: { startTime: { gte: today } }
      }))._sum.actualBoxCount || 0,
      nb_lots_emballage: await prisma.packagingRecord.count({
        where: { startTime: { gte: today } }
      }),
      jour_semaine: tomorrow.getDay(),
      est_lundi: tomorrow.getDay() === 1 ? 1 : 0,
      est_vendredi: tomorrow.getDay() === 5 ? 1 : 0
    };

    // Calculate averages
    if (stats.palettes_entrees > 0) {
      stats.tonnage_moyen_palette = stats.tonnage_total_kg / stats.palettes_entrees;
    }

    if (stats.nb_cycles_autoclave > 0) {
      const avgDuration = await prisma.autoclaveCycle.aggregate({
        _avg: { actualDurationMin: true },
        where: {
          AND: [
            { startTime: { gte: today } },
            { status: 'COMPLETED' }
          ]
        }
      });
      stats.duree_moyenne_cycle = avgDuration._avg.actualDurationMin || 0;
    }

    // Call Flask prediction endpoint
    const response = await fetchWithTimeout(`${FLASK_URL}/predict-from-json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stats)
    });

    if (!response.ok) {
      throw new Error('Flask prediction endpoint failed');
    }

    const predictionData = await response.json();
    return NextResponse.json(predictionData);
  } catch (error) {
    console.error('[ai-predict]', error);
    return NextResponse.json({
      success: false,
      error: 'Serveur IA non disponible. Lancez: python bkfood_ai/5_api_server.py'
    }, { status: 200 });
  }
}