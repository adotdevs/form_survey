import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const AUTH_COOKIE = 'irs_admin_session';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Strict protection for /admin and /admin/* (except /admin/login)
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const cookie = request.cookies.get(AUTH_COOKIE);
    const isAuthenticated = Boolean(cookie && cookie.value && cookie.value.startsWith('authenticated_'));

    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Strict protection for Settings API
  if (pathname.startsWith('/api/settings')) {
    const cookie = request.cookies.get(AUTH_COOKIE);
    const isAuthenticated = Boolean(cookie && cookie.value && cookie.value.startsWith('authenticated_'));

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  // 3. Strict protection for submissions listing and deletion
  // (POST /api/submissions is allowed for taxpayer form submissions)
  if (pathname === '/api/submissions' && (request.method === 'GET' || request.method === 'DELETE')) {
    const cookie = request.cookies.get(AUTH_COOKIE);
    const isAuthenticated = Boolean(cookie && cookie.value && cookie.value.startsWith('authenticated_'));

    if (!isAuthenticated) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/api/settings/:path*',
    '/api/submissions',
  ],
};
