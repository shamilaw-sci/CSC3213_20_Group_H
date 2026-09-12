export class ShardValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ShardValidationError';
        this.statusCode = 400;
    }
}

export class InsufficientShardsError extends Error {
    constructor(message = 'Insufficient Clarity Shard balance.') {
        super(message);
        this.name = 'InsufficientShardsError';
        this.statusCode = 409;
    }
}
