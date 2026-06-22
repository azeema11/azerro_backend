import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockGet, mockSetex, mockMget, mockPipeline, mockPipelineSetex, mockPipelineExec } = vi.hoisted(() => {
    const mockPipelineSetex = vi.fn().mockReturnThis();
    const mockPipelineExec = vi.fn().mockResolvedValue([]);
    return {
        mockGet: vi.fn(),
        mockSetex: vi.fn(),
        mockMget: vi.fn(),
        mockPipelineSetex,
        mockPipelineExec,
        mockPipeline: vi.fn(() => ({
            setex: mockPipelineSetex,
            exec: mockPipelineExec,
        })),
    };
});

vi.mock('ioredis', () => {
    const RedisMock = function () {
        return {
            get: mockGet,
            setex: mockSetex,
            mget: mockMget,
            pipeline: mockPipeline,
            on: vi.fn(),
        };
    };
    return { default: RedisMock };
});

// Override the global setupFile mock to use the real wrapper implementations
vi.mock('../../../utils/redis', async (importOriginal) => {
    return await importOriginal();
});

import { safeGet, safeSetex, safeMget, safeBatchSetex } from '../../../utils/redis';

describe('Redis Resilient Wrappers', () => {
    let consoleErrorSpy: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockPipeline.mockImplementation(() => ({
            setex: mockPipelineSetex,
            exec: mockPipelineExec,
        }));
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        consoleErrorSpy.mockRestore();
    });

    describe('safeGet', () => {
        it('should return cached value on success', async () => {
            mockGet.mockResolvedValue('42.5');
            const result = await safeGet('rate:USD:EUR');
            expect(result).toBe('42.5');
            expect(mockGet).toHaveBeenCalledWith('rate:USD:EUR');
        });

        it('should return null on Redis error', async () => {
            mockGet.mockRejectedValue(new Error('Connection refused'));
            const result = await safeGet('rate:USD:EUR');
            expect(result).toBeNull();
        });
    });

    describe('safeSetex', () => {
        it('should call setex on success', async () => {
            mockSetex.mockResolvedValue('OK');
            await safeSetex('rate:USD:EUR', 3600, '1.08');
            expect(mockSetex).toHaveBeenCalledWith('rate:USD:EUR', 3600, '1.08');
        });

        it('should silently continue on Redis error', async () => {
            mockSetex.mockRejectedValue(new Error('Connection refused'));
            await expect(safeSetex('rate:USD:EUR', 3600, '1.08')).resolves.toBeUndefined();
        });
    });

    describe('safeMget', () => {
        it('should return array of values on success', async () => {
            mockMget.mockResolvedValue(['1.08', null, '0.85']);
            const result = await safeMget(['rate:USD:EUR', 'rate:USD:GBP', 'rate:USD:JPY']);
            expect(result).toEqual(['1.08', null, '0.85']);
        });

        it('should return array of nulls matching input length on Redis error', async () => {
            mockMget.mockRejectedValue(new Error('Connection refused'));
            const keys = ['rate:USD:EUR', 'rate:USD:GBP'];
            const result = await safeMget(keys);
            expect(result).toEqual([null, null]);
            expect(result).toHaveLength(keys.length);
        });
    });

    describe('safeBatchSetex', () => {
        it('should pipeline setex commands on success', async () => {
            const entries = [
                { key: 'rate:USD:EUR', ttl: 3600, value: '1.08' },
                { key: 'rate:USD:GBP', ttl: 3600, value: '0.85' },
            ];
            await safeBatchSetex(entries);

            expect(mockPipeline).toHaveBeenCalled();
            expect(mockPipelineSetex).toHaveBeenCalledTimes(2);
            expect(mockPipelineSetex).toHaveBeenCalledWith('rate:USD:EUR', 3600, '1.08');
            expect(mockPipelineSetex).toHaveBeenCalledWith('rate:USD:GBP', 3600, '0.85');
            expect(mockPipelineExec).toHaveBeenCalled();
        });

        it('should silently continue on pipeline construction error', async () => {
            mockPipeline.mockImplementationOnce(() => { throw new Error('Connection refused'); });
            await expect(
                safeBatchSetex([{ key: 'rate:USD:EUR', ttl: 3600, value: '1.08' }])
            ).resolves.toBeUndefined();
        });

        it('should silently continue on pipeline exec error', async () => {
            mockPipelineExec.mockRejectedValueOnce(new Error('Exec failed'));
            await expect(
                safeBatchSetex([{ key: 'rate:USD:EUR', ttl: 3600, value: '1.08' }])
            ).resolves.toBeUndefined();
        });
    });
});
