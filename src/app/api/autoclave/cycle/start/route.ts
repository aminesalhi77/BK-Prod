import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { autoclaveId, assistantMatricule, chariotCodes } = await request.json();

        const authHeader = request.headers.get('Authorization');
        let conducteurMatricule = 'SYSTEM';
        if (authHeader?.startsWith('Bearer ')) {
            const payload = await verifyToken(authHeader.substring(7));
            conducteurMatricule = (payload.matricule as string) || 'SYSTEM';
        }

        // 1. Validate Chariots
        const chariots = await prisma.chariot.findMany({
            where: {
                code: { in: chariotCodes },
                status: 'READY_FOR_AUTOCLAVE',
            },
        });

        if (chariots.length !== chariotCodes.length) {
            return NextResponse.json({ error: 'Certains chariots sont invalides ou non prêts' }, { status: 400 });
        }

        // 2. Calculate totals
        const totalBoxes = chariots.reduce((sum: number, c: any) => sum + (c.boxCount || 0), 0);
        const totalWeightKg = chariots.reduce((sum: number, c: any) => sum + (c.estimatedWeight || 0), 0);

        // 3. Create Cycle and Update Chariots
        const cycle = await prisma.autoclaveCycle.create({
            data: {
                autoclaveId,
                conducteurMatricule,
                assistantMatricule,
                totalBoxes,
                totalWeightKg,
                status: 'RUNNING',
                chariots: {
                    create: chariots.map((c: any) => ({
                        chariotId: c.id
                    }))
                }
            }
        });

        await prisma.chariot.updateMany({
            where: { id: { in: chariots.map((c: any) => c.id) } },
            data: { status: 'IN_AUTOCLAVE' }
        });

        return NextResponse.json({ 
            message: 'Cycle démarré avec succès',
            cycle: {
                id: cycle.id,
                autoclaveId: cycle.autoclaveId,
                conducteurMatricule: cycle.conducteurMatricule,
                assistantMatricule: cycle.assistantMatricule,
                totalBoxes: cycle.totalBoxes,
                totalWeightKg: cycle.totalWeightKg,
                status: cycle.status,
                startTime: cycle.startTime
            },
            chariots: chariots.map(c => ({
                id: c.id,
                code: c.code,
                numero: c.numero,
                status: 'IN_AUTOCLAVE'
            }))
        }, { status: 201 });
    } catch (error) {
        console.error('[autoclave-start]', error);
        return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
    }
}
