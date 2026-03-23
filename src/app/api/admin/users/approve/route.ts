import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { userId, approve } = await request.json();

        // Get admin info from token
        const authHeader = request.headers.get('Authorization');
        let adminMatricule = 'SYSTEM';
        if (authHeader?.startsWith('Bearer ')) {
            const payload = await verifyToken(authHeader.substring(7));
            adminMatricule = (payload.matricule as string) || 'SYSTEM';
        }

        if (approve === false) {
            await prisma.user.delete({
                where: { id: userId }
            });
            return NextResponse.json({ success: true, message: 'Utilisateur rejeté et supprimé' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                isApproved: true,
                approvedBy: adminMatricule,
                approvedAt: new Date()
            }
        });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        console.error('[admin-approve]', error);
        return NextResponse.json({ error: 'Erreur approbation' }, { status: 500 });
    }
}
