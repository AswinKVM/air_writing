<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// ─── Read input ───────────────────────────────────────────────────────────────
$input    = json_decode(file_get_contents('php://input'), true);
$email    = trim($input['email']    ?? '');
$password = trim($input['password'] ?? '');

if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'Email and password are required.']);
    exit;
}

// ─── Verify credentials ───────────────────────────────────────────────────────
$db   = getDB();
$stmt = $db->prepare('SELECT id, name, password_hash FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password_hash'])) {
    echo json_encode(['success' => false, 'error' => 'Invalid email or password.']);
    exit;
}

// ─── Set session ──────────────────────────────────────────────────────────────
$_SESSION['user_id'] = $user['id'];
$_SESSION['name']    = $user['name'];

echo json_encode(['success' => true, 'name' => $user['name']]);
