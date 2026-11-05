<?php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-Bridge-Secret');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Dedicated Security Key for Meet Platform
$EXPECTED_SECRET = 'MeetAlize_Secure_Mail_2026_z9q2';

$headers = function_exists('getallheaders') ? getallheaders() : [];
$providedSecret = '';

if (isset($headers['X-Bridge-Secret'])) {
    $providedSecret = $headers['X-Bridge-Secret'];
} elseif (isset($headers['x-bridge-secret'])) {
    $providedSecret = $headers['x-bridge-secret'];
} elseif (isset($_SERVER['HTTP_X_BRIDGE_SECRET'])) {
    $providedSecret = $_SERVER['HTTP_X_BRIDGE_SECRET'];
}

if ($providedSecret !== $EXPECTED_SECRET) {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'message' => 'Unauthorized: Invalid Meet Bridge Secret'
    ]);
    exit;
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

if (!$input || empty($input['to'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required parameter: to'
    ]);
    exit;
}

$to = trim($input['to']);
$subject = !empty($input['subject']) ? trim($input['subject']) : 'Meet Notification';
$html = !empty($input['html']) ? $input['html'] : '';
$fromEmail = 'support@alizesoftwareservices.com';
$fromName = 'Meet';

// Zoho SMTP Configuration for Meet
$smtpHost = 'ssl://smtp.zoho.in';
$smtpPort = 465;
$smtpUser = 'support@alizesoftwareservices.com';
$smtpPass = 'fvjEwdTb6hLY';

function sendSmtpMail($host, $port, $user, $pass, $from, $fromName, $to, $subject, $html) {
    $timeout = 15;
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    if (!$socket) {
        throw new Exception("Could not connect to SMTP server: $errstr ($errno)");
    }

    $readResponse = function($expectedCode) use ($socket) {
        $response = '';
        while ($line = fgets($socket, 512)) {
            $response .= $line;
            if (substr($line, 3, 1) === ' ') break;
        }
        if (substr($response, 0, 3) !== $expectedCode) {
            throw new Exception("SMTP Error (Expected $expectedCode): $response");
        }
        return $response;
    };

    $readResponse('220');

    fputs($socket, "EHLO " . gethostname() . "\r\n");
    $readResponse('250');

    fputs($socket, "AUTH LOGIN\r\n");
    $readResponse('334');

    fputs($socket, base64_encode($user) . "\r\n");
    $readResponse('334');

    fputs($socket, base64_encode($pass) . "\r\n");
    $readResponse('235');

    fputs($socket, "MAIL FROM: <$from>\r\n");
    $readResponse('250');

    fputs($socket, "RCPT TO: <$to>\r\n");
    $readResponse('250');

    fputs($socket, "DATA\r\n");
    $readResponse('354');

    $messageId = sprintf("<meet.%s.%s@alizesoftwareservices.com>", time(), bin2hex(random_bytes(6)));

    $headers = [
        "MIME-Version: 1.0",
        "Content-Type: text/html; charset=UTF-8",
        "From: =?UTF-8?B?" . base64_encode($fromName) . "?= <$from>",
        "To: <$to>",
        "Subject: =?UTF-8?B?" . base64_encode($subject) . "?=",
        "Date: " . date('r'),
        "Message-ID: $messageId",
        "X-Mailer: Meet Mail Bridge 1.0"
    ];

    $content = implode("\r\n", $headers) . "\r\n\r\n" . $html . "\r\n.\r\n";
    fputs($socket, $content);
    $readResponse('250');

    fputs($socket, "QUIT\r\n");
    fclose($socket);

    return $messageId;
}

try {
    $msgId = sendSmtpMail($smtpHost, $smtpPort, $smtpUser, $smtpPass, $fromEmail, $fromName, $to, $subject, $html);
    echo json_encode([
        'success' => true,
        'message' => 'Email sent successfully via Zoho Mail',
        'messageId' => $msgId
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

