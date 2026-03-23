import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const palettes = await prisma.palette.findMany({
            where: { status: 'IN_CHAMBRE' }
        }) as any[];

        const totalTonnage = palettes.reduce((sum, p) => sum + (p.weightKg || 0), 0);

        const byType = palettes.reduce((acc, p) => {
            const type = p.longeType || 'Inconnu';
            acc[type] = (acc[type] || 0) + (p.weightKg || 0);
            return acc;
        }, {} as Record<string, number>);

        const alertThreshold = 8 * 60 * 60 * 1000;
        const now = Date.now();
        const inAlert = palettes.filter(p => {
            if (!p.entryTime) return false;
            return (now - new Date(p.entryTime).getTime()) > alertThreshold;
        }).length;

        return NextResponse.json({
            indicators: {
                totalPalettes: palettes.length,
                totalTonnage,
                byType,
                inAlert
            }
        });
    } catch (error) {
        return NextResponse.json({ error: 'Erreur indicateurs' }, { status: 500 });
    }
}
