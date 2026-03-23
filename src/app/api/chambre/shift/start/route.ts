import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { operatorMatricule, chefTapis1, chefTapis2, chefTapis3, chefTapis4 } = await request.json();

        if (!operatorMatricule || !chefTapis1 || !chefTapis2 || !chefTapis3 || !chefTapis4) {
            return NextResponse.json({ error: 'Tous les matricules sont requis' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        // Optional: verify that operatorMatricule matches current user if needed
        // For now, we trust the operator entry as they might be sharing a screen

        const shift = await prisma.chambreShift.create({
            data: {
                operatorMatricule,
                chefTapis1,
                chefTapis2,
                chefTapis3,
                chefTapis4,
                status: 'ACTIVE'
            }
        });

        return NextResponse.json({ success: true, shift });
    } catch (error) {
        console.error('[chambre-shift-start]', error);
        return NextResponse.json({ error: 'Erreur lors du démarrage du shift' }, { status: 500 });
    }
}
