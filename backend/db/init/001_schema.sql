-- Auto-run once by MySQL on first container start (mounted into /docker-entrypoint-initdb.d).
-- MYSQL_DATABASE already created the schema; this just defines the tables inside it.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'Student',
    anonymousId VARCHAR(100),
    isAnonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS emergencies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    severity_score VARCHAR(20) NOT NULL,
    description TEXT NOT NULL,
    ai_confidence DECIMAL(4,3),
    fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'Pending_Acknowledgment',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id)
);
