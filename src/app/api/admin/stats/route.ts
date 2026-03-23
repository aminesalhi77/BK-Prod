import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const period = searchParams.get('period') || 'day';
        const now = new Date();
        let startDate: Date;

        if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'week') {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startDate = new Date(now.getFullYear(), now.getMonth(), diff);
            startDate.setHours(0, 0, 0, 0);
        } else {
            startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        }

        const [
            totalPalettes,
            palettesIn,
            palettesOut,
            palettesInChambre,
            palettesInLigne,
            palettesConsumed,
            palettesSentToLigne,
            movements,
            userCount,
            chariotsCreated,
            autoclaveCycles,
            packagingRecords,
            completedCycles,
        ] = await Promise.all([
            prisma.palette.count(),
            prisma.palette.count({ where: { entryTime: { gte: startDate } } }),
            prisma.palette.count({ where: { exitTime: { gte: startDate } } }),
            prisma.palette.count({ where: { status: 'IN_CHAMBRE' } }),
            prisma.palette.count({ where: { status: 'IN_LIGNE' } }),
            prisma.palette.count({ where: { status: 'CONSUMED' } }),
            prisma.palette.count({ where: { status: 'SENT_TO_LIGNE' } }),
            prisma.paletteMovement.count({ where: { timestamp: { gte: startDate } } }),
            prisma.user.count({ where: { isApproved: true } }),
            prisma.chariot.count({ where: { createdAt: { gte: startDate } } }),
            prisma.autoclaveCycle.count({ where: { createdAt: { gte: startDate } } }),
            prisma.packagingRecord.count({ where: { startTime: { gte: startDate } } }),
            prisma.autoclaveCycle.count({ where: { status: 'COMPLETED', createdAt: { gte: startDate } } }),
        ]);

        // Weight totals
        const weightResult = await prisma.palette.aggregate({
            _sum: { weightKg: true },
            where: { entryTime: { gte: startDate } },
        });

        // Total boxes produced
        const boxesResult = await prisma.chariot.aggregate({
            _sum: { boxCount: true },
            where: { createdAt: { gte: startDate } },
        });

        // Avg autoclave duration
        const durationResult = await prisma.autoclaveCycle.aggregate({
            _avg: { actualDurationMin: true },
            where: { status: 'COMPLETED', createdAt: { gte: startDate } },
        });

        // Chariots per ligne
        const chariotsPerLigne = await prisma.chariot.groupBy({
            by: ['ligneId'],
            _count: { id: true },
            _sum: { boxCount: true },
            where: { createdAt: { gte: startDate } },
            orderBy: { _count: { id: 'desc' } },
        });

        // Top 5 workers by movements
        const topWorkers = await prisma.paletteMovement.groupBy({
            by: ['workerMatricule'],
            _count: { id: true },
            where: { timestamp: { gte: startDate } },
            orderBy: { _count: { id: 'desc' } },
            take: 5,
        });

        // Chart data: flow over time
        const flowChartData = await buildFlowChart(period, startDate, now);

        // Weight trend
        const weightChartData = await buildWeightChart(period, startDate, now);

        return NextResponse.json({
            period,
            startDate,
            stats: {
                totalPalettes,
                palettesIn,
                palettesOut,
                palettesInChambre,
                movements,
                userCount,
                chariotsCreated,
                autoclaveCycles,
                completedCycles,
                packagingRecords,
                totalWeightKg: weightResult._sum.weightKg || 0,
                totalBoxes: boxesResult._sum.boxCount || 0,
                avgCycleDurationMin: Math.round(durationResult._avg.actualDurationMin || 0),
            },
            statusDistribution: {
                inChambre: palettesInChambre,
                inLigne: palettesInLigne,
                sentToLigne: palettesSentToLigne,
                consumed: palettesConsumed,
            },
            chariotsPerLigne: chariotsPerLigne.map(c => ({
                ligne: c.ligneId,
                count: c._count.id,
                boxes: c._sum.boxCount || 0,
            })),
            topWorkers: topWorkers.map(w => ({
                matricule: w.workerMatricule,
                movements: w._count.id,
            })),
            flowChartData,
            weightChartData,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

async function buildFlowChart(period: string, startDate: Date, now: Date) {
    const labels: string[] = [];
    const entriesData: number[] = [];
    const exitsData: number[] = [];
    const chariotsData: number[] = [];

    if (period === 'day') {
        for (let h = 0; h < 24; h++) {
            const from = new Date(startDate); from.setHours(h, 0, 0, 0);
            const to = new Date(startDate); to.setHours(h + 1, 0, 0, 0);
            labels.push(`${h}h`);
            const [inn, out, ch] = await Promise.all([
                prisma.palette.count({ where: { entryTime: { gte: from, lt: to } } }),
                prisma.palette.count({ where: { exitTime: { gte: from, lt: to } } }),
                prisma.chariot.count({ where: { createdAt: { gte: from, lt: to } } }),
            ]);
            entriesData.push(inn); exitsData.push(out); chariotsData.push(ch);
        }
    } else if (period === 'week') {
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        for (let d = 0; d < 7; d++) {
            const from = new Date(startDate); from.setDate(startDate.getDate() + d); from.setHours(0, 0, 0, 0);
            const to = new Date(from); to.setDate(from.getDate() + 1);
            labels.push(days[d]);
            const [inn, out, ch] = await Promise.all([
                prisma.palette.count({ where: { entryTime: { gte: from, lt: to } } }),
                prisma.palette.count({ where: { exitTime: { gte: from, lt: to } } }),
                prisma.chariot.count({ where: { createdAt: { gte: from, lt: to } } }),
            ]);
            entriesData.push(inn); exitsData.push(out); chariotsData.push(ch);
        }
    } else if (period === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const from = new Date(now.getFullYear(), now.getMonth(), d);
            const to = new Date(now.getFullYear(), now.getMonth(), d + 1);
            labels.push(`${d}`);
            const [inn, out, ch] = await Promise.all([
                prisma.palette.count({ where: { entryTime: { gte: from, lt: to } } }),
                prisma.palette.count({ where: { exitTime: { gte: from, lt: to } } }),
                prisma.chariot.count({ where: { createdAt: { gte: from, lt: to } } }),
            ]);
            entriesData.push(inn); exitsData.push(out); chariotsData.push(ch);
        }
    } else {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        for (let m = 0; m < 12; m++) {
            const from = new Date(now.getFullYear(), m, 1);
            const to = new Date(now.getFullYear(), m + 1, 1);
            labels.push(months[m]);
            const [inn, out, ch] = await Promise.all([
                prisma.palette.count({ where: { entryTime: { gte: from, lt: to } } }),
                prisma.palette.count({ where: { exitTime: { gte: from, lt: to } } }),
                prisma.chariot.count({ where: { createdAt: { gte: from, lt: to } } }),
            ]);
            entriesData.push(inn); exitsData.push(out); chariotsData.push(ch);
        }
    }
    return { labels, entriesData, exitsData, chariotsData };
}

async function buildWeightChart(period: string, startDate: Date, now: Date) {
    const labels: string[] = [];
    const weightData: number[] = [];
    const boxesData: number[] = [];

    if (period === 'day') {
        for (let h = 0; h < 24; h++) {
            const from = new Date(startDate); from.setHours(h, 0, 0, 0);
            const to = new Date(startDate); to.setHours(h + 1, 0, 0, 0);
            labels.push(`${h}h`);
            const [w, b] = await Promise.all([
                prisma.palette.aggregate({ _sum: { weightKg: true }, where: { entryTime: { gte: from, lt: to } } }),
                prisma.chariot.aggregate({ _sum: { boxCount: true }, where: { createdAt: { gte: from, lt: to } } }),
            ]);
            weightData.push(Math.round(w._sum.weightKg || 0));
            boxesData.push(b._sum.boxCount || 0);
        }
    } else if (period === 'week') {
        const days = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
        for (let d = 0; d < 7; d++) {
            const from = new Date(startDate); from.setDate(startDate.getDate() + d); from.setHours(0, 0, 0, 0);
            const to = new Date(from); to.setDate(from.getDate() + 1);
            labels.push(days[d]);
            const [w, b] = await Promise.all([
                prisma.palette.aggregate({ _sum: { weightKg: true }, where: { entryTime: { gte: from, lt: to } } }),
                prisma.chariot.aggregate({ _sum: { boxCount: true }, where: { createdAt: { gte: from, lt: to } } }),
            ]);
            weightData.push(Math.round(w._sum.weightKg || 0));
            boxesData.push(b._sum.boxCount || 0);
        }
    } else if (period === 'month') {
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
            const from = new Date(now.getFullYear(), now.getMonth(), d);
            const to = new Date(now.getFullYear(), now.getMonth(), d + 1);
            labels.push(`${d}`);
            const [w, b] = await Promise.all([
                prisma.palette.aggregate({ _sum: { weightKg: true }, where: { entryTime: { gte: from, lt: to } } }),
                prisma.chariot.aggregate({ _sum: { boxCount: true }, where: { createdAt: { gte: from, lt: to } } }),
            ]);
            weightData.push(Math.round(w._sum.weightKg || 0));
            boxesData.push(b._sum.boxCount || 0);
        }
    } else {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
        for (let m = 0; m < 12; m++) {
            const from = new Date(now.getFullYear(), m, 1);
            const to = new Date(now.getFullYear(), m + 1, 1);
            labels.push(months[m]);
            const [w, b] = await Promise.all([
                prisma.palette.aggregate({ _sum: { weightKg: true }, where: { entryTime: { gte: from, lt: to } } }),
                prisma.chariot.aggregate({ _sum: { boxCount: true }, where: { createdAt: { gte: from, lt: to } } }),
            ]);
            weightData.push(Math.round(w._sum.weightKg || 0));
            boxesData.push(b._sum.boxCount || 0);
        }
    }
    return { labels, weightData, boxesData };
}