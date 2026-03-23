import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const stock = await prisma.palette.findMany({
            where: {
                status: 'IN_CHAMBRE'
            },
            orderBy: {
                entryTime: 'asc'
            }
        });

        return NextResponse.json({ stock });
    } catch (error) {
        console.error('API /api/chambre/stock error:', error);
        return NextResponse.json({ error: 'Erreur lecture stock' }, { status: 500 });
    }
}
