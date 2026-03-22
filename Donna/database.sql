-- ═══════════════════════════════════════════════════════════════
--  Donna App — MySQL Database Schema
--  Run this once in phpMyAdmin or MySQL CLI:
--  mysql -u root -p < database.sql
-- ═══════════════════════════════════════════════════════════════

CREATE DATABASE IF NOT EXISTS donna_app
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE donna_app;

-- ─── Users table ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            INT          NOT NULL AUTO_INCREMENT,
  name          VARCHAR(100) NOT NULL,
  email         VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ─── Saved drawings table ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS saved_texts (
  id          INT          NOT NULL AUTO_INCREMENT,
  user_id     INT          NOT NULL,
  title       VARCHAR(200)          DEFAULT 'Untitled Drawing',
  stroke_data LONGTEXT,                          -- JSON array of stroke objects
  created_at  TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_user (user_id),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
