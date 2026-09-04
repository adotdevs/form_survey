import { NextRequest, NextResponse } from 'next/server';
import { getSystemSettings, updateSystemSettings, isMongoConnected } from '@/lib/mongodb';

const AUTH_COOKIE = 'irs_admin_session';

function isAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get(AUTH_COOKIE);
  return Boolean(cookie && cookie.value && cookie.value.startsWith('authenticated_'));
}

export async function GET(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const settings = await getSystemSettings();
    const mongoStatus = await isMongoConnected();

    // Mask the password for safety in UI display
    const maskedPass = settings.email_config.smtp_pass
      ? '••••••••'
      : '';

    return NextResponse.json({
      success: true,
      settings: {
        email_config: {
          ...settings.email_config,
          smtp_pass: maskedPass,
          has_pass: Boolean(settings.email_config.smtp_pass),
        },
        mongo_connected: mongoStatus,
        updated_at: settings.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthenticated(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const current = await getSystemSettings();

    const updates: any = {};

    // 1. If updating Admin Password
    if (body.new_admin_password) {
      if (!body.current_admin_password) {
        return NextResponse.json(
          { success: false, error: 'Current admin password is required to set a new password' },
          { status: 400 }
        );
      }

      if (body.current_admin_password !== current.admin_password) {
        return NextResponse.json(
          { success: false, error: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      if (body.new_admin_password.length < 4) {
        return NextResponse.json(
          { success: false, error: 'New password must be at least 4 characters' },
          { status: 400 }
        );
      }

      updates.admin_password = body.new_admin_password;
    }

    // 2. If updating Email Configuration
    if (body.email_config) {
      const ec = body.email_config;
      // If user typed a new password (not masked '••••••••'), update it; otherwise preserve existing
      const passToSave =
        ec.smtp_pass && ec.smtp_pass !== '••••••••'
          ? ec.smtp_pass
          : current.email_config.smtp_pass;

      updates.email_config = {
        enabled: Boolean(ec.enabled),
        smtp_host: (ec.smtp_host || 'smtp.gmail.com').trim(),
        smtp_port: Number(ec.smtp_port) || 587,
        smtp_secure: Boolean(ec.smtp_secure),
        smtp_user: (ec.smtp_user || '').trim(),
        smtp_pass: passToSave,
        recipient_email: (ec.recipient_email || '').trim() || (ec.smtp_user || '').trim(),
        sender_name: (ec.sender_name || 'IRS Digital Asset Verification Portal').trim(),
      };
    }

    const saved = await updateSystemSettings(updates);
    const mongoStatus = await isMongoConnected();

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully in database!',
      settings: {
        email_config: {
          ...saved.email_config,
          smtp_pass: saved.email_config.smtp_pass ? '••••••••' : '',
          has_pass: Boolean(saved.email_config.smtp_pass),
        },
        mongo_connected: mongoStatus,
        updated_at: saved.updated_at,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
