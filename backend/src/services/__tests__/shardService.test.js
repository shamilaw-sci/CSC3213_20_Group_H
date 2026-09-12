import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { createShardService } from '../shardService.js';
import { ShardValidationError, InsufficientShardsError } from '../shardErrors.js';
import { createFakeShardDb } from './testUtils/fakeShardDb.js';

const USER_ID = 42;

describe('shardService validation', () => {
    test('earnShards rejects a non-positive amount', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () => service.earnShards(USER_ID, { amount: 0, reason: 'daily_checkin', referenceId: 'ref-1' }),
            ShardValidationError
        );
    });

    test('earnShards rejects a non-integer amount', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () => service.earnShards(USER_ID, { amount: 2.5, reason: 'daily_checkin', referenceId: 'ref-1' }),
            ShardValidationError
        );
    });

    test('earnShards rejects a missing reason', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () => service.earnShards(USER_ID, { amount: 5, reason: '  ', referenceId: 'ref-1' }),
            ShardValidationError
        );
    });

    test('earnShards rejects a missing referenceId', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () => service.earnShards(USER_ID, { amount: 5, reason: 'daily_checkin' }),
            ShardValidationError
        );
    });

    test('redeemShardsForCounsellingUnlock rejects a non-positive shardCost', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () =>
                service.redeemShardsForCounsellingUnlock(USER_ID, {
                    sessionType: 'standard-session',
                    shardCost: -10,
                    referenceId: 'ref-1',
                }),
            ShardValidationError
        );
    });

    test('redeemShardsForCounsellingUnlock rejects a missing sessionType', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(
            () =>
                service.redeemShardsForCounsellingUnlock(USER_ID, {
                    shardCost: 10,
                    referenceId: 'ref-1',
                }),
            ShardValidationError
        );
    });

    test('getBalance rejects an invalid userId', async () => {
        const service = createShardService(createFakeShardDb());
        await assert.rejects(() => service.getBalance(-1), ShardValidationError);
    });

    test('validation errors never touch the database', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);
        await assert.rejects(() =>
            service.earnShards(USER_ID, { amount: -5, reason: 'x', referenceId: 'ref-1' })
        );
        assert.equal(db._state.transactions.length, 0);
        assert.equal(db._state.balances.has(USER_ID), false);
    });
});

describe('shardService.earnShards transactional integrity', () => {
    test('awards shards and records a ledger entry atomically', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);

        const result = await service.earnShards(USER_ID, {
            amount: 15,
            reason: 'daily_checkin',
            referenceId: 'checkin-2026-09-12',
        });

        assert.equal(result.duplicate, false);
        assert.equal(result.balance, 15);
        assert.equal(db._state.balances.get(USER_ID), 15);
        assert.equal(db._state.transactions.length, 1);
        assert.equal(db._state.transactions[0].type, 'EARN');
        assert.equal(db._state.transactions[0].balance_after, 15);
    });

    test('accumulates balance across multiple distinct rewards', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);

        await service.earnShards(USER_ID, { amount: 10, reason: 'journal', referenceId: 'ref-a' });
        const second = await service.earnShards(USER_ID, { amount: 5, reason: 'journal', referenceId: 'ref-b' });

        assert.equal(second.balance, 15);
        assert.equal(db._state.transactions.length, 2);
    });

    test('replaying the same referenceId is idempotent and does not double-credit', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);

        const first = await service.earnShards(USER_ID, {
            amount: 20,
            reason: 'streak_bonus',
            referenceId: 'streak-week-1',
        });
        const replay = await service.earnShards(USER_ID, {
            amount: 20,
            reason: 'streak_bonus',
            referenceId: 'streak-week-1',
        });

        assert.equal(first.duplicate, false);
        assert.equal(replay.duplicate, true);
        assert.equal(replay.balance, 20);
        assert.equal(db._state.balances.get(USER_ID), 20);
        assert.equal(db._state.transactions.length, 1);
    });

    test('concurrent identical requests race safely and only award once', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);

        const [a, b] = await Promise.all([
            service.earnShards(USER_ID, { amount: 30, reason: 'milestone', referenceId: 'milestone-1' }),
            service.earnShards(USER_ID, { amount: 30, reason: 'milestone', referenceId: 'milestone-1' }),
        ]);

        assert.equal(db._state.balances.get(USER_ID), 30);
        assert.equal(db._state.transactions.length, 1);
        assert.equal([a.duplicate, b.duplicate].filter((d) => d === false).length, 1);
        assert.equal([a.duplicate, b.duplicate].filter((d) => d === true).length, 1);
    });

    test('rolls back the balance update if the ledger insert fails', async () => {
        const db = createFakeShardDb();
        const service = createShardService(db);

        const originalGetConnection = db.getConnection.bind(db);
        let failNext = true;
        db.getConnection = async () => {
            const connection = await originalGetConnection();
            const originalQuery = connection.query.bind(connection);
            connection.query = async (sql, params) => {
                if (failNext && sql.toUpperCase().includes('INSERT INTO SHARD_TRANSACTIONS')) {
                    failNext = false;
                    throw new Error('simulated ledger write failure');
                }
                return originalQuery(sql, params);
            };
            return connection;
        };

        await assert.rejects(() =>
            service.earnShards(USER_ID, { amount: 50, reason: 'bonus', referenceId: 'ref-fail' })
        );

        assert.equal(db._state.balances.get(USER_ID) ?? 0, 0);
        assert.equal(db._state.transactions.length, 0);
    });
});

