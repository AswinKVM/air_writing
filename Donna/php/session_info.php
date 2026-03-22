<?php
// ─── session_info.php ─────────────────────────────────────────────────────────
// Returns the logged-in user's name – used by canvas.html to display username.
session_start();
header('Content-Type: application/json');

if (!empty($_SESSION['user_id'])) {
    echo json_encode(['success' => true, 'name' => $_SESSION['name']]);
} else {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'Not logged in.']);
}
