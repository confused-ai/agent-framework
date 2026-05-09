/**
 * @confused-ai/video — VideoOrchestrator conformance tests
 *
 * Network and ffmpeg calls are NOT made. Tests exercise:
 *  - Constructor (creates temp dir)
 *  - generateShort() returns {success: false} when OPENAI_API_KEY is absent
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { VideoOrchestrator } from '@confused-ai/video';

describe('VideoOrchestrator', () => {
    const savedKey = process.env['OPENAI_API_KEY'];

    beforeEach(() => {
        delete process.env['OPENAI_API_KEY'];
        delete process.env['PEXELS_API_KEY'];
    });

    afterEach(() => {
        if (savedKey !== undefined) {
            process.env['OPENAI_API_KEY'] = savedKey;
        }
    });

    it('constructs without throwing', () => {
        expect(() => new VideoOrchestrator()).not.toThrow();
    });

    it('is an object with a generateShort method', () => {
        const orchestrator = new VideoOrchestrator();
        expect(typeof orchestrator.generateShort).toBe('function');
    });

    it('creates a temp_videos directory on construction', () => {
        new VideoOrchestrator();
        const tempDir = path.join(process.cwd(), 'temp_videos');
        expect(fs.existsSync(tempDir)).toBe(true);
    });

    describe('generateShort()', () => {
        it('returns {success: false} when OPENAI_API_KEY is not set', async () => {
            const orchestrator = new VideoOrchestrator();
            const result = await orchestrator.generateShort('test topic');
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(typeof result.error).toBe('string');
        }, 10_000);

        it('error message mentions OPENAI_API_KEY', async () => {
            const orchestrator = new VideoOrchestrator();
            const result = await orchestrator.generateShort('AI trends');
            expect(result.success).toBe(false);
            expect(result.error).toMatch(/OPENAI_API_KEY/i);
        }, 10_000);

        it('never throws — always returns a result object', async () => {
            const orchestrator = new VideoOrchestrator();
            const result = await orchestrator.generateShort('any topic');
            // generateShort() is designed to catch all errors and return a result
            expect(result).toHaveProperty('success');
            expect(typeof result.success).toBe('boolean');
        }, 10_000);

        it('result does not include videoPath on failure', async () => {
            const orchestrator = new VideoOrchestrator();
            const result = await orchestrator.generateShort('some topic');
            expect(result.success).toBe(false);
            expect(result.videoPath).toBeUndefined();
        }, 10_000);
    });
});
