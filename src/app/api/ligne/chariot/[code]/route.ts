import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;
        const chariot = await prisma.chariot.findUnique({
            where: { code }
        });

        if (!chariot) return NextResponse.json({ error: 'Chariot introuvable' }, { status: 404 });

        return NextResponse.json({ chariot });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
