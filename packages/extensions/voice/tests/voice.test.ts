/**
 * @confused-ai/voice — VoiceProvider + VoiceStreamSession conformance tests
 *
 * Network calls are never made. OpenAI/ElevenLabs providers are mocked
 * or exercised only via the static `listVoices()` path (no HTTP).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
    OpenAIVoiceProvider,
    ElevenLabsVoiceProvider,
    createVoiceProvider,
    VoiceStreamSession,
} from '@confused-ai/voice';
import type { VoiceProvider, TTSResult, STTResult } from '@confused-ai/voice';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTTSResult(text: string): TTSResult {
    const audio = new TextEncoder().encode(text).buffer as ArrayBuffer;
    return { audio, format: 'mp3', characterCount: text.length };
}

function makeSTTResult(text: string): STTResult {
    return { text, language: 'en' };
}

/** Minimal mock that satisfies VoiceProvider */
function mockProvider(
    sttText: string | Error,
    ttsText = 'audio-data',
): VoiceProvider {
    return {
        async textToSpeech(text) {
            return makeTTSResult(ttsText);
        },
        async speechToText(_audio) {
            if (sttText instanceof Error) throw sttText;
            return makeSTTResult(sttText);
        },
    };
}

// ── OpenAIVoiceProvider ───────────────────────────────────────────────────────

describe('OpenAIVoiceProvider', () => {
    beforeEach(() => {
        delete process.env['OPENAI_API_KEY'];
    });

    it('constructs with an explicit apiKey', () => {
        const provider = new OpenAIVoiceProvider({ apiKey: 'sk-test-123' });
        expect(provider).toBeInstanceOf(OpenAIVoiceProvider);
    });

    it('constructs using OPENAI_API_KEY env var', () => {
        process.env['OPENAI_API_KEY'] = 'sk-env-key';
        expect(() => new OpenAIVoiceProvider()).not.toThrow();
        delete process.env['OPENAI_API_KEY'];
    });

    it('throws when no API key is available', () => {
        expect(() => new OpenAIVoiceProvider()).toThrow(/api key/i);
    });

    it('throws when apiKey is empty string', () => {
        expect(() => new OpenAIVoiceProvider({ apiKey: '' })).toThrow(/api key/i);
    });

    describe('listVoices()', () => {
        it('returns 6 static voice entries without an HTTP call', async () => {
            const provider = new OpenAIVoiceProvider({ apiKey: 'sk-test' });
            const voices = await provider.listVoices();
            expect(voices).toHaveLength(6);
        });

        it('voice entries have id and name', async () => {
            const provider = new OpenAIVoiceProvider({ apiKey: 'sk-test' });
            const voices = await provider.listVoices();
            for (const v of voices) {
                expect(v).toHaveProperty('id');
                expect(v).toHaveProperty('name');
                expect(v.id.length).toBeGreaterThan(0);
                expect(v.name.length).toBeGreaterThan(0);
            }
        });

        it('includes the "nova" voice', async () => {
            const provider = new OpenAIVoiceProvider({ apiKey: 'sk-test' });
            const voices = await provider.listVoices();
            const ids = voices.map((v) => v.id);
            expect(ids).toContain('nova');
        });

        it('includes all 6 standard OpenAI voices', async () => {
            const provider = new OpenAIVoiceProvider({ apiKey: 'sk-test' });
            const voices = await provider.listVoices();
            const ids = voices.map((v) => v.id);
            for (const expected of ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']) {
                expect(ids).toContain(expected);
            }
        });
    });
});

// ── ElevenLabsVoiceProvider ───────────────────────────────────────────────────

describe('ElevenLabsVoiceProvider', () => {
    it('constructs without an API key (no throw)', () => {
        expect(() => new ElevenLabsVoiceProvider()).not.toThrow();
    });

    it('constructs with an explicit apiKey', () => {
        const provider = new ElevenLabsVoiceProvider({ apiKey: 'el-test-key' });
        expect(provider).toBeInstanceOf(ElevenLabsVoiceProvider);
    });

    it('is a VoiceProvider (has textToSpeech)', () => {
        const provider = new ElevenLabsVoiceProvider({ apiKey: 'el-test' });
        expect(typeof provider.textToSpeech).toBe('function');
    });
});

