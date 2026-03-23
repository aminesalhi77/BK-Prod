import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { code: string } }
) {
  const { code } = params;

  try {
    // Detect prefix to determine the type
    let lifecycle: any = null;
    let found = false;

    if (code.startsWith('PAL-')) {
      // Start from Palette
      const palette = await prisma.palette.findUnique({
        where: { code },
        include: {
          movements: { orderBy: { timestamp: 'asc' } },
          lineEntries: true
        }
      });

      if (palette) {
        found = true;
        lifecycle = {
          palette: {
            code: palette.code,
            batchCode: palette.batchCode,
            species: palette.species,
            article: palette.article,
            weightKg: palette.weightKg,
            origin: palette.origin,
            status: palette.status,
            positionZone: palette.positionZone,
            positionNumber: palette.positionNumber,
            entryTime: palette.entryTime,
            exitTime: palette.exitTime,
            operatorMatricule: palette.chambreWorkerId,
            notes: palette.notes
          },
          ligneEntry: palette.lineEntries.length > 0 ? {
            ligneId: palette.lineEntries[0].ligneId,
            cheffeMatricule: palette.lineEntries[0].cheffeMatricule,
            article: palette.lineEntries[0].article,
            weightKg: palette.lineEntries[0].weightKg,
            timestamp: palette.lineEntries[0].timestamp
          } : null,
          chariot: null,
          sterilization: null,
          emballage: null,
          parageRef: {
            ticketCode: palette.batchCode,
            note: "Référence externe parage — non géré par ce système"
          }
        };
      }
    } else if (code.startsWith('CHR-')) {
      // Start from Chariot
      const chariot = await prisma.chariot.findUnique({
        where: { code },
        include: {
          autoclaveCycles: true
        }
      });

      if (chariot) {
        found = true;
        lifecycle = {
          palette: null,
          ligneEntry: null,
          chariot: {
            code: chariot.code,
            numero: chariot.numero,
            article: chariot.article,
            boxCount: chariot.boxCount,
            estimatedWeight: chariot.estimatedWeight,
            ligneId: chariot.ligneId,
            cheffeMatricule: chariot.cheffeMatricule
          },
          sterilization: null,
          emballage: null,
          parageRef: null
        };
      }
    } else if (code.startsWith('STR-')) {
      // Start from SterilizationTicket
      const sterilizationTicket = await prisma.sterilizationTicket.findUnique({
        where: { code },
        include: {
          packagingRecord: true,
          cycle: {
            include: {
              chariots: {
                include: {
                  chariot: true
                }
              }
            }
          }
        }
      });

      if (sterilizationTicket) {
        found = true;
        lifecycle = {
          palette: null,
          ligneEntry: null,
          chariot: sterilizationTicket.cycle?.chariots[0]?.chariot ? {
            code: sterilizationTicket.cycle.chariots[0].chariot.code,
            numero: sterilizationTicket.cycle.chariots[0].chariot.numero,
            article: sterilizationTicket.cycle.chariots[0].chariot.article,
            boxCount: sterilizationTicket.cycle.chariots[0].chariot.boxCount,
            estimatedWeight: sterilizationTicket.cycle.chariots[0].chariot.estimatedWeight,
            ligneId: sterilizationTicket.cycle.chariots[0].chariot.ligneId,
            cheffeMatricule: sterilizationTicket.cycle.chariots[0].chariot.cheffeMatricule
          } : null,
          sterilization: {
            code: sterilizationTicket.code,
            autoclaveId: sterilizationTicket.cycle?.autoclaveId,
            startTime: sterilizationTicket.cycle?.startTime,
            endTime: sterilizationTicket.cycle?.endTime,
            durationMinutes: sterilizationTicket.cycle?.actualDurationMin,
            conducteurMatricule: sterilizationTicket.cycle?.conducteurMatricule,
            assistantMatricule: sterilizationTicket.cycle?.assistantMatricule
          },
          emballage: sterilizationTicket.packagingRecord ? {
            recordedAt: sterilizationTicket.packagingRecord.startTime,
            cheffeMatricule: sterilizationTicket.packagingRecord.cheffeMatricule,
            article: sterilizationTicket.cycle?.chariots[0]?.chariot?.article,
            totalBoxes: sterilizationTicket.packagingRecord.actualBoxCount
          } : null,
          parageRef: null
        };
      }
    }

    if (!found) {
      return NextResponse.json({ found: false });
    }

    // Calculate completed steps
    const steps = [
      lifecycle.palette,
      lifecycle.ligneEntry,
      lifecycle.sterilization,
      lifecycle.emballage
    ];
    const completedSteps = steps.filter(step => step !== null).length;
    const totalSteps = 4;

    return NextResponse.json({
      found: true,
      searchedCode: code,
      completedSteps,
      totalSteps,
      lifecycle
    });
  } catch (error) {
    console.error('Error fetching traceability data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
