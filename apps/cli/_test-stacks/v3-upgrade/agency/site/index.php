<?php
// Answers only requests that carry the CDN's origin-verify header, and reports the build mark, the host the edge
// function forwarded and every row the afterDeploy hook wrote, so the canary can prove the site, the CDN chain,
// the secret and the database all survive the upgrade.
header('Content-Type: application/json');
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$build = trim((string) @file_get_contents(__DIR__ . '/build-mark.txt'));
if ($path === '/healthz') {
  echo json_encode(['ok' => true, 'build' => $build]);
  exit;
}
$expected = (string) getenv('ORIGIN_VERIFY_KEY');
$sent = $_SERVER['HTTP_X_ORIGIN_VERIFY'] ?? '';
if ($expected === '' || !hash_equals($expected, $sent)) {
  http_response_code(403);
  echo json_encode(['error' => 'origin-verify']);
  exit;
}
try {
  $pdo = new PDO(
    sprintf('mysql:host=%s;port=%s;dbname=%s', getenv('DB_SERVER'), getenv('DB_PORT'), getenv('DB_DATABASE')),
    getenv('DB_USER'),
    getenv('DB_PASSWORD'),
    [PDO::ATTR_TIMEOUT => 5, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
  );
  $marks = $pdo->query('SELECT label FROM deploy_marks ORDER BY id')->fetchAll(PDO::FETCH_COLUMN);
  echo json_encode([
    'site' => 'agency',
    'build' => $build,
    'forwardedHost' => $_SERVER['HTTP_X_FORWARDED_HOST'] ?? null,
    'deployMarks' => $marks
  ]);
} catch (Throwable $error) {
  http_response_code(500);
  echo json_encode(['error' => 'database', 'message' => $error->getMessage()]);
}
