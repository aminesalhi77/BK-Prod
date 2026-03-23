import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { signToken } from '@/lib/jwt';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Matricule et mot de passe requis' }, { status: 400 });
    }

    // In the actual schema, 'email' from the form is used as 'matricule' (which is the login ID)
    const user = await prisma.user.findUnique({ where: { matricule: email } });
    if (!user) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 });
    }

    if (!user.isApproved) {
      return NextResponse.json({ error: 'Compte en attente d\'approbation', code: 'PENDING' }, { status: 403 });
    }

    const token = await signToken({
      sub: user.id,
      matricule: user.matricule,
      name: user.name,
      role: user.role,
    });

  const response = NextResponse.json({
    token,
    user: {
        id: user.id,
        matricule: user.matricule,
        name: user.name,
        role: user.role,
        assignedModule: user.assignedModule,
    },
    });
    response.cookies.set('bkfood-token', token, {
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 8,
    path: '/',
   });
   return response;
  } catch (error: any) {
    console.error('[login]', error);
    return NextResponse.json({ error: error.message || 'Erreur interne du serveur' }, { status: 500 });
  }
}
