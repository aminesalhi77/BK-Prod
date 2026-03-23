import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';

export async function POST(request: NextRequest) {
    try {
        const { cycleId, actualDurationMin } = await request.json();

        const cycle = await prisma.autoclaveCycle.findUnique({
            where: { id: cycleId },
            include: { chariots: { include: { chariot: true } } }
        });

        if (!cycle) return NextResponse.json({ error: 'Cycle introuvable' }, { status: 404 });

        // 1. Calculate end time and duration
        const endTime = new Date();
        const startTime = new Date(cycle.startTime);
        const duration = actualDurationMin || Math.round((endTime.getTime() - startTime.getTime()) / 60000);

        // 2. Generate STR Ticket Code: STR-YYYYMMDD-XXXX
        const dateStr = endTime.toISOString().split('T')[0].replace(/-/g, '');
        const count = await prisma.sterilizationTicket.count({
            where: { createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) } }
        });
        const strCode = `STR-${dateStr}-${(count + 1).toString().padStart(4, '0')}`;

        // 3. Update Cycle and Create Ticket
        const result = await prisma.$transaction([
            prisma.autoclaveCycle.update({
                where: { id: cycleId },
                data: {
                    status: 'COMPLETED',
                    endTime,
                    actualDurationMin: duration,
                }
            }),
            prisma.sterilizationTicket.create({
                data: {
                    code: strCode,
                    cycleId: cycleId,
                    status: 'READY_FOR_PACKAGING',
                }
            }),
            // Update all chariots to STERILIZED
            prisma.chariot.updateMany({
                where: { id: { in: cycle.chariots.map((c: any) => c.chariotId) } },
                data: { status: 'STERILIZED' }
            })
        ]);

        const ticket = result[1];

        // Notify RESPONSABLE_CONDITIONNEMENT that sterilization is done
        try {
            await WorkflowNotificationService.triggerWorkflowNotification('CYCLE_COMPLETE', {
                cycleId: cycle.id,
                ticketCode: ticket.code,
                ticketId: ticket.id,
            });
        } catch (e) {
            console.error('[notification-trigger]', e);
        }

        return NextResponse.json({ success: true, ticket });
    } catch (error) {
        console.error('[cycle-end]', error);
        return NextResponse.json({ error: 'Erreur fin de cycle' }, { status: 500 });
    }
}