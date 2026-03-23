import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('[register] JSON parse error:', parseError);
      return NextResponse.json({ error: 'Format JSON invalide' }, { status: 400 });
    }

    const { matricule, email, password, name, role } = body;
    const cleanEmail = email && email.trim() !== '' ? email.trim() : null;

    console.log('[register] Received:', { matricule, email, name, role });

    if (!matricule || !password || !name || !role) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 });
    }

    // Check if user exists
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { matricule },
          email ? { email } : {},
        ],
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'L\'utilisateur existe déjà' }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        matricule,
        email,
        password: hashedPassword,
        name,
        role,
        isApproved: role === 'SUPER_ADMIN_IT' || (await prisma.user.count()) === 0,
      },
    });

    return NextResponse.json({
      message: 'Inscription réussie. En attente d\'approbation.',
      user: { id: user.id, matricule: user.matricule, name: user.name }
    }, { status: 201 });
  } catch (error) {
    console.error('[register]', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: 'Erreur interne du serveur: ' + errorMessage }, { status: 500 });
  }
}
