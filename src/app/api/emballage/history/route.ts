import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const history = await prisma.packagingRecord.findMany({
            orderBy: { startTime: 'desc' },
            take: 20,
            include: {
                ticket: true
            }
        });

        return NextResponse.json({ history });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur lecture historique' }, { status: 500 });
    }
}
