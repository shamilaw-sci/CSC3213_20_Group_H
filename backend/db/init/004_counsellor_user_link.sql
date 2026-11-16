-- Add the counsellor-to-user link to databases created before this field existed.

SET @has_user_id = (
    SELECT COUNT(*)
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = 'counsellors'
      AND column_name = 'user_id'
);

SET @add_user_id = IF(
    @has_user_id = 0,
    'ALTER TABLE counsellors ADD COLUMN user_id INT UNIQUE AFTER id',
    'SELECT 1'
);

PREPARE add_user_id_statement FROM @add_user_id;
EXECUTE add_user_id_statement;
DEALLOCATE PREPARE add_user_id_statement;

SET @has_user_fk = (
    SELECT COUNT(*)
    FROM information_schema.key_column_usage
    WHERE constraint_schema = DATABASE()
      AND table_name = 'counsellors'
      AND constraint_name = 'fk_counsellors_user'
);

SET @add_user_fk = IF(
    @has_user_fk = 0,
    'ALTER TABLE counsellors ADD CONSTRAINT fk_counsellors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE add_user_fk_statement FROM @add_user_fk;
EXECUTE add_user_fk_statement;
DEALLOCATE PREPARE add_user_fk_statement;
