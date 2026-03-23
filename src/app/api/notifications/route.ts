import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/jwt';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole } from '@prisma/client';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    const role = payload.role as UserRole;

    const notifications = await WorkflowNotificationService.getNotificationsForRole(role, limit);
    const unreadCount = await WorkflowNotificationService.getUnreadCountForRole(role);

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    console.error('[notifications-get]', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la récupération des notifications' 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    let payload;
    try {
      payload = await verifyToken(token);
    } catch (error) {
      return NextResponse.json({ error: 'Token invalide' }, { status: 401 });
    }

    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de notification requis' 
      }, { status: 400 });
    }

    await prisma.workflowNotification.update({
  where: { id: notificationId },
  data: { 
    isRead: true, 
    readAt: new Date(),
    expiresAt: new Date(), // ← expires immediately, SSE won't return it again
  },
});

    return NextResponse.json({
      success: true,
      message: 'Notification marquée comme lue',
    });
  } catch (error) {
    console.error('[notifications-post]', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erreur lors de la mise à jour de la notification' 
    }, { status: 500 });
  }
}