import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search');
    const forMap = searchParams.get('forMap') === 'true';
    const step = searchParams.get('step');
    const limit = parseInt(searchParams.get('limit') ?? '50');

    // Use correct typing for where input
    let where: Prisma.PaletteWhereInput = {};
    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (step) {
      where.status = step as any;
    }

    const palettes = await prisma.palette.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    if (forMap) {
      return NextResponse.json({
        batches: palettes.map((p: any) => ({
          id: p.id,
          batchCode: p.code,
          species: p.species,
          currentStep: p.status,
          completionPercent: 0, // Calculate based on status if needed
          isAnomaly: p.isWeightAnomaly,
          anomalyScore: p.weightAnomalyScore || 0,
          lastUpdated: p.updatedAt instanceof Date
            ? p.updatedAt.toISOString().substring(11, 16)
            : null,
        })),
      });
    }

    return NextResponse.json({ batches: palettes, total: palettes.length });
  } catch (error) {
    console.error('[batches GET]', error);
    // Return empty on DB error (e.g. no DB configured)
    return NextResponse.json({ batches: [], total: 0 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    const body = await request.json();

    const { batchCode, species, origin, catchDate } = body;
    if (!batchCode || !species || !origin || !catchDate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create a new palette (batch) record
    const palette = await prisma.palette.create({
      data: {
        code: batchCode,
        batchCode: batchCode,
        species,
        article: 'DEFAULT', // Default article, can be updated later
        origin,
        weightKg: 0, // Default weight, can be updated later
        status: 'PARAGE_DONE', // Default status
        notes: body.notes || '',
        entryTime: new Date(catchDate),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.sub as string,
        userName: payload.name as string,
        action: 'BATCH_CREATE',
        entity: 'Palette',
        entityId: palette.id,
        details: JSON.stringify({ batchCode }),
      },
    });

    return NextResponse.json({ success: true, batch: palette }, { status: 201 });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Batch code already exists' }, { status: 409 });
    }
    console.error('[batches POST]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