// ── createVoiceProvider ───────────────────────────────────────────────────────

describe('createVoiceProvider()', () => {
    beforeEach(() => {
        delete process.env['OPENAI_API_KEY'];
    });

    it('returns an OpenAIVoiceProvider for provider="openai"', () => {
        const p = createVoiceProvider({ provider: 'openai', apiKey: 'sk-test' });
        expect(p).toBeInstanceOf(OpenAIVoiceProvider);
    });

    it('returns an ElevenLabsVoiceProvider for provider="elevenlabs"', () => {
        const p = createVoiceProvider({ provider: 'elevenlabs', apiKey: 'el-test' });
        expect(p).toBeInstanceOf(ElevenLabsVoiceProvider);
    });

    it('throws for unknown provider "custom"', () => {
        expect(() =>
            createVoiceProvider({ provider: 'custom' as any }),
        ).toThrow(/unknown voice provider/i);
    });

    it('throws for openai without apiKey when env not set', () => {
        expect(() =>
            createVoiceProvider({ provider: 'openai' }),
        ).toThrow(/api key/i);
    });
});

// ── VoiceStreamSession ────────────────────────────────────────────────────────

describe('VoiceStreamSession', () => {
    it('constructs with stt + tts + run', () => {
        const stt = mockProvider('hello');
        const tts = mockProvider('');
        const session = new VoiceStreamSession({
            stt,
            tts,
            run: async (text) => `Echo: ${text}`,
            silenceThresholdMs: 10,
        });
        expect(session).toBeInstanceOf(VoiceStreamSession);
    });

    it('accepts sessionId option', () => {
        const session = new VoiceStreamSession({
            stt: mockProvider('hi'),
            tts: mockProvider('hi'),
            run: async (t) => t,
            sessionId: 'test-session-abc',
        });
        expect(session).toBeDefined();
    });

    it('end() resolves immediately when no audio was pushed', async () => {
        const session = new VoiceStreamSession({
            stt: mockProvider(''),
            tts: mockProvider(''),
            run: async (t) => t,
            silenceThresholdMs: 10,
        });
        await expect(session.end()).resolves.toBeUndefined();
    });

    it('pushChunk() accepts Uint8Array without throwing', () => {
        const session = new VoiceStreamSession({
            stt: mockProvider('hello'),
            tts: mockProvider(''),
            run: async (t) => t,
            silenceThresholdMs: 1000,
        });
        expect(() =>
            session.pushChunk(new Uint8Array([1, 2, 3])),
        ).not.toThrow();
        // must call end() to flush the silence timer
        void session.end();
    });

    it('pushChunk() accepts ArrayBuffer without throwing', () => {
        const session = new VoiceStreamSession({
            stt: mockProvider('hello'),
            tts: mockProvider(''),
            run: async (t) => t,
            silenceThresholdMs: 1000,
        });
        const buf = new Uint8Array([4, 5, 6]).buffer;
        expect(() => session.pushChunk(buf)).not.toThrow();
        void session.end();
    });

    it('ignores pushChunk() after end()', async () => {
        const session = new VoiceStreamSession({
            stt: mockProvider('hello'),
            tts: mockProvider(''),
            run: async (t) => t,
            silenceThresholdMs: 5,
        });
        await session.end();
        // should not throw
        expect(() =>
            session.pushChunk(new Uint8Array([1, 2, 3])),
        ).not.toThrow();
    });

    describe('events() — full round-trip with mocked providers', () => {
        it('emits transcript → agent_start → text_delta(s) → agent_end → audio events', async () => {
            const stt = mockProvider('hello world');
            const tts = mockProvider('', 'audio-data');
            const run = vi.fn(async (text: string) => `Echo: ${text}`);

            const session = new VoiceStreamSession({
                stt,
                tts,
                run,
                silenceThresholdMs: 10,
                voiceId: 'alloy',
            });

            // Push a chunk — triggers utterance processing after silenceThresholdMs
            session.pushChunk(new Uint8Array([1, 2, 3]));

            const events = session.events();
            // Collect all events until the session ends
            const collected: string[] = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of events) {
                collected.push(evt.type);
            }

            expect(run).toHaveBeenCalledWith('hello world');
            expect(collected).toContain('transcript');
            expect(collected).toContain('agent_start');
            expect(collected).toContain('text_delta');
            expect(collected).toContain('agent_end');
            expect(collected).toContain('audio');
        }, 3000);

        it('transcript event carries the STT text', async () => {
            const stt = mockProvider('test transcript text');
            const tts = mockProvider('', 'audio');

            const session = new VoiceStreamSession({
                stt,
                tts,
                run: async (t) => `reply: ${t}`,
                silenceThresholdMs: 10,
            });

            session.pushChunk(new Uint8Array([0xff]));

            const transcriptTexts: string[] = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of session.events()) {
                if (evt.type === 'transcript') {
                    transcriptTexts.push(evt.text ?? '');
                }
            }

            expect(transcriptTexts).toContain('test transcript text');
        }, 3000);

        it('emits error event when STT throws', async () => {
            const stt = mockProvider(new Error('STT service unavailable'));
            const tts = mockProvider('', 'audio');

            const session = new VoiceStreamSession({
                stt,
                tts,
                run: async (t) => t,
                silenceThresholdMs: 10,
            });

            session.pushChunk(new Uint8Array([1]));

            const errorEvents: string[] = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of session.events()) {
                if (evt.type === 'error') {
                    errorEvents.push(evt.error ?? '');
                }
            }

            expect(errorEvents.length).toBeGreaterThan(0);
            expect(errorEvents[0]).toContain('STT');
        }, 3000);

        it('emits error event when agent run() throws', async () => {
            const stt = mockProvider('some input');
            const tts = mockProvider('', 'audio');

            const session = new VoiceStreamSession({
                stt,
                tts,
                run: async (_t) => { throw new Error('Agent crashed'); },
                silenceThresholdMs: 10,
            });

            session.pushChunk(new Uint8Array([1]));

            const errorEvents: string[] = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of session.events()) {
                if (evt.type === 'error') {
                    errorEvents.push(evt.error ?? '');
                }
            }

            expect(errorEvents.length).toBeGreaterThan(0);
            expect(errorEvents[0]).toContain('Agent');
        }, 3000);

        it('emits no transcript when STT returns empty string', async () => {
            const stt = mockProvider('');  // empty transcript
            const tts = mockProvider('', 'audio');

            const session = new VoiceStreamSession({
                stt,
                tts,
                run: async (t) => t,
                silenceThresholdMs: 10,
            });

            session.pushChunk(new Uint8Array([1]));

            const transcripts: string[] = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of session.events()) {
                if (evt.type === 'transcript') {
                    transcripts.push(evt.text ?? '');
                }
            }

            // empty STT result → no utterance processing, no transcript event
            expect(transcripts).toHaveLength(0);
        }, 3000);

        it('all events have a ts (timestamp) field', async () => {
            const stt = mockProvider('ts test');
            const tts = mockProvider('', 'audio');

            const session = new VoiceStreamSession({
                stt,
                tts,
                run: async (t) => `${t} replied`,
                silenceThresholdMs: 10,
            });

            session.pushChunk(new Uint8Array([1]));

            const events: Array<{ type: string; ts: number }> = [];
            setTimeout(() => { void session.end(); }, 100);

            for await (const evt of session.events()) {
                events.push({ type: evt.type, ts: evt.ts });
            }

            expect(events.length).toBeGreaterThan(0);
            for (const e of events) {
                expect(typeof e.ts).toBe('number');
                expect(e.ts).toBeGreaterThan(0);
            }
        }, 3000);
    });
});
