import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { entity, id, data, reason } = await request.json();

        if (!entity || !id || !data || !reason) {
            return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
        }

        const authHeader = request.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
        }

        const payload = await verifyToken(authHeader.substring(7));
        const userRole = payload.role as string;
        const userMatricule = payload.matricule as string;
        const userName = payload.name as string;
        const userId = payload.sub as string;

        // 1. Role-based Permission Check
        if (userRole === 'RESPONSABLE_CONDITIONNEMENT') {
            // Check if it is the LAST entry for this entity
            const lastEntry = await (prisma as any)[entity].findFirst({
                orderBy: { createdAt: 'desc' }
            });

            if (lastEntry.id !== id) {
                return NextResponse.json({
                    error: 'Vous ne pouvez corriger que la DERNIÈRE saisie.'
                }, { status: 403 });
            }
        } else if (userRole !== 'SUPER_ADMIN_IT') {
            return NextResponse.json({
                error: 'Vous n\'avez pas les droits de correction.'
            }, { status: 403 });
        }

        // 2. Log original state before update
        const original = await (prisma as any)[entity].findUnique({ where: { id } });

        // 3. Perform update within transaction to ensure audit log is created
        const result = await prisma.$transaction(async (tx) => {
            const updated = await (tx as any)[entity].update({
                where: { id },
                data: {
                    ...data,
                    updatedAt: new Date() // Force updatedAt update
                }
            });

            await tx.auditLog.create({
                data: {
                    userId,
                    userName,
                    action: 'CORRECTION',
                    entity,
                    entityId: id,
                    details: JSON.stringify({
                        reason,
                        before: original,
                        after: updated,
                        correctedBy: userMatricule
                    })
                }
            });

            return updated;
        });

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('[production-correct]', error);
        return NextResponse.json({ error: error.message || 'Erreur correction' }, { status: 500 });
    }
}
