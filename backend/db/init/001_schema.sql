-- Auto-run once by MySQL on first container start (mounted into /docker-entrypoint-initdb.d).
-- MYSQL_DATABASE already created the schema; this just defines the tables inside it.

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    role ENUM('student', 'counsellor', 'admin', 'supervisor', 'anonymous') NOT NULL DEFAULT 'student',
    anonymousId VARCHAR(100),
    isAnonymous BOOLEAN NOT NULL DEFAULT FALSE,
    is_suspended BOOLEAN NOT NULL DEFAULT FALSE,
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

-- Counsellors and appointment booking tables
CREATE TABLE IF NOT EXISTS counsellors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,
    name VARCHAR(255) NOT NULL,
    specialization VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS availability_slots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    counsellor_id INT NOT NULL,
    available_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_booked BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(50) NOT NULL DEFAULT 'Available',
    FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS appointments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    counsellor_id INT NOT NULL,
    slot_id INT NOT NULL,
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id) REFERENCES availability_slots(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS emergency_notifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  emergency_id INT NOT NULL,
  channel ENUM('socket', 'email', 'sms') NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  payload JSON NOT NULL,
  status ENUM('PENDING', 'SENT', 'FAILED') DEFAULT 'PENDING',
  attempts INT DEFAULT 0,
  last_error TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (emergency_id) REFERENCES emergencies(id) ON DELETE CASCADE
);