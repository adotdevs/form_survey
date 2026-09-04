import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings } from '@/lib/mongodb';
import { sendTestEmail } from '@/lib/mailer';

const AUTH_COOKIE = 'irs_admin_session';

export async function POST(req: NextRequest) {
  const cookie = req.cookies.get(AUTH_COOKIE);
  if (!cookie || !cookie.value || !cookie.value.startsWith('authenticated_')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const current = await getSystemSettings();

    // Merge incoming test configuration with existing password if unchanged
    const passToUse =
      body.email_config?.smtp_pass && body.email_config.smtp_pass !== '••••••••'
        ? body.email_config.smtp_pass
        : current.email_config.smtp_pass;

    const configToTest = {
      ...current.email_config,
      ...(body.email_config || {}),
      smtp_pass: passToUse,
    };

    const targetEmail = body.target_email || configToTest.recipient_email || configToTest.smtp_user;

    const result = await sendTestEmail(configToTest, targetEmail);

    if (result.success) {
      return NextResponse.json({ success: true, message: result.message });
    } else {
      return NextResponse.json({ success: false, error: result.message }, { status: 400 });
    }
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Server error' }, { status: 500 });
  }
}
