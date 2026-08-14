-- Auto-run on first container start alongside 001_schema.sql.
-- If your MySQL volume already exists, apply manually:
--   docker compose exec -T mysql mysql -u root -p mind_ease_db < backend/db/init/002_chat_schema.sql

CREATE TABLE IF NOT EXISTS chat_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    sender ENUM('patient', 'bot') NOT NULL,
    content TEXT NOT NULL,
    crisis_flag BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_chat_messages_user_created (user_id, created_at)
);
