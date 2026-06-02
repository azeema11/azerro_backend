import { vi } from 'vitest';

const mockRedisClient = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    mget: vi.fn().mockResolvedValue([]),
    del: vi.fn().mockResolvedValue(0),
    incr: vi.fn().mockResolvedValue(1),
    expire: vi.fn().mockResolvedValue(1),
    pipeline: vi.fn(() => ({
        setex: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
    })),
    on: vi.fn(),
};

const mockModule = {
    default: mockRedisClient,
    safeGet: vi.fn().mockResolvedValue(null),
    safeSetex: vi.fn().mockResolvedValue(undefined),
    safeMget: vi.fn().mockImplementation((keys: string[]) =>
        Promise.resolve(new Array(keys.length).fill(null))
    ),
    safeBatchSetex: vi.fn().mockResolvedValue(undefined),
    safeDel: vi.fn().mockResolvedValue(undefined),
    safeIncr: vi.fn().mockResolvedValue(1),
    safeExpire: vi.fn().mockResolvedValue(undefined),
    safeIncrWithTTL: vi.fn().mockResolvedValue(1),
    safeTtl: vi.fn().mockResolvedValue(0),
    withCache: vi.fn().mockImplementation(async (_key: string, _ttl: number, fn: () => Promise<any>) => fn()),
};

// Both paths are needed: test files under src/tests/ resolve to '../../utils/redis',
// while test files under src/ai/tests/ resolve to '../utils/redis' from this setup file.
vi.mock('../../utils/redis', () => mockModule);
vi.mock('../utils/redis', () => mockModule);
