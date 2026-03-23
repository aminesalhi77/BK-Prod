import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;

        // 1. Try to find as Packaging Record
        const record = await prisma.packagingRecord.findFirst({
            where: { sterilizationTicketId: code }, // Fixed field name
        });

        // 2. Load STR Ticket
        const ticket = await prisma.sterilizationTicket.findUnique({
            where: { code: record?.sterilizationTicketId || code },
            include: {
                cycle: {
                    include: {
                        chariots: {
                            include: {
                                chariot: true
                            }
                        }
                    }
                }
            }
        });

        if (!ticket) return NextResponse.json({ error: 'Données de traçabilité non trouvées' }, { status: 404 });

        return NextResponse.json({
            record,
            ticket,
            genealogy: {
                packaging: record,
                sterilization: ticket.cycle,
                production: ticket.cycle?.chariots.map((rc: any) => rc.chariot),
            }
        });
    } catch (error) {
        console.error('[traceability-lookup]', error);
        return NextResponse.json({ error: 'Erreur recherche' }, { status: 500 });
    }
}
