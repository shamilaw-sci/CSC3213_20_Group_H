-- Clarity Shard rewards & counselling unlock schema.
-- Run manually against mind_ease_db (no migration runner is configured yet).

CREATE TABLE IF NOT EXISTS shard_balances (
    user_id INT NOT NULL,
    balance INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id),
    CONSTRAINT fk_shard_balances_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT chk_shard_balances_non_negative CHECK (balance >= 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS shard_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    type ENUM('EARN', 'REDEEM') NOT NULL,
    amount INT NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_id VARCHAR(191) NOT NULL,
    balance_after INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shard_transactions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT uq_shard_transactions_user_reference UNIQUE (user_id, reference_id),
    CONSTRAINT chk_shard_transactions_amount_positive CHECK (amount > 0)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS counselling_unlocks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_type VARCHAR(100) NOT NULL,
    shard_cost INT NOT NULL,
    transaction_id INT NOT NULL,
    status ENUM('ACTIVE', 'USED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_counselling_unlocks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_counselling_unlocks_transaction FOREIGN KEY (transaction_id) REFERENCES shard_transactions(id),
    CONSTRAINT uq_counselling_unlocks_transaction UNIQUE (transaction_id)
) ENGINE=InnoDB;
