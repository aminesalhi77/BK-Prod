import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { paletteCode, longeType, positionNumber, positionZone, weightKg, batchCode, species, article, origin } = await request.json();

        // Get operator info from token
        const authHeader = request.headers.get('Authorization');
        let workerMatricule = 'SYSTEM';
        if (authHeader?.startsWith('Bearer ')) {
            const payload = await verifyToken(authHeader.substring(7));
            workerMatricule = (payload.matricule as string) || 'SYSTEM';
        }

        // Create new palette entry (comes from parrage which is not in this system)
        const newPalette = await prisma.palette.create({
            data: {
                code: paletteCode,
                batchCode: batchCode || '',
                species: species || '',
                article: article || '',
                weightKg: weightKg || 0,
                origin: origin || '',
                status: 'IN_CHAMBRE',
                entryTime: new Date(),
                longeType,
                positionNumber,
                positionZone,
                chambreWorkerId: workerMatricule,
                movements: {
                    create: {
                        fromStation: 'PARAGE',
                        toStation: 'CHAMBRE_0',
                        workerMatricule,
                        notes: `Entrée en Chambre 0 (Pos: ${positionZone}${positionNumber})`
                    }
                }
            } as any
        });

        // 🤖 ML Hook: Weight Anomaly Check (Placeholder)
        // const isAnomaly = await checkWeightAnomaly(updated.weightKg, updated.article);

        return NextResponse.json({ success: true, palette: newPalette });
    } catch (error) {
        console.error('[chambre-entree]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur transaction';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
