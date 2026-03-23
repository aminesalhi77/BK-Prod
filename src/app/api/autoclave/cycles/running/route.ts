import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const cycles = await prisma.autoclaveCycle.findMany({
            where: { status: 'RUNNING' },
            include: {
                chariots: {
                    include: { chariot: true }
                }
            },
            orderBy: { startTime: 'desc' }
        });

        return NextResponse.json({ cycles });
    } catch (error) {
        console.error('[cycles-running]', error);
        return NextResponse.json({ error: 'Erreur lecture cycles' }, { status: 500 });
    }
}
