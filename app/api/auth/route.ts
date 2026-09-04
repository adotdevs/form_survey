import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/mongodb';

const AUTH_COOKIE = 'irs_admin_session';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    const settings = await getSystemSettings();
    const currentAdminPassword = settings.admin_password || process.env.ADMIN_PASSWORD || 'admin2026';

    if (password === currentAdminPassword) {
      const response = NextResponse.json({ success: true });
      response.cookies.set(AUTH_COOKIE, 'authenticated_' + Date.now(), {
        httpOnly: true,
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
      });
      return response;
    }

    return NextResponse.json(
      { success: false, error: 'Invalid admin password' },
      { status: 401 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Authentication error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE);
  const isAuthenticated = Boolean(cookie && cookie.value.startsWith('authenticated_'));

  return NextResponse.json({ authenticated: isAuthenticated });
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE);
  return response;
}
