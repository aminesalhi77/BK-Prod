import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
    try {
        const { paletteCode, ligneId, operatorMatricule, timestamp } = await request.json();

        // Validate required fields
        if (!paletteCode || !ligneId || !operatorMatricule) {
            return NextResponse.json({
                error: 'Données manquantes: code palette, ligne ou matricule opérateur requis'
            }, { status: 400 });
        }

        // Validate line ID format
        const validLines = ['1', '2', '3', '4', '5', 'MANUEL'];
        if (!validLines.includes(ligneId)) {
            return NextResponse.json({
                error: `Ligne invalide. Lignes valides: ${validLines.join(', ')}`
            }, { status: 400 });
        }

        // Get operator info from auth or use provided matricule
        let cheffeMatricule = operatorMatricule;
        if (!cheffeMatricule) {
            const authHeader = request.headers.get('Authorization');
            if (authHeader?.startsWith('Bearer ')) {
                const payload = await verifyToken(authHeader.substring(7));
                cheffeMatricule = (payload.matricule as string) || 'SYSTEM';
            }
        }

        const palette = await prisma.palette.findUnique({
            where: { code: paletteCode }
        });

        if (!palette) {
            return NextResponse.json({ error: 'Palette introuvable' }, { status: 404 });
        }

        // Enhanced validation: Palette must come from Chambre 0
        if (palette.status === 'CONSUMED') {
            return NextResponse.json({ error: 'Palette déjà consommée' }, { status: 400 });
        }

        if (palette.status !== 'SENT_TO_LIGNE' && palette.status !== 'IN_CHAMBRE') {
            return NextResponse.json({
                error: `Palette non disponible depuis Chambre 0 (statut: ${palette.status})`
            }, { status: 400 });
        }

        // Validate that palette is assigned to current line (if assigned)
        if (palette.destinationLine && palette.destinationLine !== ligneId) {
            return NextResponse.json({
                error: `Palette assignée à la ligne ${palette.destinationLine}, pas à la ligne ${ligneId}`
            }, { status: 400 });
        }

        // Update palette status and record line entry with enhanced data
        await prisma.$transaction([
            prisma.palette.update({
                where: { code: paletteCode },
                data: {
                    status: 'CONSUMED',
                    destinationLine: ligneId,
                    movements: {
                        create: {
                            fromStation: `CHAMBRE_0`,
                            toStation: `LIGNE_${ligneId}`,
                            workerMatricule: cheffeMatricule,
                            notes: `Consommation sur ligne ${ligneId} par ${cheffeMatricule}`,
                            timestamp: new Date(timestamp || Date.now())
                        }
                    }
                }
            }),
            prisma.lineEntry.create({
                data: {
                    paletteId: palette.id,
                    ligneId: ligneId,
                    cheffeMatricule: cheffeMatricule,
                    article: palette.article,
                    weightKg: palette.weightKg,
                    timestamp: new Date(timestamp || Date.now())
                }
            })
        ]);

        return NextResponse.json({
            success: true,
            message: `Palette ${paletteCode} consommée sur ligne ${ligneId}`,
            data: {
                paletteCode: paletteCode,
                ligneId: ligneId,
                operatorMatricule: cheffeMatricule,
                article: palette.article,
                weightKg: palette.weightKg,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('[ligne-entree]', error);
        return NextResponse.json({
            error: 'Erreur lors de la consommation de la palette',
            details: error instanceof Error ? error.message : 'Erreur inconnue'
        }, { status: 500 });
    }
}
