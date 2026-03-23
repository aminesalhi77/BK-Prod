import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
    try {
        const { movementId, notes, correctedBy } = await request.json();

        if (!movementId || !notes) {
            return NextResponse.json({ error: 'movementId et notes obligatoires' }, { status: 400 });
        }

        // Check it's truly the last movement
        const last = await prisma.paletteMovement.findFirst({
            orderBy: { timestamp: 'desc' },
        });

        if (!last || last.id !== movementId) {
            return NextResponse.json({
                error: 'Vous ne pouvez corriger que la DERNIÈRE saisie uniquement.'
            }, { status: 403 });
        }

        // Append correction note to the existing movement
        const updated = await prisma.paletteMovement.update({
            where: { id: movementId },
            data: {
                notes: `[CORRECTION par ${correctedBy} le ${new Date().toLocaleString('fr-FR')}] ${notes}`,
            },
        });

        // Log to AuditLog for full traceability
        await prisma.auditLog.create({
            data: {
                userId: correctedBy,
                userName: correctedBy,
                action: 'CORRECTION',
                entity: 'PaletteMovement',
                entityId: movementId,
                details: `Correction: ${notes}`,
            },
        });

        return NextResponse.json({ success: true, movement: updated });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
