<?php
/**
 * wj-api.php — API JSON del juego.
 *
 *  GET  wj-api.php?action=config       Configuración pública.
 *  GET  wj-api.php?action=leaderboard  Top 10 de participantes.
 *  POST wj-api.php?action=score        Registra un resultado {name, score, time, levels}.
 *  POST wj-api.php?action=diploma      Envía el diploma por correo {name, email, level, levelName, file, fileName, mime}.
 */

require_once __DIR__ . '/wj-load.php';

header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

switch ($action) {
    case 'config':
        $site = wj_get_site_settings();
        $logo = $site['logo'] ? 'wj-content/uploads/' . rawurlencode($site['logo']) : '';
        wj_json([
            'ok' => true,
            'siteName' => $site['site_name'],
            'entityName' => $site['entity_name'],
            'entityArea' => $site['entity_area'],
            'signerName' => $site['signer_name'],
            'signerRole' => $site['signer_role'],
            'logoUrl' => $logo,
            'mailEnabled' => wj_mail_ready(),
            'levels' => WJ_LEVELS,
            'questionsPerLevel' => WJ_QUESTIONS_PER_LEVEL,
            'bankPerLevel' => WJ_BANK_PER_LEVEL,
            'pointsPerAnswer' => WJ_POINTS_PER_ANSWER,
            'leaderboardSize' => WJ_LEADERBOARD_SIZE,
            'version' => WJ_VERSION,
        ]);
        break;

    case 'leaderboard':
        wj_json(['ok' => true, 'top' => wj_leaderboard_top()]);
        break;

    case 'score':
        if ($method !== 'POST') {
            wj_json(['ok' => false, 'error' => 'Método no permitido.'], 405);
        }
        if (!wj_rate_limit('score:' . wj_client_ip(), 30, 600)) {
            wj_json(['ok' => false, 'error' => 'Demasiados envíos. Intente más tarde.'], 429);
        }
        $in = wj_json_input(64 * 1024);
        $name = wj_clean_name((string) ($in['name'] ?? ''));
        $score = (int) ($in['score'] ?? -1);
        $time = (int) ($in['time'] ?? -1);
        $levels = (int) ($in['levels'] ?? 0);
        if (wj_strlen($name) < 2) {
            wj_json(['ok' => false, 'error' => 'Nombre inválido.'], 422);
        }
        if ($score < 0 || $score > wj_max_score() || $score % WJ_POINTS_PER_ANSWER !== 0) {
            wj_json(['ok' => false, 'error' => 'Puntaje inválido.'], 422);
        }
        if ($time < 1 || $time > 86400) {
            wj_json(['ok' => false, 'error' => 'Tiempo inválido.'], 422);
        }
        if ($levels < 0 || $levels > WJ_LEVELS) {
            wj_json(['ok' => false, 'error' => 'Niveles inválidos.'], 422);
        }
        $result = wj_leaderboard_add($name, $score, $time, $levels);
        wj_json(['ok' => true, 'rank' => $result['rank'], 'top' => $result['top']]);
        break;

    case 'diploma':
        if ($method !== 'POST') {
            wj_json(['ok' => false, 'error' => 'Método no permitido.'], 405);
        }
        if (!wj_mail_ready()) {
            wj_json(['ok' => false, 'error' => 'El envío por correo no está habilitado. Descarga el diploma.'], 503);
        }
        if (!wj_rate_limit('mail:' . wj_client_ip(), WJ_MAIL_RATE_LIMIT, WJ_MAIL_RATE_WINDOW)) {
            wj_json(['ok' => false, 'error' => 'Has alcanzado el límite de envíos. Intenta en unos minutos.'], 429);
        }
        $in = wj_json_input(WJ_MAX_UPLOAD_BYTES + 4096);
        $name = wj_clean_name((string) ($in['name'] ?? ''));
        $email = trim((string) ($in['email'] ?? ''));
        $level = (int) ($in['level'] ?? 0);
        $levelName = wj_clean_name((string) ($in['levelName'] ?? ('Nivel ' . $level)));
        $file = (string) ($in['file'] ?? '');
        $mime = (string) ($in['mime'] ?? 'application/pdf');
        if (wj_strlen($name) < 2) {
            wj_json(['ok' => false, 'error' => 'Nombre inválido.'], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 120) {
            wj_json(['ok' => false, 'error' => 'Correo electrónico inválido.'], 422);
        }
        if ($level < 1 || $level > WJ_LEVELS) {
            wj_json(['ok' => false, 'error' => 'Nivel inválido.'], 422);
        }
        if (!in_array($mime, ['application/pdf', 'image/png'], true)) {
            wj_json(['ok' => false, 'error' => 'Formato de archivo no permitido.'], 422);
        }
        // Acepta data URL o base64 puro.
        if (strpos($file, ',') !== false) {
            $file = substr($file, strpos($file, ',') + 1);
        }
        $binary = base64_decode($file, true);
        if ($binary === false || strlen($binary) < 100 || strlen($binary) > WJ_MAX_UPLOAD_BYTES) {
            wj_json(['ok' => false, 'error' => 'Archivo de diploma inválido.'], 422);
        }
        $isPdf = $mime === 'application/pdf' && strncmp($binary, '%PDF', 4) === 0;
        $isPng = $mime === 'image/png' && strncmp($binary, "\x89PNG", 4) === 0;
        if (!$isPdf && !$isPng) {
            wj_json(['ok' => false, 'error' => 'El archivo no corresponde al formato indicado.'], 422);
        }
        $ext = $isPdf ? 'pdf' : 'png';
        $fileName = 'diploma-nivel-' . $level . '-' . wj_slug($name) . '.' . $ext;
        $sent = wj_send_diploma($email, $name, $level, $levelName, $binary, $fileName, $mime);
        if (!$sent['ok']) {
            wj_json(['ok' => false, 'error' => $sent['error']], 502);
        }
        wj_json(['ok' => true, 'message' => 'Diploma enviado a ' . $email]);
        break;

    default:
        wj_json(['ok' => false, 'error' => 'Acción no reconocida.'], 404);
}
