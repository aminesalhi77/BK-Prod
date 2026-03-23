import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;

        const palette = await prisma.palette.findUnique({
            where: { code },
            include: {
                movements: {
                    orderBy: { timestamp: 'desc' },
                    take: 5
                }
            }
        });

        if (!palette) {
            return NextResponse.json({ error: 'Palette introuvable' }, { status: 404 });
        }

        return NextResponse.json({ palette });
    } catch (error) {
        console.error('[palette-get]', error);
        return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;
        const { status, updates } = await request.json();

        const palette = await prisma.palette.update({
            where: { code },
            data: {
                status,
                ...updates
            }
        });

        return NextResponse.json({ palette });
    } catch (error) {
        console.error('[palette-update]', error);
        return NextResponse.json({ error: 'Erreur mise à jour' }, { status: 500 });
    }
}
