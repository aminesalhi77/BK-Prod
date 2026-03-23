import { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole } from '@prisma/client';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'bkfood-dev-secret-please-change-in-production'
);

export async function GET(request: NextRequest) {
  const token = request.cookies.get('bkfood-token')?.value;
  if (!token) return new Response('Non autorisé', { status: 401 });

  let role: UserRole;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    role = payload.role as UserRole;
  } catch {
    return new Response('Token invalide', { status: 401 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const send = async () => {
        try {
          const notifications = await WorkflowNotificationService.getNotificationsForRole(role, 50);
          const unreadCount = await WorkflowNotificationService.getUnreadCountForRole(role);
          const data = `data: ${JSON.stringify({ notifications, unreadCount })}\n\n`;
          controller.enqueue(encoder.encode(data));
        } catch {
          controller.close();
        }
      };

      // Send immediately on connect
      send();

      // Then push every 5 seconds
      const interval = setInterval(send, 1000);

      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}