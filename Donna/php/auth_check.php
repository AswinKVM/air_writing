<?php
// ─── Auth Guard ───────────────────────────────────────────────────────────────
// Include this file in any protected endpoint.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'error' => 'Unauthorized. Please log in.']);
    exit;
}
