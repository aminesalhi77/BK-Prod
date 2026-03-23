import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';

export async function POST(request: NextRequest) {
    try {
        const { paletteCode, destination } = await request.json();

        const authHeader = request.headers.get('Authorization');
        let workerMatricule = 'SYSTEM';
        if (authHeader?.startsWith('Bearer ')) {
            const payload = await verifyToken(authHeader.substring(7));
            workerMatricule = (payload.matricule as string) || 'SYSTEM';
        }

        const updated = await prisma.palette.update({
            where: { code: paletteCode },
            data: {
                status: 'SENT_TO_LIGNE',
                exitTime: new Date(),
                destinationLine: destination,
                ligneWorkerId: workerMatricule,
                // Clear chamber positions
                positionNumber: null,
                positionZone: null,
                movements: {
                    create: {
                        fromStation: 'CHAMBRE_0',
                        toStation: 'LIGNE',
                        workerMatricule,
                        notes: `Sortie vers ligne ${destination}`
                    }
                }
            } as any
        });

        // Trigger notification to CHEF_LIGNE
try {
    await WorkflowNotificationService.triggerWorkflowNotification('PALETTE_EXIT', {
        paletteCode: updated.code,
        paletteId: updated.id,
        destinationLine: destination,
    });
} catch (e) {
    console.error('[notification-trigger]', e);
}

return NextResponse.json({ success: true, palette: updated });
    } catch (error) {
        console.error('[chambre-sortie]', error);
        const errorMessage = error instanceof Error ? error.message : 'Erreur transaction';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
