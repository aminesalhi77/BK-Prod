import prisma from './prisma';
import { NotificationType, UserRole } from '@prisma/client';

export interface NotificationData {
  type: NotificationType;
  title: string;
  message: string;
  recipientRole: UserRole;
  recipientModule?: string;
  relatedEntity?: string;
  relatedId?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  expiresAt?: Date;
}

export class WorkflowNotificationService {
  /**
   * Create a workflow notification
   */
  static async createNotification(data: NotificationData) {
    return await prisma.workflowNotification.create({
      data: {
        type: data.type,
        title: data.title,
        message: data.message,
        recipientRole: data.recipientRole,
        recipientModule: data.recipientModule as any,
        relatedEntity: data.relatedEntity,
        relatedId: data.relatedId,
        priority: data.priority || 'MEDIUM',
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Get notifications for a specific user role
   */
  static async getNotificationsForRole(role: UserRole, limit: number = 750) {
    return await prisma.workflowNotification.findMany({
      where: {
        recipientRole: role,
        expiresAt: {gte: new Date(),},
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string) {
    return await prisma.workflowNotification.update({
      where: { id: notificationId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Get unread notification count for a role
   */
  static async getUnreadCountForRole(role: UserRole) {
    return await prisma.workflowNotification.count({
      where: {
        recipientRole: role,
        isRead: false,
        expiresAt: {
          gte: new Date(),
        },
      },
    });
  }

  /**
   * Clean up expired notifications
   */
  static async cleanupExpired() {
    return await prisma.workflowNotification.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }

  /**
   * Trigger notifications for workflow completion
   */
  static async triggerWorkflowNotification(
    type: 'PALETTE_EXIT' | 'CHARIOT_EXIT' | 'CYCLE_COMPLETE',
    data: any
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    switch (type) {
      case 'PALETTE_EXIT': {
        const notifData = {
          type: 'PALETTE_READY_FOR_LIGNE' as NotificationType,
          title: 'Palette prête pour la ligne',
          message: `La palette ${data.paletteCode} est sortie de la chambre et est prête pour la ligne ${data.destinationLine}`,
          recipientModule: data.destinationLine,
          relatedEntity: 'Palette',
          relatedId: data.paletteId,
          priority: 'HIGH' as const,
          expiresAt,
        };
        // Both CHEF_LIGNE and WORKER receive it
        await Promise.all([
          this.createNotification({ ...notifData, recipientRole: 'CHEF_LIGNE' as UserRole }),
          this.createNotification({ ...notifData, recipientRole: 'WORKER' as UserRole }),
        ]);
        return;
      }

      case 'CHARIOT_EXIT': {
        const notifData = {
          type: 'CHARIOT_READY_FOR_AUTOCLAVE' as NotificationType,
          title: 'Chariot prêt pour l\'autoclave',
          message: `Le chariot ${data.chariotCode} est prêt pour le chargement en autoclave`,
          recipientModule: 'AUTOCLAVE',
          relatedEntity: 'Chariot',
          relatedId: data.chariotId,
          priority: 'HIGH' as const,
          expiresAt,
        };
        // Both CHEF_LIGNE and WORKER receive it
        await Promise.all([
          this.createNotification({ ...notifData, recipientRole: 'CHEF_LIGNE' as UserRole }),
          this.createNotification({ ...notifData, recipientRole: 'WORKER' as UserRole }),
        ]);
        return;
      }

      case 'CYCLE_COMPLETE': {
        return await this.createNotification({
          type: 'CYCLE_COMPLETE_FOR_PACKAGING' as NotificationType,
          title: 'Cycle d\'autoclave terminé',
          message: `Le cycle ${data.cycleId} est terminé et les produits sont prêts pour l\'emballage`,
          recipientRole: 'RESPONSABLE_CONDITIONNEMENT' as UserRole,
          recipientModule: 'EMBALLAGE',
          relatedEntity: 'AutoclaveCycle',
          relatedId: data.cycleId,
          priority: 'HIGH',
          expiresAt,
        });
      }

      default:
        throw new Error('Invalid workflow notification type');
    }
  }
}