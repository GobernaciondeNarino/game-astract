<?php
/**
 * Envío de correo con PHPMailer a través de una cuenta de Gmail
 * (contraseña de aplicación). Configurable en /wj-admin/wj-mail-config.php.
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as PHPMailerException;

function wj_mailer_load(): void
{
    if (class_exists('PHPMailer\\PHPMailer\\PHPMailer')) {
        return;
    }
    $base = WJ_INCLUDES_DIR . '/vendor/phpmailer/';
    require_once $base . 'Exception.php';
    require_once $base . 'PHPMailer.php';
    require_once $base . 'SMTP.php';
}

/**
 * Crea una instancia configurada de PHPMailer.
 */
function wj_mailer_create(array $settings): PHPMailer
{
    wj_mailer_load();
    $mail = new PHPMailer(true);
    $mail->CharSet = PHPMailer::CHARSET_UTF8;
    $mail->isSMTP();
    $mail->Host = $settings['smtp_host'];
    $mail->Port = (int) $settings['smtp_port'];
    $mail->SMTPAuth = true;
    $mail->Username = $settings['smtp_user'];
    $mail->Password = $settings['smtp_pass'];
    if ($settings['smtp_secure'] === 'ssl') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
    } elseif ($settings['smtp_secure'] === 'tls') {
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
    } else {
        $mail->SMTPSecure = '';
        $mail->SMTPAutoTLS = false;
    }
    $mail->Timeout = 20;
    $mail->setFrom($settings['smtp_user'], $settings['from_name'] ?: WJ_ENTITY_NAME);
    if (!empty($settings['reply_to']) && filter_var($settings['reply_to'], FILTER_VALIDATE_EMAIL)) {
        $mail->addReplyTo($settings['reply_to']);
    }
    return $mail;
}

/**
 * Envía el diploma como adjunto. Devuelve ['ok'=>bool, 'error'=>string|null].
 */
function wj_send_diploma(string $to, string $name, int $level, string $levelName, string $fileBinary, string $fileName, string $mime): array
{
    $settings = wj_get_mail_settings();
    if (!wj_mail_ready()) {
        return ['ok' => false, 'error' => 'El envío de correo no está configurado.'];
    }
    try {
        $site = wj_get_site_settings();
        $mail = wj_mailer_create($settings);
        $mail->addAddress($to, $name);
        $mail->Subject = $settings['subject'] ?: ('Tu diploma del ' . $site['site_name']);
        $mail->addStringAttachment($fileBinary, $fileName, PHPMailer::ENCODING_BASE64, $mime);
        $safeName = wj_e($name);
        $safeLevel = wj_e($levelName);
        $entity = wj_e($site['entity_name']);
        $siteName = wj_e($site['site_name']);
        $mail->isHTML(true);
        $mail->Body = '
            <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;background:#fffcf3;padding:32px;border:1px solid #348afb;border-radius:16px;color:#0b1f3a">
              <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#348afb;margin:0 0 8px">' . $entity . '</p>
              <h1 style="font-size:24px;margin:0 0 16px">¡Felicitaciones, ' . $safeName . '!</h1>
              <p style="font-size:16px;line-height:1.5">Completaste el <strong>Nivel ' . $level . ' — ' . $safeLevel . '</strong> del reto «' . $siteName . '».
              Adjuntamos tu diploma en formato PDF.</p>
              <p style="font-size:13px;color:#4a4a4a">Este mensaje se generó automáticamente. Si no participaste en el reto, puedes ignorarlo.</p>
            </div>';
        $mail->AltBody = "¡Felicitaciones, {$name}! Completaste el Nivel {$level} — {$levelName} del reto «{$site['site_name']}». Adjuntamos tu diploma.";
        $mail->send();
        return ['ok' => true, 'error' => null];
    } catch (PHPMailerException $e) {
        return ['ok' => false, 'error' => 'No se pudo enviar el correo: ' . $e->getMessage()];
    } catch (\Throwable $e) {
        return ['ok' => false, 'error' => 'Error inesperado al enviar el correo.'];
    }
}

/** Envía un correo de prueba desde el panel. */
function wj_send_test_mail(string $to): array
{
    $settings = wj_get_mail_settings();
    if ($settings['smtp_user'] === '' || $settings['smtp_pass'] === '') {
        return ['ok' => false, 'error' => 'Complete el usuario y la contraseña de aplicación antes de probar.'];
    }
    try {
        $mail = wj_mailer_create($settings);
        $mail->addAddress($to);
        $mail->Subject = 'Prueba de correo — ' . WJ_SITE_NAME;
        $mail->Body = 'La configuración SMTP de ' . WJ_SITE_NAME . ' funciona correctamente. Enviado el ' . date('Y-m-d H:i:s') . '.';
        $mail->send();
        return ['ok' => true, 'error' => null];
    } catch (PHPMailerException $e) {
        return ['ok' => false, 'error' => $e->getMessage()];
    } catch (\Throwable $e) {
        return ['ok' => false, 'error' => 'Error inesperado: ' . $e->getMessage()];
    }
}
