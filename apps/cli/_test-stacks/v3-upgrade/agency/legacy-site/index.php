<?php
// An older client site built without a Dockerfile (Nixpacks in v3, Railpack in v4).
header('Content-Type: application/json');
echo json_encode(['site' => 'legacy', 'php' => PHP_MAJOR_VERSION . '.' . PHP_MINOR_VERSION]);
