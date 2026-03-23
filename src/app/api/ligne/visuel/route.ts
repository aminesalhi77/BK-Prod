import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const ligneId = searchParams.get('ligneId');

        if (!ligneId) return NextResponse.json({ error: 'Ligne ID requis' }, { status: 400 });

        const [palettes, chariots] = await Promise.all([
            prisma.palette.findMany({
                where: {
                    status: 'IN_LIGNE',
                    destinationLine: ligneId
                },
                orderBy: { updatedAt: 'desc' },
                take: 5
            }),
            prisma.chariot.findMany({
                where: {
                    ligneId,
                    status: 'READY_FOR_AUTOCLAVE'
                },
                orderBy: { createdAt: 'desc' },
                take: 5
            })
        ]);

        return NextResponse.json({ palettes, chariots });
    } catch (error) {
        console.error('[ligne-visuel]', error);
        return NextResponse.json({ error: 'Erreur lecture visuel' }, { status: 500 });
    }
}
