-- 블로그 DB 초기화 SQL
-- MySQL Workbench, TablePlus, 또는 mysql 클라이언트에서 실행하세요.

CREATE DATABASE IF NOT EXISTS blog_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE blog_db;

CREATE TABLE IF NOT EXISTS posts (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(255) NOT NULL,
  slug         VARCHAR(255) NOT NULL UNIQUE,
  content      LONGTEXT     NOT NULL,
  content_type ENUM('markdown','html') NOT NULL DEFAULT 'markdown',
  published    TINYINT(1)   NOT NULL DEFAULT 0,
  expires_at   DATETIME     NULL DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_slug (slug),
  INDEX idx_pub_created (published, created_at DESC),
  INDEX idx_expires (expires_at)
);

-- 기존 DB 마이그레이션 (이미 테이블이 있는 경우 실행):
-- ALTER TABLE posts ADD COLUMN expires_at DATETIME NULL DEFAULT NULL;
-- ALTER TABLE posts ADD INDEX idx_expires (expires_at);

-- 접속 권한 부여 (필요 시 root 계정으로 실행)
-- GRANT ALL PRIVILEGES ON blog_db.* TO 'kjh9211'@'%';
-- FLUSH PRIVILEGES;
