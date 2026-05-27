import { vi } from 'vitest';

const mockRedisClient = {
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
    mget: vi.fn().mockResolvedValue([]),
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
};

// Both paths are needed: test files under src/tests/ resolve to '../../utils/redis',
// while test files under src/ai/tests/ resolve to '../utils/redis' from this setup file.
vi.mock('../../utils/redis', () => mockModule);
vi.mock('../utils/redis', () => mockModule);
