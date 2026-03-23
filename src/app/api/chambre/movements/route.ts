import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const limit = parseInt(searchParams.get('limit') || '20');

        const movements = await prisma.paletteMovement.findMany({
            orderBy: { timestamp: 'desc' },
            take: limit,
            include: {
                palette: { select: { code: true, article: true, species: true } }
            }
        });

        return NextResponse.json({ movements });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
