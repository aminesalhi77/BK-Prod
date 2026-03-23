'use server';

import prisma from '@/lib/prisma';
import { WorkflowNotificationService } from '@/lib/workflow-notifications';
import { UserRole, PaletteStatus, ChariotStatus } from '@prisma/client';

export async function sortieChariot(data: FormData) {
  try {
    const chariotCode = data.get('chariotCode') as string;
    const userId = data.get('userId') as string;
    const ligneId = data.get('ligneId') as string;

    if (!chariotCode || !userId || !ligneId) {
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

    // Create line entry record
    await prisma.lineEntry.create({
      data: {
        paletteId: chariot.paletteId!,
        ligneId: ligneId,
        cheffeMatricule: userId,
        article: chariot.article,
        weightKg: chariot.estimatedWeight || 0,
      },
    });

    // Trigger notification for the next step
    await WorkflowNotificationService.triggerWorkflowNotification('CHARIOT_EXIT', {
      chariotCode,
      chariotId: chariot.id,
    });

    return {
      success: true,
      message: `Chariot ${chariotCode} prêt pour l\'autoclave`,
      chariot: updatedChariot,
    };
  } catch (error) {
    console.error('Error in sortieChariot:', error);
    return {
      success: false,
      error: 'Erreur lors de la sortie du chariot',
    };
  }
}

export async function entreePalette(data: FormData) {
  try {
    const paletteCode = data.get('paletteCode') as string;
    const ligneId = data.get('ligneId') as string;
    const userId = data.get('userId') as string;

    if (!paletteCode || !ligneId || !userId) {
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
        status: PaletteStatus.IN_LIGNE,
        ligneId: ligneId,
        ligneWorkerId: userId,
      },
    });

    // Create movement record
    await prisma.paletteMovement.create({
      data: {
        paletteId: palette.id,
        fromStation: 'CHAMBRE',
        toStation: 'LIGNE',
        workerMatricule: userId,
        notes: `Entrée en ligne ${ligneId}`,
      },
    });

    return {
      success: true,
      message: `Palette ${paletteCode} entrée en ligne ${ligneId}`,
      palette: updatedPalette,
    };
  } catch (error) {
    console.error('Error in entreePalette:', error);
    return {
      success: false,
      error: 'Erreur lors de l\'entrée de la palette en ligne',
    };
  }
}

export async function startVisuel(data: FormData) {
  try {
    const paletteCode = data.get('paletteCode') as string;
    const userId = data.get('userId') as string;
    const ligneId = data.get('ligneId') as string;
    const positionNumber = parseInt(data.get('positionNumber') as string);
    const positionZone = data.get('positionZone') as string;
    const longeType = data.get('longeType') as string;

    if (!paletteCode || !userId || !ligneId || !positionNumber || !positionZone || !longeType) {
      return { success: false, error: 'Données manquantes' };
    }

    // Find the palette
    const palette = await prisma.palette.findUnique({
      where: { code: paletteCode },
    });

    if (!palette) {
      return { success: false, error: 'Palette non trouvée' };
    }

    if (palette.status !== PaletteStatus.IN_LIGNE) {
      return { success: false, error: 'La palette n\'est pas en ligne' };
    }

    // Update palette with visuel information
    const updatedPalette = await prisma.palette.update({
      where: { id: palette.id },
      data: {
        positionNumber: positionNumber,
        positionZone: positionZone,
        longeType: longeType,
      },
    });

    return {
      success: true,
      message: `Visuel démarré pour la palette ${paletteCode}`,
      palette: updatedPalette,
    };
  } catch (error) {
    console.error('Error in startVisuel:', error);
    return {
      success: false,
      error: 'Erreur lors du démarrage du visuel',
    };
  }
}