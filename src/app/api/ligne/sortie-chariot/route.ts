import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';

const LIGNE_MAP: Record<string, { name: string; description: string }> = {
  'Ligne 5/2 [1]': { name: 'Ligne 5/2 [1]', description: '' },
  'Ligne 5/2 [2]': { name: 'Ligne 5/2 [2]', description: '' },
  'Ligne 400':     { name: 'Ligne 400',     description: '' },
  'Ligne 1/5':     { name: 'Ligne 1/5',     description: '' },
  'Ligne Manuel':  { name: 'Ligne Manuel',  description: '' },
};

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        console.log('Received data:', body);

        const { numero, article, boxCount, ligneId, operatorMatricule, timestamp } = body;

        // ✅ Presence validation
        if (!numero || !article || !boxCount || !ligneId || !operatorMatricule) {
            return NextResponse.json({
                error: 'Données manquantes',
                received: { numero, article, boxCount, ligneId, operatorMatricule }
            }, { status: 400 });
        }

        // ✅ ligneId validation against known lines
        if (!LIGNE_MAP[ligneId]) {
            return NextResponse.json({
                error: `Ligne invalide: "${ligneId}". Lignes acceptées: ${Object.keys(LIGNE_MAP).join(', ')}`
            }, { status: 400 });
        }

        // ✅ boxCount validation
        const parsedBoxCount = parseInt(boxCount);
        if (isNaN(parsedBoxCount) || parsedBoxCount <= 0) {
            return NextResponse.json({
                error: 'boxCount invalide. Il doit être un nombre positif.'
            }, { status: 400 });
        }

        // ✅ timestamp validation
        const createdAt = timestamp && !isNaN(Date.parse(timestamp))
            ? new Date(timestamp)
            : new Date();

        // ✅ Safe barcode generation using a transaction to avoid race conditions
        const chariot = await prisma.$transaction(async (tx) => {
            const date = new Date().toISOString().split('T')[0].replace(/-/g, '');

            const count = await tx.chariot.count({
                where: {
                    createdAt: {
                        gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    },
                },
            });

            const code = `CHR-${date}-${(count + 1).toString().padStart(4, '0')}`;

            return await tx.chariot.create({
                data: {
                    code,
                    numero,
                    article,
                    boxCount: parsedBoxCount,
                    ligneId,
                    cheffeMatricule: operatorMatricule,
                    createdAt,
                },
            });
        });

        console.log('Chariot created successfully:', chariot);

        // ✅ Notify autoclave that chariot is ready
        try {
            await WorkflowNotificationService.triggerWorkflowNotification('CHARIOT_EXIT', {
                chariotCode: chariot.code,
                chariotId: chariot.id,
            });
        } catch (e) {
            console.error('[notification-trigger]', e);
        }

        // ✅ Attach ligne display info to response
        const ligneInfo = LIGNE_MAP[chariot.ligneId];

        return NextResponse.json({
            success: true,
            chariot: {
                ...chariot,
                ligneDisplay: ligneInfo?.name || chariot.ligneId,
                ligneDescription: ligneInfo?.description || '',
            },
            message: 'Chariot créé avec succès'
        });

    } catch (error) {
        console.error('[chariot-create] Full error:', error);

        if ((error as any)?.code === 'P2002') {
            return NextResponse.json({
                error: 'Code chariot déjà existant. Veuillez réessayer.'
            }, { status: 409 });
        }

        return NextResponse.json({
            error: 'Erreur création chariot',
            details: error instanceof Error ? error.message : 'Unknown error',
            prismaCode: (error as any)?.code,
        }, { status: 500 });
    }
}