describe('shardService.redeemShardsForCounsellingUnlock transactional integrity', () => {
    test('deducts balance and creates an unlock record atomically', async () => {
        const db = createFakeShardDb();
        db._seedBalance(USER_ID, 100);
        const service = createShardService(db);

        const result = await service.redeemShardsForCounsellingUnlock(USER_ID, {
            sessionType: 'standard-session',
            shardCost: 40,
            referenceId: 'unlock-1',
        });

        assert.equal(result.duplicate, false);
        assert.equal(result.balance, 60);
        assert.equal(db._state.balances.get(USER_ID), 60);
        assert.equal(db._state.unlocks.length, 1);
        assert.equal(db._state.unlocks[0].status, 'ACTIVE');
        assert.equal(db._state.unlocks[0].transaction_id, result.transactionId);
    });

    test('rejects redemption when the balance is insufficient and leaves state untouched', async () => {
        const db = createFakeShardDb();
        db._seedBalance(USER_ID, 10);
        const service = createShardService(db);

        await assert.rejects(
            () =>
                service.redeemShardsForCounsellingUnlock(USER_ID, {
                    sessionType: 'standard-session',
                    shardCost: 40,
                    referenceId: 'unlock-1',
                }),
            InsufficientShardsError
        );

        assert.equal(db._state.balances.get(USER_ID), 10);
        assert.equal(db._state.transactions.length, 0);
        assert.equal(db._state.unlocks.length, 0);
    });

    test('rolls back the balance deduction if creating the unlock record fails', async () => {
        const db = createFakeShardDb();
        db._seedBalance(USER_ID, 100);
        const service = createShardService(db);

        const originalGetConnection = db.getConnection.bind(db);
        db.getConnection = async () => {
            const connection = await originalGetConnection();
            const originalQuery = connection.query.bind(connection);
            connection.query = async (sql, params) => {
                if (sql.toUpperCase().includes('INSERT INTO COUNSELLING_UNLOCKS')) {
                    throw new Error('simulated unlock write failure');
                }
                return originalQuery(sql, params);
            };
            return connection;
        };

        await assert.rejects(() =>
            service.redeemShardsForCounsellingUnlock(USER_ID, {
                sessionType: 'standard-session',
                shardCost: 40,
                referenceId: 'unlock-1',
            })
        );

        assert.equal(db._state.balances.get(USER_ID), 100);
        assert.equal(db._state.transactions.length, 0);
        assert.equal(db._state.unlocks.length, 0);
    });

    test('replaying the same referenceId is idempotent and does not double-charge', async () => {
        const db = createFakeShardDb();
        db._seedBalance(USER_ID, 100);
        const service = createShardService(db);

        const first = await service.redeemShardsForCounsellingUnlock(USER_ID, {
            sessionType: 'standard-session',
            shardCost: 40,
            referenceId: 'unlock-1',
        });
        const replay = await service.redeemShardsForCounsellingUnlock(USER_ID, {
            sessionType: 'standard-session',
            shardCost: 40,
            referenceId: 'unlock-1',
        });

        assert.equal(first.duplicate, false);
        assert.equal(replay.duplicate, true);
        assert.equal(db._state.balances.get(USER_ID), 60);
        assert.equal(db._state.transactions.length, 1);
        assert.equal(db._state.unlocks.length, 1);
    });

    test('concurrent redemptions cannot overdraw the balance (no double-spend)', async () => {
        const db = createFakeShardDb();
        db._seedBalance(USER_ID, 100);
        const service = createShardService(db);

        const attempt = (referenceId) =>
            service
                .redeemShardsForCounsellingUnlock(USER_ID, {
                    sessionType: 'standard-session',
                    shardCost: 80,
                    referenceId,
                })
                .then((r) => ({ ok: true, r }))
                .catch((error) => ({ ok: false, error }));

        const [first, second] = await Promise.all([attempt('unlock-a'), attempt('unlock-b')]);
        const results = [first, second];

        const succeeded = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);

        assert.equal(succeeded.length, 1, 'only one of the two competing redemptions should succeed');
        assert.equal(failed.length, 1);
        assert.ok(failed[0].error instanceof InsufficientShardsError);

        assert.equal(db._state.balances.get(USER_ID), 20);
        assert.equal(db._state.transactions.length, 1);
        assert.equal(db._state.unlocks.length, 1);
        assert.ok(db._state.balances.get(USER_ID) >= 0);
    });
});
