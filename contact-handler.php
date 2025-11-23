<?php
// تعيين رؤوس الاستجابة
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// إذا كان الطلب OPTIONS، أرسل استجابة فارغة
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// تحقق من أن الطلب هو POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'طريقة الطلب غير مسموحة']);
    exit;
}

// احصل على البيانات المرسلة
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// التحقق من البيانات المطلوبة
if (!$data || !isset($data['name'], $data['email'], $data['subject'], $data['message'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'البيانات المرسلة غير كاملة']);
    exit;
}

// تنظيف البيانات
$name = htmlspecialchars(trim($data['name']), ENT_QUOTES, 'UTF-8');
$sender_email = htmlspecialchars(trim($data['email']), ENT_QUOTES, 'UTF-8');
$subject = htmlspecialchars(trim($data['subject']), ENT_QUOTES, 'UTF-8');
$message = htmlspecialchars(trim($data['message']), ENT_QUOTES, 'UTF-8');

// التحقق من صيغة البريد الإلكتروني
if (!filter_var($sender_email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'البريد الإلكتروني غير صحيح']);
    exit;
}

// بيانات البريد الإلكتروني المستقبل
$recipient_email = 'ah2938@fayoum.edu.eg';
$email_subject = 'رسالة جديدة من موقع SMART AGRI: ' . $subject;

// بناء محتوى البريد الإلكتروني بصيغة HTML
$email_body = "
<!DOCTYPE html>
<html lang='ar' dir='rtl'>
<head>
    <meta charset='UTF-8'>
    <style>
        body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 8px; }
        .header { background: #38761d; color: white; padding: 15px; text-align: center; border-radius: 5px; }
        .content { background: white; padding: 20px; margin-top: 15px; border-radius: 5px; }
        .field { margin-bottom: 15px; }
        .label { font-weight: bold; color: #38761d; }
        .value { margin-top: 5px; padding: 10px; background: #f5f5f5; border-right: 3px solid #38761d; }
        .footer { margin-top: 15px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class='container'>
        <div class='header'>
            <h1>رسالة جديدة من موقع SMART AGRI</h1>
        </div>
        <div class='content'>
            <div class='field'>
                <div class='label'>اسم المرسل:</div>
                <div class='value'>{$name}</div>
            </div>
            <div class='field'>
                <div class='label'>البريد الإلكتروني:</div>
                <div class='value'><a href='mailto:{$sender_email}'>{$sender_email}</a></div>
            </div>
            <div class='field'>
                <div class='label'>الموضوع:</div>
                <div class='value'>{$subject}</div>
            </div>
            <div class='field'>
                <div class='label'>الرسالة:</div>
                <div class='value'>" . nl2br($message) . "</div>
            </div>
        </div>
        <div class='footer'>
            <p>هذه رسالة تلقائية من موقع SMART AGRI. يرجى عدم الرد على هذا البريد مباشرة.</p>
            <p>للرد على المرسل، استخدم البريد الإلكتروني المذكور أعلاه.</p>
        </div>
    </div>
</body>
</html>
";

// رؤوس البريد الإلكتروني
$headers = "MIME-Version: 1.0" . "\r\n";
$headers .= "Content-type: text/html; charset=UTF-8" . "\r\n";
$headers .= "From: " . $sender_email . "\r\n";
$headers .= "Reply-To: " . $sender_email . "\r\n";

// محاولة إرسال البريد الإلكتروني
try {
    $mail_sent = @mail($recipient_email, $email_subject, $email_body, $headers);
    
    if ($mail_sent) {
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'تم إرسال رسالتك بنجاح! سنتواصل معك قريباً.'
        ]);
    } else {
        // إذا فشل الإرسال، حفظ الرسالة في ملف كنسخة احتياطية
        $backup_dir = __DIR__ . '/messages';
        if (!is_dir($backup_dir)) {
            mkdir($backup_dir, 0755, true);
        }
        
        $backup_file = $backup_dir . '/message_' . time() . '.json';
        $backup_data = [
            'name' => $name,
            'email' => $sender_email,
            'subject' => $subject,
            'message' => $message,
            'timestamp' => date('Y-m-d H:i:s')
        ];
        
        file_put_contents($backup_file, json_encode($backup_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
        
        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'تم استقبال رسالتك بنجاح! سيتم التواصل معك قريباً.'
        ]);
    }
} catch (Exception $e) {
    // إذا حدث استثناء، حفظ الرسالة في ملف
    $backup_dir = __DIR__ . '/messages';
    if (!is_dir($backup_dir)) {
        mkdir($backup_dir, 0755, true);
    }
    
    $backup_file = $backup_dir . '/message_' . time() . '.json';
    $backup_data = [
        'name' => $name,
        'email' => $sender_email,
        'subject' => $subject,
        'message' => $message,
        'timestamp' => date('Y-m-d H:i:s'),
        'error' => $e->getMessage()
    ];
    
    file_put_contents($backup_file, json_encode($backup_data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
    
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'تم استقبال رسالتك بنجاح! سيتم التواصل معك قريباً.'
    ]);
}

exit;
?>
