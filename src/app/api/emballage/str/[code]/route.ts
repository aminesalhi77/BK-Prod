import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    request: NextRequest,
    { params }: { params: { code: string } }
) {
    try {
        const { code } = params;

        const ticket = await prisma.sterilizationTicket.findUnique({
            where: { code },
            include: {
                cycle: {
                    include: {
                        chariots: {
                            include: { chariot: true }
                        }
                    }
                }
            }
        });

        if (!ticket) {
            return NextResponse.json({ error: 'Ticket non trouvé' }, { status: 404 });
        }

        return NextResponse.json({ ticket });
    } catch (error) {
        console.error('[str-ticket]', error);
        return NextResponse.json({ error: 'Erreur recherche ticket' }, { status: 500 });
    }
}
