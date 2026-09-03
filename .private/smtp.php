<?php
/**
 * ==============================================================================
 * STANDALONE LIGHTWEIGHT SMTP CLIENT FOR HOSTINGER & WEBMAIL
 * ==============================================================================
 * Zero external dependencies. Works out of the box on Hostinger, cPanel, Gmail,
 * Outlook, and any standard SMTP server using SSL or TLS.
 * ==============================================================================
 */

class SimpleSMTP
{
    private $host;
    private $port;
    private $secure;
    private $user;
    private $pass;
    private $timeout;
    public  $error = '';
    public  $debugLog = [];

    public function __construct(string $host, int $port, string $secure, string $user, string $pass, int $timeout = 15)
    {
        $this->host    = $host;
        $this->port    = $port;
        $this->secure  = strtolower($secure);
        $this->user    = $user;
        $this->pass    = $pass;
        $this->timeout = $timeout;
    }

    private function log($msg)
    {
        $this->debugLog[] = $msg;
    }

    private function getResponse($socket)
    {
        $response = '';
        while (($line = fgets($socket, 515)) !== false) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') {
                break;
            }
        }
        $this->log("SERVER: " . trim($response));
        return $response;
    }

    private function sendCommand($socket, $cmd, $expectedCode)
    {
        $this->log("CLIENT: " . (preg_match('/^AUTH|PASS/i', $cmd) ? '***HIDDEN***' : trim($cmd)));
        fputs($socket, $cmd . "\r\n");
        $res = $this->getResponse($socket);
        $code = substr($res, 0, 3);
        if ($code !== (string)$expectedCode) {
            $this->error = "SMTP command failed. Expected $expectedCode but got $code: " . trim($res);
            return false;
        }
        return true;
    }

    public function send(string $to, string $fromEmail, string $fromName, string $subject, string $htmlBody): bool
    {
        $this->error = '';
        $this->debugLog = [];

        $socketPrefix = '';
        if ($this->secure === 'ssl' || $this->port === 465) {
            $socketPrefix = 'ssl://';
        }

        $remoteSocket = $socketPrefix . $this->host . ':' . $this->port;
        $this->log("Connecting to $remoteSocket...");

        $context = stream_context_create([
            'ssl' => [
                'verify_peer'       => false,
                'verify_peer_name'  => false,
                'allow_self_signed' => true
            ]
        ]);

        $socket = @stream_socket_client($remoteSocket, $errno, $errstr, $this->timeout, STREAM_CLIENT_CONNECT, $context);
        if (!$socket) {
            $this->error = "Could not connect to SMTP host {$this->host}:{$this->port} ($errno: $errstr)";
            return false;
        }

        stream_set_timeout($socket, $this->timeout);
        $greet = $this->getResponse($socket);
        if (substr($greet, 0, 3) !== '220') {
            $this->error = "Invalid SMTP greeting: " . trim($greet);
            fclose($socket);
            return false;
        }

        $helloHost = !empty($_SERVER['HTTP_HOST']) ? preg_replace('/:[0-9]+$/', '', $_SERVER['HTTP_HOST']) : 'localhost';
        if (!$this->sendCommand($socket, "EHLO " . $helloHost, 250)) {
            if (!$this->sendCommand($socket, "HELO " . $helloHost, 250)) {
                fclose($socket);
                return false;
            }
        }

        // Handle STARTTLS for Port 587
        if ($this->secure === 'tls' || ($this->port === 587 && $socketPrefix === '')) {
            if ($this->sendCommand($socket, "STARTTLS", 220)) {
                $crypto = @stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                if (!$crypto) {
                    $this->error = "Failed to establish TLS encryption.";
                    fclose($socket);
                    return false;
                }
                // Resend EHLO after TLS handshake
                if (!$this->sendCommand($socket, "EHLO " . $helloHost, 250)) {
                    fclose($socket);
                    return false;
                }
            }
        }

        // Authenticate
        if (!empty($this->user)) {
            if (!$this->sendCommand($socket, "AUTH LOGIN", 334)) {
                fclose($socket);
                return false;
            }
            if (!$this->sendCommand($socket, base64_encode($this->user), 334)) {
                $this->error = "SMTP Username authentication rejected: " . $this->error;
                fclose($socket);
                return false;
            }
            if (!$this->sendCommand($socket, base64_encode($this->pass), 235)) {
                $this->error = "SMTP Password authentication rejected: " . $this->error;
                fclose($socket);
                return false;
            }
        }

        // Mail transaction
        if (!$this->sendCommand($socket, "MAIL FROM: <" . $fromEmail . ">", 250)) {
            fclose($socket);
            return false;
        }

        if (!$this->sendCommand($socket, "RCPT TO: <" . $to . ">", 250)) {
            fclose($socket);
            return false;
        }

        if (!$this->sendCommand($socket, "DATA", 354)) {
            fclose($socket);
            return false;
        }

        // Build RFC 2822 email payload
        $boundary = "----=_NextPart_" . md5(uniqid(mt_rand(), true));
        $headers  = "From: " . "=?UTF-8?B?" . base64_encode($fromName) . "?= <" . $fromEmail . ">\r\n";
        $headers .= "To: <" . $to . ">\r\n";
        $headers .= "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=\r\n";
        $headers .= "Date: " . date('r') . "\r\n";
        $headers .= "MIME-Version: 1.0\r\n";
        $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
        $headers .= "Content-Transfer-Encoding: base64\r\n";
        $headers .= "X-Mailer: IRS Portal Secure SMTP\r\n";

        // Dot-stuffing and base64 encoding body
        $encodedBody = chunk_split(base64_encode($htmlBody));
        $fullMessage = $headers . "\r\n" . $encodedBody . "\r\n.";

        fputs($socket, $fullMessage . "\r\n");
        $res = $this->getResponse($socket);
        if (substr($res, 0, 3) !== '250') {
            $this->error = "Failed sending email data: " . trim($res);
            fclose($socket);
            return false;
        }

        $this->sendCommand($socket, "QUIT", 221);
        fclose($socket);
        return true;
    }
}
