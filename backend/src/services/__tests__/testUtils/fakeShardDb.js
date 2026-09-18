// In-memory stand-in for the mysql2 pool used by shardService. It models just enough
// relational behaviour (row-level locking via FOR UPDATE, transaction snapshot/rollback,
// and a unique constraint on (user_id, reference_id)) to exercise real transactional
// integrity, including genuine concurrent-access races, without a live MySQL instance.
export function createFakeShardDb() {
    const state = {
        balances: new Map(), // user_id -> balance
        transactions: [], // { id, user_id, type, amount, reason, reference_id, balance_after }
        unlocks: [], // { id, user_id, session_type, shard_cost, transaction_id, status }
    };

    let nextTransactionId = 1;
    let nextUnlockId = 1;
    const lockedUsers = new Set();
    const lockWaiters = new Map();

    async function acquireLock(userId) {
        while (lockedUsers.has(userId)) {
            await new Promise((resolve) => {
                const waiters = lockWaiters.get(userId) || [];
                waiters.push(resolve);
                lockWaiters.set(userId, waiters);
            });
        }
        lockedUsers.add(userId);
    }

    function releaseLock(userId) {
        lockedUsers.delete(userId);
        const waiters = lockWaiters.get(userId) || [];
        const next = waiters.shift();
        lockWaiters.set(userId, waiters);
        if (next) next();
    }

    function duplicateEntryError() {
        const error = new Error("Duplicate entry for key 'uq_shard_transactions_user_reference'");
        error.code = 'ER_DUP_ENTRY';
        return error;
    }

    function findTransaction(userId, referenceId) {
        return state.transactions.find((t) => t.user_id === userId && t.reference_id === referenceId);
    }

    function makeConnection() {
        // Undo log of this transaction's own mutations only, applied in reverse on
        // rollback. A whole-state snapshot would be wrong here: it would also erase
        // any changes another connection committed while this one was in flight.
        let undoLog = null;
        let heldLockUserId = null;

        function recordUndo(undoFn) {
            if (undoLog) undoLog.push(undoFn);
        }

        return {
            async beginTransaction() {
                undoLog = [];
            },

            async query(sql, params = []) {
                const normalized = sql.trim().replace(/\s+/g, ' ').toUpperCase();

                if (normalized.startsWith('INSERT INTO SHARD_BALANCES')) {
                    const [userId] = params;
                    if (!state.balances.has(userId)) {
                        state.balances.set(userId, 0);
                        recordUndo(() => state.balances.delete(userId));
                    }
                    return [{ affectedRows: 1 }];
                }

                if (normalized.startsWith('SELECT BALANCE FROM SHARD_BALANCES WHERE USER_ID = ? FOR UPDATE')) {
                    const [userId] = params;
                    await acquireLock(userId);
                    heldLockUserId = userId;
                    return [[{ balance: state.balances.get(userId) ?? 0 }]];
                }

                if (normalized.startsWith('SELECT BALANCE FROM SHARD_BALANCES WHERE USER_ID = ?')) {
                    const [userId] = params;
                    const balance = state.balances.get(userId);
                    return [balance === undefined ? [] : [{ balance }]];
                }

                if (normalized.startsWith('UPDATE SHARD_BALANCES SET BALANCE')) {
                    const [newBalance, userId] = params;
                    const previousBalance = state.balances.get(userId);
                    state.balances.set(userId, newBalance);
                    recordUndo(() => state.balances.set(userId, previousBalance));
                    return [{ affectedRows: 1 }];
                }

                if (normalized.startsWith('SELECT ID, TYPE, AMOUNT, BALANCE_AFTER FROM SHARD_TRANSACTIONS')) {
                    const [userId, referenceId] = params;
                    const found = findTransaction(userId, referenceId);
                    return [found ? [found] : []];
                }

                if (normalized.startsWith('INSERT INTO SHARD_TRANSACTIONS')) {
                    const [userId, type, amount, reason, referenceId, balanceAfter] = params;
                    if (findTransaction(userId, referenceId)) {
                        throw duplicateEntryError();
                    }
                    const id = nextTransactionId++;
                    state.transactions.push({
                        id,
                        user_id: userId,
                        type,
                        amount,
                        reason,
                        reference_id: referenceId,
                        balance_after: balanceAfter,
                    });
                    recordUndo(() => {
                        const idx = state.transactions.findIndex((t) => t.id === id);
                        if (idx >= 0) state.transactions.splice(idx, 1);
                    });
                    return [{ insertId: id }];
                }

                if (normalized.startsWith('INSERT INTO COUNSELLING_UNLOCKS')) {
                    const [userId, sessionType, shardCost, transactionId] = params;
                    const id = nextUnlockId++;
                    state.unlocks.push({
                        id,
                        user_id: userId,
                        session_type: sessionType,
                        shard_cost: shardCost,
                        transaction_id: transactionId,
                        status: 'ACTIVE',
                    });
                    recordUndo(() => {
                        const idx = state.unlocks.findIndex((u) => u.id === id);
                        if (idx >= 0) state.unlocks.splice(idx, 1);
                    });
                    return [{ insertId: id }];
                }

                throw new Error(`fakeShardDb: unhandled query -> ${sql}`);
            },

            async commit() {
                undoLog = null;
                if (heldLockUserId !== null) {
                    releaseLock(heldLockUserId);
                    heldLockUserId = null;
                }
            },

            async rollback() {
                if (undoLog) {
                    for (let i = undoLog.length - 1; i >= 0; i -= 1) {
                        undoLog[i]();
                    }
                    undoLog = null;
                }
                if (heldLockUserId !== null) {
                    releaseLock(heldLockUserId);
                    heldLockUserId = null;
                }
            },

            release() {},
        };
    }

    return {
        async getConnection() {
            return makeConnection();
        },
        async query(sql, params) {
            return makeConnection().query(sql, params);
        },
        _state: state,
        _seedBalance(userId, balance) {
            state.balances.set(userId, balance);
        },
    };
}
