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

-- Ensure users table supports suspension and correct role strings
ALTER TABLE users 
MODIFY COLUMN role ENUM('student', 'counsellor', 'admin', 'supervisor') DEFAULT 'student',
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;

-- Ensure counsellor profiles exist for verification workflow
CREATE TABLE IF NOT EXISTS counsellor_profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    document_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Ensure system reports log exists
CREATE TABLE IF NOT EXISTS system_reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    generated_by INT,
    report_type ENUM('PDF', 'CSV'),
    title VARCHAR(150),
    file_path VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);