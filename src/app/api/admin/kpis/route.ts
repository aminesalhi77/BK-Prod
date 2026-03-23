import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const [palettesCount, chariotsCount, cyclesCount, recordsCount] = await Promise.all([
            prisma.palette.count(),
            prisma.chariot.count(),
            prisma.autoclaveCycle.count({ where: { status: 'COMPLETED' } }),
            prisma.packagingRecord.count(),
        ]);

        const yieldPct = 94.5; // Mock
        const activeWorkers = await prisma.user.count({ where: { isApproved: true } });
        const pendingUsers = await prisma.user.count({ where: { isApproved: false } });

        return NextResponse.json({
            kpis: {
                palettesCount,
                chariotsCount,
                cyclesCount,
                recordsCount,
                yieldPct,
                activeWorkers,
                pendingUsers
            }
        });
    } catch (error) {
        console.error('[admin-kpis]', error);
        return NextResponse.json({ error: 'Erreur lecture KPIs' }, { status: 500 });
    }
}
