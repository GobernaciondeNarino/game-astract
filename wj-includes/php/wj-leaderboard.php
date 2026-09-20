<?php
/**
 * Ranking de participantes: mayor puntaje primero; a igual puntaje, menor tiempo.
 */

function wj_leaderboard_all(): array
{
    $rows = wj_storage_read('leaderboard', []);
    usort($rows, 'wj_leaderboard_compare');
    return $rows;
}

function wj_leaderboard_compare(array $a, array $b): int
{
    if ((int) $a['score'] !== (int) $b['score']) {
        return (int) $b['score'] <=> (int) $a['score'];
    }
    if ((int) $a['time'] !== (int) $b['time']) {
        return (int) $a['time'] <=> (int) $b['time'];
    }
    return strcmp((string) ($a['date'] ?? ''), (string) ($b['date'] ?? ''));
}

function wj_leaderboard_top(int $limit = WJ_LEADERBOARD_SIZE): array
{
    $rows = array_slice(wj_leaderboard_all(), 0, $limit);
    return array_map(function ($row, $i) {
        return [
            'rank' => $i + 1,
            'name' => $row['name'],
            'score' => (int) $row['score'],
            'time' => (int) $row['time'],
            'timeLabel' => wj_format_time((int) $row['time']),
            'levels' => (int) ($row['levels'] ?? 0),
            'date' => $row['date'] ?? null,
        ];
    }, $rows, array_keys($rows));
}

/** Máximo puntaje posible (para validar envíos). */
function wj_max_score(): int
{
    $total = 0;
    for ($l = 1; $l <= WJ_LEVELS; $l++) {
        $total += WJ_QUESTIONS_PER_LEVEL * WJ_POINTS_PER_ANSWER * $l;
    }
    return $total;
}

/** Agrega un resultado y devuelve la posición obtenida (1 = primero) y el top. */
function wj_leaderboard_add(string $name, int $score, int $time, int $levels): array
{
    $rows = wj_storage_read('leaderboard', []);
    $entry = [
        'id' => bin2hex(random_bytes(6)),
        'name' => $name,
        'score' => $score,
        'time' => $time,
        'levels' => $levels,
        'date' => date('c'),
        'ip' => substr(hash('sha256', wj_client_ip() . WJ_SECRET_KEY), 0, 12),
    ];
    $rows[] = $entry;
    usort($rows, 'wj_leaderboard_compare');
    // Conservar un histórico acotado.
    $rows = array_slice($rows, 0, 500);
    wj_storage_write('leaderboard', $rows);

    $rank = 0;
    foreach ($rows as $i => $row) {
        if ($row['id'] === $entry['id']) {
            $rank = $i + 1;
            break;
        }
    }
    return ['rank' => $rank, 'top' => wj_leaderboard_top()];
}

function wj_leaderboard_reset(): bool
{
    return wj_storage_write('leaderboard', []);
}

function wj_leaderboard_delete(string $id): bool
{
    $rows = wj_storage_read('leaderboard', []);
    $rows = array_values(array_filter($rows, fn($r) => ($r['id'] ?? '') !== $id));
    return wj_storage_write('leaderboard', $rows);
}
