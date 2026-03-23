import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
        }

        const token = authHeader.substring(7);
        const payload = await verifyToken(token);

        if (!payload || !payload.sub) {
            return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.sub as string },
            select: {
                id: true,
                matricule: true,
                email: true,
                name: true,
                role: true,
                isApproved: true,
                assignedModule: true,
            },
        });

        if (!user) {
            return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
        }

        return NextResponse.json({ user });
    } catch (error) {
        console.error('[auth-me]', error);
        return NextResponse.json({ error: 'Session expirée ou invalide' }, { status: 401 });
    }
}
