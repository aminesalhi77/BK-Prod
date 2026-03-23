import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const matricule = searchParams.get('matricule') || 'SUPER_ADMIN_IT';

        const user = await prisma.user.update({
            where: { matricule },
            data: { isApproved: true }
        });

        return NextResponse.json({
            success: true,
            message: `User ${user.matricule} (${user.name}) is now approved.`,
            note: "Don't forget to delete this endpoint after use!"
        });
    } catch (error) {
        return NextResponse.json({ error: 'Rescue failed. User might not exist.' }, { status: 404 });
    }
}
