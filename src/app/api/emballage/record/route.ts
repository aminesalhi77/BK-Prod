import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { strCode, cartonCount, boxesPerCarton, dluo } = await request.json();

        const authHeader = request.headers.get('Authorization');
        let workerMatricule = 'SYSTEM';
        if (authHeader?.startsWith('Bearer ')) {
            const payload = await verifyToken(authHeader.substring(7));
            workerMatricule = (payload.matricule as string) || 'SYSTEM';
        }

        const ticket = await prisma.sterilizationTicket.findUnique({
            where: { code: strCode }
        });

        if (!ticket) return NextResponse.json({ error: 'Ticket STR non trouvé' }, { status: 404 });

        // Create Packaging Record
        const record = await prisma.packagingRecord.create({
            data: {
                sterilizationTicketId: ticket.id,
                cheffeMatricule: workerMatricule,
                packagingLine: 'LINE_1', // Default or from body
                shift: 'A', // Default or from body
                actualBoxCount: parseInt(cartonCount) * parseInt(boxesPerCarton),
                rejectedCount: 0,
            }
        });

        // Mark ticket as CONSUMED/PACKAGED
        await prisma.sterilizationTicket.update({
            where: { id: ticket.id },
            data: { status: 'PACKAGING_COMPLETE' }
        });

        // 🤖 TODO: Call Python ML for box/carton ratio anomaly check

        return NextResponse.json({ success: true, record });
    } catch (error) {
        console.error('[emballage-record]', error);
        return NextResponse.json({ error: 'Erreur enregistrement' }, { status: 500 });
    }
}
