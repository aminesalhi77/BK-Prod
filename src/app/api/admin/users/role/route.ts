import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { userId, role, assignedModule } = await request.json();

        if (!userId || !role) {
            return NextResponse.json({ error: 'userId et role requis' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: userId },
            data: {
                role: role as any,
                assignedModule: assignedModule || null,
            },
        });

        return NextResponse.json({ success: true, user: { id: updated.id, role: updated.role, assignedModule: updated.assignedModule } });
    } catch (error: any) {
        console.error('[assign-role]', error);
        return NextResponse.json({ error: error.message || 'Erreur interne' }, { status: 500 });
    }
}
