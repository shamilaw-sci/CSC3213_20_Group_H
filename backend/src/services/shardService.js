import pool from '../config/db.js';
import { ShardValidationError, InsufficientShardsError } from './shardErrors.js';

const ER_DUP_ENTRY = 'ER_DUP_ENTRY';

function assertPositiveInteger(value, fieldName) {
    if (!Number.isInteger(value) || value <= 0) {
        throw new ShardValidationError(`${fieldName} must be a positive integer.`);
    }
}

function assertNonEmptyString(value, fieldName) {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ShardValidationError(`${fieldName} is required.`);
    }
}

async function safeRollback(connection) {
    try {
        await connection.rollback();
    } catch (rollbackError) {
        console.error('Failed to roll back Clarity Shard transaction:', rollbackError);
    }
}

// db must expose the mysql2-style pool interface: getConnection() -> connection
// with query/beginTransaction/commit/rollback/release. Injected so the transactional
// logic can be exercised against a fake in-memory connection in tests.
export function createShardService(db) {
    async function ensureBalanceRow(connection, userId) {
        await connection.query(
            'INSERT INTO shard_balances (user_id, balance) VALUES (?, 0) ON DUPLICATE KEY UPDATE user_id = user_id',
            [userId]
        );
    }

    async function lockBalance(connection, userId) {
        const [rows] = await connection.query(
            'SELECT balance FROM shard_balances WHERE user_id = ? FOR UPDATE',
            [userId]
        );
        return rows[0].balance;
    }

    async function findTransactionByReference(connection, userId, referenceId) {
        const [rows] = await connection.query(
            'SELECT id, type, amount, balance_after FROM shard_transactions WHERE user_id = ? AND reference_id = ? LIMIT 1',
            [userId, referenceId]
        );
        return rows[0] || null;
    }

    async function getBalance(userId) {
        assertPositiveInteger(userId, 'userId');
        const [rows] = await db.query('SELECT balance FROM shard_balances WHERE user_id = ?', [userId]);
        return rows[0]?.balance ?? 0;
    }

    // Awards Clarity Shards atomically. referenceId is an idempotency key: retrying the
    // same activity (e.g. a duplicate client request) must never award shards twice.
    async function earnShards(userId, { amount, reason, referenceId } = {}) {
        assertPositiveInteger(userId, 'userId');
        assertPositiveInteger(amount, 'amount');
        assertNonEmptyString(reason, 'reason');
        assertNonEmptyString(referenceId, 'referenceId');

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const existing = await findTransactionByReference(connection, userId, referenceId);
            if (existing) {
                await connection.commit();
                return { balance: existing.balance_after, transactionId: existing.id, duplicate: true };
            }

            await ensureBalanceRow(connection, userId);
            const currentBalance = await lockBalance(connection, userId);
            const newBalance = currentBalance + amount;

            await connection.query('UPDATE shard_balances SET balance = ? WHERE user_id = ?', [newBalance, userId]);

            const [result] = await connection.query(
                `INSERT INTO shard_transactions (user_id, type, amount, reason, reference_id, balance_after)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, 'EARN', amount, reason, referenceId, newBalance]
            );

            await connection.commit();
            return { balance: newBalance, transactionId: result.insertId, duplicate: false };
        } catch (error) {
            await safeRollback(connection);
            if (error?.code === ER_DUP_ENTRY) {
                // Lost a race to a concurrent identical request; the other request's
                // commit is now visible, so replay as an idempotent lookup.
                return findExistingOrThrow(userId, referenceId, error);
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    // Redeems shards and unlocks a counselling session in one atomic operation:
    // balance deduction, ledger entry, and unlock record all commit or all roll back.
    async function redeemShardsForCounsellingUnlock(userId, { sessionType, shardCost, referenceId } = {}) {
        assertPositiveInteger(userId, 'userId');
        assertPositiveInteger(shardCost, 'shardCost');
        assertNonEmptyString(sessionType, 'sessionType');
        assertNonEmptyString(referenceId, 'referenceId');

        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();

            const existing = await findTransactionByReference(connection, userId, referenceId);
            if (existing) {
                await connection.commit();
                return { balance: existing.balance_after, transactionId: existing.id, duplicate: true };
            }

            await ensureBalanceRow(connection, userId);
            const currentBalance = await lockBalance(connection, userId);

            if (currentBalance < shardCost) {
                throw new InsufficientShardsError(
                    `Insufficient Clarity Shards: balance ${currentBalance}, required ${shardCost}.`
                );
            }

            const newBalance = currentBalance - shardCost;

            await connection.query('UPDATE shard_balances SET balance = ? WHERE user_id = ?', [newBalance, userId]);

            const [txResult] = await connection.query(
                `INSERT INTO shard_transactions (user_id, type, amount, reason, reference_id, balance_after)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [userId, 'REDEEM', shardCost, `Unlock: ${sessionType}`, referenceId, newBalance]
            );

            const [unlockResult] = await connection.query(
                `INSERT INTO counselling_unlocks (user_id, session_type, shard_cost, transaction_id, status)
                 VALUES (?, ?, ?, ?, 'ACTIVE')`,
                [userId, sessionType, shardCost, txResult.insertId]
            );

            await connection.commit();
            return {
                balance: newBalance,
                transactionId: txResult.insertId,
                unlockId: unlockResult.insertId,
                duplicate: false,
            };
        } catch (error) {
            await safeRollback(connection);
            if (error?.code === ER_DUP_ENTRY) {
                return findExistingOrThrow(userId, referenceId, error);
            }
            throw error;
        } finally {
            connection.release();
        }
    }

    async function findExistingOrThrow(userId, referenceId, originalError) {
        const connection = await db.getConnection();
        try {
            const existing = await findTransactionByReference(connection, userId, referenceId);
            if (existing) {
                return { balance: existing.balance_after, transactionId: existing.id, duplicate: true };
            }
            throw originalError;
        } finally {
            connection.release();
        }
    }

    return { getBalance, earnShards, redeemShardsForCounsellingUnlock };
}

const shardService = createShardService(pool);
export default shardService;
