import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'bkfood-dev-secret-please-change-in-production'
);

// Public routes — no token needed
const PUBLIC_PATHS = ['/', '/register', '/pending-approval'];

// Role-based access rules
const ROLE_PATHS: Record<string, string[]> = {
  '/admin': ['SUPER_ADMIN_IT', 'SUPER_ADMIN'],
  '/dashboard/admin': ['ADMIN_PRODUCTION', 'ADMIN'],
  '/dashboard/super-admin': ['SUPER_ADMIN_IT', 'SUPER_ADMIN'],
  '/chambre': ['WORKER', 'ADMIN', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT', 'SUPER_ADMIN'],
'/ligne': ['WORKER', 'CHEF_LIGNE', 'CHEFFE_TAPIS', 'ADMIN', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT', 'SUPER_ADMIN'],
  '/autoclave': ['WORKER', 'ADMIN', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT', 'SUPER_ADMIN'],
  '/emballage': ['WORKER','RESPONSABLE_CONDITIONNEMENT', 'ADMIN', 'ADMIN_PRODUCTION', 'SUPER_ADMIN_IT', 'SUPER_ADMIN'],
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths and API routes through
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/public/')
  ) {
    return NextResponse.next();
  }

  // Get token from cookie
  const token = request.cookies.get('bkfood-token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const role = payload.role as string;

    // Check role-based access
    for (const [path, allowedRoles] of Object.entries(ROLE_PATHS)) {
      if (pathname.startsWith(path) && !allowedRoles.includes(role)) {
        return NextResponse.redirect(new URL('/', request.url));
      }
    }

    return NextResponse.next();
  } catch {
    // Token invalid or expired — clear cookie and redirect to login
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.delete('bkfood-token');
    return response;
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo-bk.svg|manifest.json).*)'],
};