'use server';

import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole, PaletteStatus } from '@prisma/client';

export async function sortiePalette(data: FormData) {
  try {
    const paletteCode = data.get('paletteCode') as string;
    const destinationLine = data.get('destinationLine') as string;
    const userId = data.get('userId') as string;

    if (!paletteCode || !destinationLine || !userId) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the palette
    const palette = await prisma.palette.findUnique({
      where: { code: paletteCode },
    });

    if (!palette) {
      return { success: false, error: 'Palette non trouvée' };
    }

    if (palette.status !== PaletteStatus.IN_CHAMBRE) {
      return { success: false, error: 'La palette n\'est pas en chambre' };
    }

    // Update palette status and destination
    const updatedPalette = await prisma.palette.update({
      where: { id: palette.id },
      data: {
        status: PaletteStatus.SENT_TO_LIGNE,
        destinationLine,
        exitTime: new Date(),
      },
    });

    // Create movement record
    await prisma.paletteMovement.create({
      data: {
        paletteId: palette.id,
        fromStation: 'CHAMBRE',
        toStation: 'LIGNE',
        workerMatricule: userId,
        notes: `Sortie vers ligne ${destinationLine}`,
      },
    });

    // Trigger notification for the next step
    await WorkflowNotificationService.triggerWorkflowNotification('PALETTE_EXIT', {
      paletteCode,
      destinationLine,
      paletteId: palette.id,
    });

    return {
      success: true,
      message: `Palette ${paletteCode} sortie de la chambre vers la ligne ${destinationLine}`,
      palette: updatedPalette,
    };
  } catch (error) {
    console.error('Error in sortiePalette:', error);
    return {
      success: false,
      error: 'Erreur lors de la sortie de la palette',
    };
  }
}

export async function entreePalette(data: FormData) {
  try {
    const paletteCode = data.get('paletteCode') as string;
    const userId = data.get('userId') as string;

    if (!paletteCode || !userId) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the palette
    const palette = await prisma.palette.findUnique({
      where: { code: paletteCode },
    });

    if (!palette) {
      return { success: false, error: 'Palette non trouvée' };
    }

    if (palette.status !== PaletteStatus.SENT_TO_LIGNE) {
      return { success: false, error: 'La palette n\'est pas en ligne' };
    }

    // Update palette status
    const updatedPalette = await prisma.palette.update({
      where: { id: palette.id },
      data: {
        status: PaletteStatus.IN_CHAMBRE,
        entryTime: new Date(),
      },
    });

    // Create movement record
    await prisma.paletteMovement.create({
      data: {
        paletteId: palette.id,
        fromStation: 'LIGNE',
        toStation: 'CHAMBRE',
        workerMatricule: userId,
        notes: 'Retour en chambre',
      },
    });

    return {
      success: true,
      message: `Palette ${paletteCode} entrée en chambre`,
      palette: updatedPalette,
    };
  } catch (error) {
    console.error('Error in entreePalette:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'entrée de la palette en chambre',
    };
  }
}

export async function startShift(data: FormData) {
  try {
    const userId = data.get('userId') as string;
    const shiftType = data.get('shiftType') as string;

    if (!userId || !shiftType) {
      return { success: false, error: 'Données manquantes' };
    }

    // Create shift record
    const shift = await prisma.chambreShift.create({
      data: {
        operatorMatricule: userId,
        chefTapis1: '',
        chefTapis2: '',
        chefTapis3: '',
        chefTapis4: '',
        startTime: new Date(),
        status: shiftType,
      },
    });

    return {
      success: true,
      message: 'Poste démarré avec succès',
      shift,
    };
  } catch (error) {
    console.error('Error in startShift:', error);
    return {
      success: false,
      error: 'Erreur lors du démarrage du poste',
    };
  }
}

export async function correctLastMovement(data: FormData) {
  try {
    const movementId = data.get('movementId') as string;
    const correctionReason = data.get('correctionReason') as string;
    const userId = data.get('userId') as string;

    if (!movementId || !correctionReason || !userId) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the movement
    const movement = await prisma.paletteMovement.findUnique({
      where: { id: movementId },
    });

    if (!movement) {
      return { success: false, error: 'Mouvement non trouvé' };
    }

    // Create correction record
    await prisma.auditLog.create({
      data: {
        userId: userId,
        userName: 'Correction',
        action: 'CORRECTION',
        entity: 'PaletteMovement',
        entityId: movement.id,
        details: `Correction: ${correctionReason}`,
      },
    });

    // Delete the incorrect movement
    await prisma.paletteMovement.delete({
      where: { id: movement.id },
    });

    return {
      success: true,
      message: 'Mouvement corrigé avec succès',
    };
  } catch (error) {
    console.error('Error in correctLastMovement:', error);
    return {
      success: false,
      error: 'Erreur lors de la correction du mouvement',
    };
  }
}
