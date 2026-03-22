<?php
session_start();
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/auth_check.php';
require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

// ─── Read input ───────────────────────────────────────────────────────────────
$input       = json_decode(file_get_contents('php://input'), true);
$title       = trim($input['title']       ?? 'Untitled Drawing');
$stroke_data = $input['stroke_data']       ?? [];

if (empty($stroke_data)) {
    echo json_encode(['success' => false, 'error' => 'No drawing data to save.']);
    exit;
}

$strokeJson = json_encode($stroke_data);
$userId     = $_SESSION['user_id'];

// ─── Insert into DB ───────────────────────────────────────────────────────────
$db   = getDB();
$stmt = $db->prepare('INSERT INTO saved_texts (user_id, title, stroke_data) VALUES (?, ?, ?)');
$stmt->execute([$userId, $title, $strokeJson]);
$newId = $db->lastInsertId();

echo json_encode(['success' => true, 'id' => $newId, 'message' => 'Drawing saved to server!']);
