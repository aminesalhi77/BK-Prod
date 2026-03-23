import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const auth = request.headers.get('authorization');
    const token = auth?.replace('Bearer ', '');
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await verifyToken(token);
    if (payload.role !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Only Super Admin can approve users' }, { status: 403 });
    }

    const { userId, action, role } = await request.json();

    if (!userId || !action) {
      return NextResponse.json({ error: 'userId and action required' }, { status: 400 });
    }

    if (action === 'approve') {
      await prisma.user.update({
        where: { id: userId },
        data: {
          isApproved: true,
          approvedAt: new Date(),
          approvedBy: payload.sub as string,
          ...(role ? { role: role as any } : {}),
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: payload.sub as string,
          userName: payload.name as string,
          action: 'USER_APPROVE',
          entity: 'User',
          entityId: userId,
          details: JSON.stringify({ action: 'approve', role }),
        },
      });

      return NextResponse.json({ success: true, message: 'User approved' });
    }

    if (action === 'reject') {
      // Note: rejection logic without approvalRequest model
      await prisma.auditLog.create({
        data: {
          userId: payload.sub as string,
          userName: payload.name as string,
          action: 'USER_REJECT',
          entity: 'User',
          entityId: userId,
          details: JSON.stringify({ action: 'reject' }),
        },
      });

      return NextResponse.json({ success: true, message: 'User rejected' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[users/approve]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
