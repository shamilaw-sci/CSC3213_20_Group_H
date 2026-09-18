import shardService from '../services/shardService.js';
import { ShardValidationError, InsufficientShardsError } from '../services/shardErrors.js';

function handleError(res, error, fallbackMessage) {
    if (error instanceof ShardValidationError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    if (error instanceof InsufficientShardsError) {
        return res.status(error.statusCode).json({ message: error.message });
    }
    console.error(fallbackMessage, error);
    return res.status(500).json({ message: fallbackMessage });
}

export const getBalance = async (req, res) => {
    try {
        const balance = await shardService.getBalance(req.user.id);
        return res.status(200).json({ balance });
    } catch (error) {
        return handleError(res, error, 'Failed to retrieve Clarity Shard balance.');
    }
};

export const earnShards = async (req, res) => {
    const { amount, reason, referenceId } = req.body || {};
    try {
        const result = await shardService.earnShards(req.user.id, { amount, reason, referenceId });
        return res.status(result.duplicate ? 200 : 201).json({
            message: result.duplicate
                ? 'Reward already recorded for this activity.'
                : 'Clarity Shards awarded.',
            balance: result.balance,
            transactionId: result.transactionId,
        });
    } catch (error) {
        return handleError(res, error, 'Failed to award Clarity Shards.');
    }
};

export const redeemForCounsellingUnlock = async (req, res) => {
    const { sessionType, shardCost, referenceId } = req.body || {};
    try {
        const result = await shardService.redeemShardsForCounsellingUnlock(req.user.id, {
            sessionType,
            shardCost,
            referenceId,
        });
        return res.status(result.duplicate ? 200 : 201).json({
            message: result.duplicate
                ? 'Counselling session was already unlocked for this request.'
                : 'Counselling session unlocked.',
            balance: result.balance,
            transactionId: result.transactionId,
            unlockId: result.unlockId,
        });
    } catch (error) {
        return handleError(res, error, 'Failed to unlock counselling session.');
    }
};
