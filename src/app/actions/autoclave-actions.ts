'use server';

import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole, ChariotStatus, CycleStatus } from '@prisma/client';

export async function startCycle(data: FormData) {
  try {
    const autoclaveId = data.get('autoclaveId') as string;
    const conducteurMatricule = data.get('conducteurMatricule') as string;
    const assistantMatricule = data.get('assistantMatricule') as string;
    const predictedDurationMin = parseInt(data.get('predictedDurationMin') as string);
    const chariotCodes = data.get('chariotCodes') as string;

    if (!autoclaveId || !conducteurMatricule || !predictedDurationMin || !chariotCodes) {
      return { success: false, error: 'Données manquantes' };
    }

    const chariotCodeList = chariotCodes.split(',').map(code => code.trim());

    // Find all chariots
    const chariots = await prisma.chariot.findMany({
      where: {
        code: { in: chariotCodeList },
        status: ChariotStatus.IN_AUTOCLAVE,
      },
    });

    if (chariots.length !== chariotCodeList.length) {
      return { success: false, error: 'Certains chariots ne sont pas prêts pour l\'autoclave' };
    }

    // Create autoclave cycle
    const cycle = await prisma.autoclaveCycle.create({
      data: {
        autoclaveId: autoclaveId,
        conducteurMatricule: conducteurMatricule,
        assistantMatricule: assistantMatricule || null,
        predictedDurationMin: predictedDurationMin,
        status: CycleStatus.RUNNING,
        totalBoxes: chariots.reduce((sum, chariot) => sum + chariot.boxCount, 0),
        totalWeightKg: chariots.reduce((sum, chariot) => sum + (chariot.estimatedWeight || 0), 0),
      },
    });

    // Update chariot statuses and link to cycle
    for (const chariot of chariots) {
      await prisma.chariot.update({
        where: { id: chariot.id },
        data: {
          status: ChariotStatus.STERILIZED,
        },
      });

      await prisma.autoclaveCycleChariot.create({
        data: {
          cycleId: cycle.id,
          chariotId: chariot.id,
        },
      });
    }

    return {
      success: true,
      message: `Cycle démarré avec ${chariots.length} chariots`,
      cycle,
    };
  } catch (error) {
    console.error('Error in startCycle:', error);
    return {
      success: false,
      error: 'Erreur lors du démarrage du cycle',
    };
  }
}

export async function endCycle(data: FormData) {
  try {
    const cycleId = data.get('cycleId') as string;
    const actualDurationMin = parseInt(data.get('actualDurationMin') as string);
    const isAnomaly = data.get('isAnomaly') === 'true';
    const anomalyScore = parseFloat(data.get('anomalyScore') as string);
    const anomalyFlags = data.get('anomalyFlags') as string;

    if (!cycleId || !actualDurationMin) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the cycle
    const cycle = await prisma.autoclaveCycle.findUnique({
      where: { id: cycleId },
      include: {
        chariots: {
          include: {
            chariot: true,
          },
        },
      },
    });

    if (!cycle) {
      return { success: false, error: 'Cycle non trouvé' };
    }

    if (cycle.status !== CycleStatus.RUNNING) {
      return { success: false, error: 'Le cycle n\'est pas en cours' };
    }

    // Update cycle status
    const updatedCycle = await prisma.autoclaveCycle.update({
      where: { id: cycle.id },
      data: {
        status: CycleStatus.COMPLETED,
        endTime: new Date(),
        actualDurationMin: actualDurationMin,
        isAnomaly: isAnomaly,
        anomalyScore: anomalyScore,
        anomalyFlags: anomalyFlags,
      },
    });

    // Create sterilization ticket
    const ticket = await prisma.sterilizationTicket.create({
      data: {
        code: `TICKET-${cycle.id}`,
        cycleId: cycle.id,
        isAnomaly: isAnomaly,
        mlSummary: anomalyFlags || '',
      },
    });

    // Trigger notification for the next step
    await WorkflowNotificationService.triggerWorkflowNotification('CYCLE_COMPLETE', {
      cycleId: cycle.id,
    });

    return {
      success: true,
      message: `Cycle terminé avec succès`,
      cycle: updatedCycle,
      ticket,
    };
  } catch (error) {
    console.error('Error in endCycle:', error);
    return {
      success: false,
      error: 'Erreur lors de la fin du cycle',
    };
  }
}

export async function chargementChariot(data: FormData) {
  try {
    const chariotCode = data.get('chariotCode') as string;
    const userId = data.get('userId') as string;
    const autoclaveId = data.get('autoclaveId') as string;

    if (!chariotCode || !userId || !autoclaveId) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the chariot
    const chariot = await prisma.chariot.findUnique({
      where: { code: chariotCode },
    });

    if (!chariot) {
      return { success: false, error: 'Chariot non trouvé' };
    }

    if (chariot.status !== ChariotStatus.READY_FOR_AUTOCLAVE) {
      return { success: false, error: 'Le chariot n\'est pas prêt pour l\'autoclave' };
    }

    // Update chariot status
    const updatedChariot = await prisma.chariot.update({
      where: { id: chariot.id },
      data: {
        status: ChariotStatus.IN_AUTOCLAVE,
      },
    });

    return {
      success: true,
      message: `Chariot ${chariotCode} chargé en autoclave`,
      chariot: updatedChariot,
    };
  } catch (error) {
    console.error('Error in chargementChariot:', error);
    return {
      success: false,
      error: 'Erreur lors du chargement du chariot',
    };
  }
}