import { vi } from 'vitest';

vi.mock('../../utils/redis', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        mget: vi.fn().mockResolvedValue([]),
        multi: vi.fn(() => ({
            setex: vi.fn(),
            exec: vi.fn().mockResolvedValue([]),
        })),
        on: vi.fn(),
    }
}));

vi.mock('../utils/redis', () => ({
    default: {
        get: vi.fn().mockResolvedValue(null),
        setex: vi.fn().mockResolvedValue('OK'),
        mget: vi.fn().mockResolvedValue([]),
        multi: vi.fn(() => ({
            setex: vi.fn(),
            exec: vi.fn().mockResolvedValue([]),
        })),
        on: vi.fn(),
    }
}));
