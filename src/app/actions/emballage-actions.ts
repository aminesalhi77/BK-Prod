'use server';

import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole, TicketStatus } from '@prisma/client';

export async function saisieEmballage(data: FormData) {
  try {
    const ticketCode = data.get('ticketCode') as string;
    const cheffeMatricule = data.get('cheffeMatricule') as string;
    const packagingLine = data.get('packagingLine') as string;
    const shift = data.get('shift') as string;
    const actualBoxCount = parseInt(data.get('actualBoxCount') as string);
    const rejectedCount = parseInt(data.get('rejectedCount') as string || '0');
    const notes = data.get('notes') as string;

    if (!ticketCode || !cheffeMatricule || !packagingLine || !shift || !actualBoxCount) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the sterilization ticket
    const ticket = await prisma.sterilizationTicket.findUnique({
      where: { code: ticketCode },
      include: {
        cycle: true,
      },
    });

    if (!ticket) {
      return { success: false, error: 'Ticket de stérilisation non trouvé' };
    }

    if (ticket.status !== TicketStatus.READY_FOR_PACKAGING) {
      return { success: false, error: 'Le ticket n\'est pas prêt pour l\'emballage' };
    }

    // Update ticket status
    const updatedTicket = await prisma.sterilizationTicket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.IN_PACKAGING,
      },
    });

    // Create packaging record
    const packagingRecord = await prisma.packagingRecord.create({
      data: {
        sterilizationTicketId: ticket.id,
        cheffeMatricule: cheffeMatricule,
        packagingLine: packagingLine,
        shift: shift,
        actualBoxCount: actualBoxCount,
        rejectedCount: rejectedCount,
        notes: notes || '',
      },
    });

    return {
      success: true,
      message: `Emballage démarré pour le ticket ${ticketCode}`,
      ticket: updatedTicket,
      packagingRecord,
    };
  } catch (error) {
    console.error('Error in saisieEmballage:', error);
    return {
      success: false,
      error: 'Erreur lors de la saisie de l\'emballage',
    };
  }
}

export async function completeEmballage(data: FormData) {
  try {
    const ticketCode = data.get('ticketCode') as string;
    const cheffeMatricule = data.get('cheffeMatricule') as string;

    if (!ticketCode || !cheffeMatricule) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the sterilization ticket
    const ticket = await prisma.sterilizationTicket.findUnique({
      where: { code: ticketCode },
    });

    if (!ticket) {
      return { success: false, error: 'Ticket de stérilisation non trouvé' };
    }

    if (ticket.status !== TicketStatus.IN_PACKAGING) {
      return { success: false, error: 'Le ticket n\'est pas en cours d\'emballage' };
    }

    // Update ticket status
    const updatedTicket = await prisma.sterilizationTicket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.PACKAGING_COMPLETE,
      },
    });

    // Update packaging record end time
    await prisma.packagingRecord.updateMany({
      where: { sterilizationTicketId: ticket.id },
      data: {
        endTime: new Date(),
      },
    });

    return {
      success: true,
      message: `Emballage terminé pour le ticket ${ticketCode}`,
      ticket: updatedTicket,
    };
  } catch (error) {
    console.error('Error in completeEmballage:', error);
    return {
      success: false,
      error: 'Erreur lors de la fin de l\'emballage',
    };
  }
}

export async function getTraceability(data: FormData) {
  try {
    const code = data.get('code') as string;

    if (!code) {
      return { success: false, error: 'Code requis' };
    }

    // Try to find by sterilization ticket code first
    let ticket = await prisma.sterilizationTicket.findUnique({
      where: { code: code },
      include: {
        cycle: {
          include: {
            chariots: {
              include: {
                chariot: true,
              },
            },
          },
        },
      },
    });

    if (ticket) {
      return {
        success: true,
        type: 'ticket',
        data: ticket,
      };
    }

    // Try to find by chariot code
    const chariot = await prisma.chariot.findUnique({
      where: { code: code },
      include: {
        autoclaveCycles: {
          include: {
            cycle: true,
          },
        },
      },
    });

    if (chariot) {
      return {
        success: true,
        type: 'chariot',
        data: chariot,
      };
    }

    // Try to find by palette code
    const palette = await prisma.palette.findUnique({
      where: { code: code },
      include: {
        movements: true,
        lineEntries: true,
      },
    });

    if (palette) {
      return {
        success: true,
        type: 'palette',
        data: palette,
      };
    }

    return {
      success: false,
      error: 'Code non trouvé dans la base de données',
    };
  } catch (error) {
    console.error('Error in getTraceability:', error);
    return {
      success: false,
      error: 'Erreur lors de la recherche de traçabilité',
    };
  }
}