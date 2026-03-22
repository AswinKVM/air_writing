<?php
// ─── Database Configuration ───────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_NAME', 'donna_app');
define('DB_USER', 'root');       // ← Change to your MySQL username
define('DB_PASS', '1234');           // ← Change to your MySQL password
define('DB_CHARSET', 'utf8mb4');

// ─── Pre-flight: ensure PDO MySQL driver is available ────────────────────────
if (!extension_loaded('pdo_mysql')) {
    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'error'   => 'PHP PDO MySQL extension is not enabled. ' .
                     'Open php.ini, uncomment "extension=pdo_mysql", then restart Apache.'
    ]);
    exit;
}

function getDB(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $dsn = "mysql:host=" . DB_HOST . ";charset=" . DB_CHARSET;
        $options = [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ];
        try {
            // 1. Connect without specific database
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
            
            // 2. Create the database if it doesn't exist
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET " . DB_CHARSET . " COLLATE utf8mb4_unicode_ci;");
            
            // 3. Select the database
            $pdo->exec("USE `" . DB_NAME . "`;");
            
            // 4. Create necessary tables if they don't exist
            $pdo->exec("
                CREATE TABLE IF NOT EXISTS users (
                  id            INT          NOT NULL AUTO_INCREMENT,
                  name          VARCHAR(100) NOT NULL,
                  email         VARCHAR(150) NOT NULL,
                  password_hash VARCHAR(255) NOT NULL,
                  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  UNIQUE KEY uk_email (email)
                ) ENGINE=InnoDB DEFAULT CHARSET=" . DB_CHARSET . ";
            ");

            $pdo->exec("
                CREATE TABLE IF NOT EXISTS saved_texts (
                  id          INT          NOT NULL AUTO_INCREMENT,
                  user_id     INT          NOT NULL,
                  title       VARCHAR(200)          DEFAULT 'Untitled Drawing',
                  stroke_data LONGTEXT,
                  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
                  PRIMARY KEY (id),
                  KEY idx_user (user_id),
                  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
                ) ENGINE=InnoDB DEFAULT CHARSET=" . DB_CHARSET . ";
            ");
            
        } catch (PDOException $e) {
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database connection failed: ' . $e->getMessage()]);
            exit;
        }
    }
    return $pdo;
}
