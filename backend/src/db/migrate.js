import db from "../config/db.js";

async function columnExists(tableName, columnName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [tableName, columnName]
  );
  return rows[0].count > 0;
}

async function indexExists(tableName, indexName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND INDEX_NAME = ?`,
    [tableName, indexName]
  );
  return rows[0].count > 0;
}

async function constraintExists(tableName, constraintName) {
  const [rows] = await db.query(
    `SELECT COUNT(*) AS count
     FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?`,
    [tableName, constraintName]
  );
  return rows[0].count > 0;
}

async function addColumnIfMissing(tableName, columnName, definitionSql) {
  if (!(await columnExists(tableName, columnName))) {
    await db.query(`ALTER TABLE \`${tableName}\` ADD COLUMN ${definitionSql}`);
    console.log(`Added column ${tableName}.${columnName}`);
  }
}

export async function runMigrations() {
  await addColumnIfMissing("users", "phone", "phone VARCHAR(32) NULL AFTER password");
  await addColumnIfMissing("users", "anonymousId", "anonymousId VARCHAR(100) NULL");
  await addColumnIfMissing("users", "isAnonymous", "isAnonymous BOOLEAN NOT NULL DEFAULT FALSE");
  await addColumnIfMissing("users", "is_suspended", "is_suspended BOOLEAN NOT NULL DEFAULT FALSE");

  await db.query(`
    CREATE TABLE IF NOT EXISTS counsellor_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      verification_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
      document_url VARCHAR(255),
      is_available BOOLEAN DEFAULT TRUE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS system_reports (
      id INT AUTO_INCREMENT PRIMARY KEY,
      generated_by INT,
      report_type ENUM('PDF', 'CSV'),
      title VARCHAR(150),
      file_path VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS counsellors (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT UNIQUE,
      name VARCHAR(255) NOT NULL,
      specialization VARCHAR(255) NOT NULL DEFAULT 'General Counselling',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB
  `);

  await addColumnIfMissing("counsellors", "user_id", "user_id INT NULL UNIQUE AFTER id");
  if (!(await constraintExists("counsellors", "fk_counsellors_user"))) {
    await db.query(`
      ALTER TABLE counsellors
      ADD CONSTRAINT fk_counsellors_user
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    `);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      title VARCHAR(191) NOT NULL DEFAULT 'Support Conversation',
      modality ENUM('text', 'voice', 'mixed') NOT NULL DEFAULT 'text',
      current_risk_level ENUM('low', 'moderate', 'high') NOT NULL DEFAULT 'low',
      detected_language VARCHAR(32) NOT NULL DEFAULT 'en',
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_message_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      status ENUM('active', 'closed') NOT NULL DEFAULT 'active',
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_conversations_user_last (user_id, last_message_at)
    ) ENGINE=InnoDB
  `);

  await addColumnIfMissing("chat_messages", "conversation_id", "conversation_id INT NULL AFTER user_id");
  await addColumnIfMissing("chat_messages", "modality", "modality ENUM('text', 'voice') NOT NULL DEFAULT 'text' AFTER sender");
  await addColumnIfMissing("chat_messages", "ai_metadata", "ai_metadata JSON NULL AFTER crisis_flag");

  if (!(await indexExists("chat_messages", "idx_chat_messages_conversation"))) {
    await db.query(`ALTER TABLE chat_messages ADD INDEX idx_chat_messages_conversation (conversation_id, created_at)`);
  }

  if (!(await constraintExists("chat_messages", "fk_chat_messages_conversation"))) {
    await db.query(`
      ALTER TABLE chat_messages
      ADD CONSTRAINT fk_chat_messages_conversation
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
    `);
  }

  await addColumnIfMissing("availability_slots", "status", "status VARCHAR(30) NOT NULL DEFAULT 'Available' AFTER is_booked");

  await db.query(`
    CREATE TABLE IF NOT EXISTS emergencies (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT NOT NULL,
      severity_score VARCHAR(20) NOT NULL,
      description TEXT NOT NULL,
      ai_confidence DECIMAL(4,3) NULL,
      fallback_triggered BOOLEAN NOT NULL DEFAULT FALSE,
      status VARCHAR(50) NOT NULL DEFAULT 'Pending_Acknowledgment',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES users(id)
    ) ENGINE=InnoDB
  `);

  await addColumnIfMissing("emergencies", "conversation_id", "conversation_id INT NULL AFTER student_id");
  await addColumnIfMissing("emergencies", "risk_level", "risk_level ENUM('low', 'moderate', 'high') NOT NULL DEFAULT 'high' AFTER severity_score");
  await addColumnIfMissing("emergencies", "acknowledged_by", "acknowledged_by INT NULL AFTER status");
  await addColumnIfMissing("emergencies", "acknowledged_at", "acknowledged_at TIMESTAMP NULL AFTER acknowledged_by");
  await addColumnIfMissing("emergencies", "escalated_at", "escalated_at TIMESTAMP NULL AFTER acknowledged_at");
  await addColumnIfMissing("emergencies", "escalation_level", "escalation_level INT NOT NULL DEFAULT 0 AFTER escalated_at");
  await addColumnIfMissing("emergencies", "resolved_by", "resolved_by INT NULL AFTER escalation_level");
  await addColumnIfMissing("emergencies", "resolved_at", "resolved_at TIMESTAMP NULL AFTER resolved_by");
  await addColumnIfMissing("emergencies", "outcome_notes", "outcome_notes TEXT NULL AFTER resolved_at");

  await db.query(`
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
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS phq9_screenings (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      conversation_id INT NULL,
      total_score INT NULL,
      severity_band ENUM('Minimal', 'Mild', 'Moderate', 'Moderately severe', 'Severe') NULL,
      q9_score INT NULL,
      q9_safety_triggered BOOLEAN NOT NULL DEFAULT FALSE,
      status ENUM('in_progress', 'completed', 'abandoned') NOT NULL DEFAULT 'in_progress',
      current_question INT NOT NULL DEFAULT 1,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
      INDEX idx_phq9_user_created (user_id, created_at)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS phq9_responses (
      id INT AUTO_INCREMENT PRIMARY KEY,
      screening_id INT NOT NULL,
      question_number TINYINT NOT NULL,
      question_text VARCHAR(500) NOT NULL,
      response_value TINYINT NOT NULL,
      response_label VARCHAR(100) NOT NULL,
      answered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (screening_id) REFERENCES phq9_screenings(id) ON DELETE CASCADE,
      UNIQUE KEY uq_phq9_screening_question (screening_id, question_number),
      CONSTRAINT chk_phq9_question_num CHECK (question_number BETWEEN 1 AND 9),
      CONSTRAINT chk_phq9_response_val CHECK (response_value BETWEEN 0 AND 3)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS risk_assessments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      conversation_id INT NULL,
      message_id INT NULL,
      modality ENUM('text', 'voice', 'phq9', 'manual') NOT NULL DEFAULT 'text',
      ai_suggested_level ENUM('low', 'moderate', 'high') NULL,
      validated_risk_level ENUM('low', 'moderate', 'high') NOT NULL,
      reasons JSON NOT NULL,
      emotional_indicators JSON NULL,
      depression_indicators JSON NULL,
      ai_confidence DECIMAL(4,3) NULL,
      uncertainty_flag BOOLEAN NOT NULL DEFAULT FALSE,
      deterministic_override BOOLEAN NOT NULL DEFAULT FALSE,
      review_status ENUM('unreviewed', 'reviewed', 'overridden') NOT NULL DEFAULT 'unreviewed',
      reviewed_by INT NULL,
      reviewed_at TIMESTAMP NULL,
      review_notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL,
      FOREIGN KEY (message_id) REFERENCES chat_messages(id) ON DELETE SET NULL,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_risk_user_created (user_id, created_at),
      INDEX idx_risk_level_review (validated_risk_level, review_status)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_assignments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      counsellor_id INT NOT NULL,
      assigned_by INT NULL,
      status ENUM('active', 'reassigned', 'closed') NOT NULL DEFAULT 'active',
      notes TEXT NULL,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      unassigned_at TIMESTAMP NULL,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_assignments_patient_status (patient_id, status),
      INDEX idx_assignments_counsellor_status (counsellor_id, status)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS counsellor_notes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      counsellor_user_id INT NOT NULL,
      note_text TEXT NOT NULL,
      follow_up_status ENUM('none', 'pending', 'in_progress', 'completed') NOT NULL DEFAULT 'none',
      action_taken TEXT NULL,
      outcome TEXT NULL,
      review_date DATE NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (counsellor_user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_notes_patient_created (patient_id, created_at)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS follow_ups (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      counsellor_id INT NULL,
      risk_assessment_id INT NULL,
      priority ENUM('low', 'moderate', 'high') NOT NULL DEFAULT 'moderate',
      due_date DATE NULL,
      status ENUM('pending', 'in_progress', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
      notes TEXT NULL,
      outcome TEXT NULL,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (counsellor_id) REFERENCES counsellors(id) ON DELETE SET NULL,
      FOREIGN KEY (risk_assessment_id) REFERENCES risk_assessments(id) ON DELETE SET NULL,
      INDEX idx_followups_status_due (status, due_date)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NULL,
      recipient_role VARCHAR(30) NULL,
      patient_id INT NULL,
      category VARCHAR(50) NOT NULL DEFAULT 'general',
      title VARCHAR(191) NOT NULL DEFAULT 'CareBridge Notification',
      message TEXT NOT NULL,
      reference_type VARCHAR(50) NULL,
      reference_id INT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      acknowledged_by INT NULL,
      acknowledged_at TIMESTAMP NULL,
      escalation_status ENUM('none', 'pending', 'escalated', 'resolved') NOT NULL DEFAULT 'none',
      resolution_notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (acknowledged_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_notifications_user_read (user_id, is_read, created_at),
      INDEX idx_notifications_role_created (recipient_role, created_at)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS patient_documents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      patient_id INT NOT NULL,
      uploaded_by INT NOT NULL,
      original_filename VARCHAR(255) NOT NULL,
      storage_path VARCHAR(500) NOT NULL,
      mime_type VARCHAR(120) NOT NULL,
      file_size INT NOT NULL,
      extracted_text LONGTEXT NULL,
      consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_documents_patient_created (patient_id, created_at)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS document_summaries (
      id INT AUTO_INCREMENT PRIMARY KEY,
      document_id INT NOT NULL,
      patient_id INT NOT NULL,
      summary_json JSON NOT NULL,
      model_used VARCHAR(100) NULL,
      review_status ENUM('pending_review', 'reviewed') NOT NULL DEFAULT 'pending_review',
      reviewed_by INT NULL,
      reviewed_at TIMESTAMP NULL,
      reviewer_notes TEXT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES patient_documents(id) ON DELETE CASCADE,
      FOREIGN KEY (patient_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_doc_summaries_patient (patient_id, created_at)
    ) ENGINE=InnoDB
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      actor_id INT NULL,
      actor_role VARCHAR(30) NULL,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50) NOT NULL,
      entity_id INT NULL,
      details JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_audit_entity (entity_type, entity_id, created_at),
      INDEX idx_audit_actor (actor_id, created_at)
    ) ENGINE=InnoDB
  `);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runMigrations()
    .then(() => {
      console.log("Migrations applied successfully.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("Migration failed:", err);
      process.exit(1);
    });
}
