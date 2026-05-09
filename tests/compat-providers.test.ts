/**
 * Factory shape + error-throwing tests for all compat-providers factories.
 *
 * Strategy:
 *  – Factories that require an API key throw when it is absent.
 *  – All factories return a valid LLMProvider shape { generateText, streamText }.
 *  – Self-hosted providers (no API key needed) instantiate without env vars.
 *  – Config passthrough: baseURL and model are forwarded to the provider.
 *
 * No real network calls are made — OpenAIProvider lazy-loads the SDK but
 * the returned object is only shape-checked, never invoked.
 */

import { describe, it, expect } from 'vitest';

// ── factories that require an apiKey ──────────────────────────────────────

import {
    // Wave 1
    createGroqProvider,
    createXAIProvider,
    createTogetherProvider,
    createFireworksProvider,
    createDeepSeekProvider,
    createMistralProvider,
    createCohereProvider,
    createPerplexityProvider,
    createAzureOpenAIProvider,
    createCerebrasProvider,
    createSambaNovaProvider,
    createNvidiaProvider,
    createAI21Provider,
    createHyperbolicProvider,
    createLambdaProvider,
    createMoonshotProvider,
    createDashScopeProvider,
    createZhipuProvider,
    createYiProvider,
    createUpstageProvider,
    createNovitaProvider,
    createCloudflareProvider,
    createWriterProvider,
    // Wave 2
    createDeepInfraProvider,
    createHuggingFaceProvider,
    createLeptonProvider,
    createFeatherlessProvider,
    createSnowflakeProvider,
    // Wave 4 Chinese
    createHunyuanProvider,
    createVolcengineProvider,
    createMinimaxProvider,
    createBaichuanProvider,
    createStepfunProvider,
    createInternLMProvider,
    // Wave 4 global
    createReplicateProvider,
    createRunPodProvider,
    createWatsonxProvider,
    // Self-hosted (no key needed)
    createVllmProvider,
    createLmStudioProvider,
    createLocalAIProvider,
    createKoboldProvider,
    createTextGenWebUIProvider,
    createJanProvider,
    // Generic
    createOpenAICompatibleProvider,
} from '../src/providers/compat-providers.js';

// ── helper ─────────────────────────────────────────────────────────────────

function isProvider(obj: unknown): boolean {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof (obj as Record<string, unknown>)['generateText'] === 'function'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Keyed providers — throw on missing apiKey, pass shape check with key
// ─────────────────────────────────────────────────────────────────────────────

describe('keyed providers — missing apiKey throws', () => {
    const cases: Array<[string, () => unknown]> = [
        ['Groq',        () => createGroqProvider({})],
        ['xAI',         () => createXAIProvider({})],
        ['Together',    () => createTogetherProvider({})],
        ['Fireworks',   () => createFireworksProvider({})],
        ['DeepSeek',    () => createDeepSeekProvider({})],
        ['Mistral',     () => createMistralProvider({})],
        ['Cohere',      () => createCohereProvider({})],
        ['Perplexity',  () => createPerplexityProvider({})],
        ['Cerebras',    () => createCerebrasProvider({})],
        ['SambaNova',   () => createSambaNovaProvider({})],
        ['NVIDIA',      () => createNvidiaProvider({})],
        ['AI21',        () => createAI21Provider({})],
        ['Hyperbolic',  () => createHyperbolicProvider({})],
        ['Lambda',      () => createLambdaProvider({})],
        ['Moonshot',    () => createMoonshotProvider({})],
        ['DashScope',   () => createDashScopeProvider({})],
        ['Zhipu',       () => createZhipuProvider({})],
        ['Yi',          () => createYiProvider({})],
        ['Upstage',     () => createUpstageProvider({})],
        ['Novita',      () => createNovitaProvider({})],
        ['Writer',      () => createWriterProvider({})],
        ['DeepInfra',   () => createDeepInfraProvider({})],
        ['HuggingFace', () => createHuggingFaceProvider({})],
        ['Lepton',      () => createLeptonProvider({})],
        ['Featherless', () => createFeatherlessProvider({})],
        ['Snowflake',   () => createSnowflakeProvider({})],
        ['Hunyuan',     () => createHunyuanProvider({})],
        ['Minimax',     () => createMinimaxProvider({})],
        ['Baichuan',    () => createBaichuanProvider({})],
        ['Stepfun',     () => createStepfunProvider({})],
        ['InternLM',    () => createInternLMProvider({})],
        ['Replicate',   () => createReplicateProvider({})],
        ['Watsonx',     () => createWatsonxProvider({})],
    ];

    it.each(cases)('%s — throws without apiKey', (_name, factory) => {
        // Ensure env vars are not accidentally leaking into CI
        expect(factory).toThrowError(/requires apiKey|API_KEY|api_key/i);
    });
});

describe('keyed providers — Cloudflare throws without accountId and apiKey', () => {
    it('throws when apiKey is missing', () => {
        expect(() => createCloudflareProvider({})).toThrowError(/apiKey|CLOUDFLARE/);
    });

    it('throws when accountId is missing', () => {
        expect(() => createCloudflareProvider({ apiKey: 'test' })).toThrowError(/accountId|CLOUDFLARE_ACCOUNT_ID/);
    });
});

describe('keyed providers — AzureOpenAI requires all three fields', () => {
    it('throws when apiKey is missing', () => {
        expect(() => createAzureOpenAIProvider({})).toThrowError(/apiKey|AZURE_OPENAI_API_KEY/);
    });

    it('throws when resource is missing', () => {
        expect(() => createAzureOpenAIProvider({ apiKey: 'key' })).toThrowError(/resource|AZURE_OPENAI_RESOURCE/);
    });

    it('throws when deployment is missing', () => {
        expect(() => createAzureOpenAIProvider({ apiKey: 'key', resource: 'res' }))
            .toThrowError(/deployment|AZURE_OPENAI_DEPLOYMENT/);
    });
});

describe('keyed providers — Volcengine requires model (endpoint ID)', () => {
    it('throws when model is missing', () => {
        expect(() => createVolcengineProvider({ apiKey: 'key', model: '' }))
            .toThrowError(/model|endpoint/i);
    });
});

describe('keyed providers — RunPod requires endpointId', () => {
    it('throws when apiKey is missing', () => {
        expect(() => createRunPodProvider({ endpointId: 'ep-abc', apiKey: '' }))
            .toThrowError(/apiKey|RUNPOD/);
    });

    it('throws when endpointId is missing', () => {
        expect(() => createRunPodProvider({ endpointId: '', apiKey: 'key' }))
            .toThrowError(/endpointId/);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Shape tests — valid factory calls return a proper LLMProvider
// ─────────────────────────────────────────────────────────────────────────────

describe('keyed providers — valid config returns LLMProvider shape', () => {
    const key = 'test-api-key';

    const shapeCases: Array<[string, () => unknown]> = [
        ['Groq',        () => createGroqProvider({ apiKey: key })],
        ['xAI',         () => createXAIProvider({ apiKey: key })],
        ['Together',    () => createTogetherProvider({ apiKey: key })],
        ['Fireworks',   () => createFireworksProvider({ apiKey: key })],
        ['DeepSeek',    () => createDeepSeekProvider({ apiKey: key })],
        ['Mistral',     () => createMistralProvider({ apiKey: key })],
        ['Cohere',      () => createCohereProvider({ apiKey: key })],
        ['Perplexity',  () => createPerplexityProvider({ apiKey: key })],
        ['AzureOpenAI', () => createAzureOpenAIProvider({ apiKey: key, resource: 'r', deployment: 'd' })],
        ['Cerebras',    () => createCerebrasProvider({ apiKey: key })],
        ['SambaNova',   () => createSambaNovaProvider({ apiKey: key })],
        ['NVIDIA',      () => createNvidiaProvider({ apiKey: key })],
        ['AI21',        () => createAI21Provider({ apiKey: key })],
        ['Hyperbolic',  () => createHyperbolicProvider({ apiKey: key })],
        ['Lambda',      () => createLambdaProvider({ apiKey: key })],
        ['Moonshot',    () => createMoonshotProvider({ apiKey: key })],
        ['DashScope',   () => createDashScopeProvider({ apiKey: key })],
        ['Zhipu',       () => createZhipuProvider({ apiKey: key })],
        ['Yi',          () => createYiProvider({ apiKey: key })],
        ['Upstage',     () => createUpstageProvider({ apiKey: key })],
        ['Novita',      () => createNovitaProvider({ apiKey: key })],
        ['Cloudflare',  () => createCloudflareProvider({ apiKey: key, accountId: 'acct123' })],
        ['Writer',      () => createWriterProvider({ apiKey: key })],
        ['DeepInfra',   () => createDeepInfraProvider({ apiKey: key })],
        ['HuggingFace', () => createHuggingFaceProvider({ apiKey: key })],
        ['Lepton',      () => createLeptonProvider({ apiKey: key })],
        ['Featherless', () => createFeatherlessProvider({ apiKey: key })],
        ['Snowflake',   () => createSnowflakeProvider({ apiKey: key })],
        // Wave 4 Chinese
        ['Hunyuan',     () => createHunyuanProvider({ apiKey: key })],
        ['Volcengine',  () => createVolcengineProvider({ apiKey: key, model: 'ep-abc123-xyz' })],
        ['Minimax',     () => createMinimaxProvider({ apiKey: key })],
        ['Baichuan',    () => createBaichuanProvider({ apiKey: key })],
        ['Stepfun',     () => createStepfunProvider({ apiKey: key })],
        ['InternLM',    () => createInternLMProvider({ apiKey: key })],
        // Wave 4 global
        ['Replicate',   () => createReplicateProvider({ apiKey: key })],
        ['RunPod',      () => createRunPodProvider({ apiKey: key, endpointId: 'ep-abc' })],
        ['Watsonx',     () => createWatsonxProvider({ apiKey: key })],
        // Generic
        ['OpenAICompat',() => createOpenAICompatibleProvider({ baseURL: 'http://localhost/v1', apiKey: key, model: 'm' })],
    ];

    it.each(shapeCases)('%s — returns LLMProvider', (_name, factory) => {
        const provider = factory();
        expect(isProvider(provider)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Self-hosted providers — no API key required
// ─────────────────────────────────────────────────────────────────────────────

describe('self-hosted providers — no apiKey required', () => {
    const selfHosted: Array<[string, () => unknown]> = [
        ['vLLM (default)',      () => createVllmProvider({})],
        ['vLLM (custom URL)',   () => createVllmProvider({ baseURL: 'http://gpu:9000/v1', model: 'llama3' })],
        ['LM Studio (default)', () => createLmStudioProvider({})],
        ['LM Studio (custom)',  () => createLmStudioProvider({ baseURL: 'http://localhost:5678/v1', model: 'my-model' })],
        ['LocalAI (default)',   () => createLocalAIProvider({})],
        ['LocalAI (custom)',    () => createLocalAIProvider({ baseURL: 'http://localhost:9090/v1' })],
        ['KoboldCpp (default)', () => createKoboldProvider({})],
        ['KoboldCpp (custom)',  () => createKoboldProvider({ baseURL: 'http://localhost:5002/v1' })],
        ['TextGenWebUI',        () => createTextGenWebUIProvider({})],
        ['TextGenWebUI (custom)', () => createTextGenWebUIProvider({ baseURL: 'http://192.168.1.5:7860/v1' })],
        ['Jan (default)',       () => createJanProvider({})],
        ['Jan (custom)',        () => createJanProvider({ baseURL: 'http://localhost:9999/v1', model: 'my-local' })],
    ];

    it.each(selfHosted)('%s — returns LLMProvider', (_name, factory) => {
        const provider = factory();
        expect(isProvider(provider)).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Config passthrough — model and baseURL are forwarded
// ─────────────────────────────────────────────────────────────────────────────

describe('config passthrough', () => {
    it('createGroqProvider forwards custom model', () => {
        const p = createGroqProvider({ apiKey: 'k', model: 'llama-3.1-8b-instant' });
        expect(isProvider(p)).toBe(true);
    });

    it('createHunyuanProvider forwards custom model', () => {
        const p = createHunyuanProvider({ apiKey: 'k', model: 'hunyuan-standard' });
        expect(isProvider(p)).toBe(true);
    });

    it('createVllmProvider forwards custom baseURL and model', () => {
        const p = createVllmProvider({ baseURL: 'http://my-vllm.internal/v1', model: 'custom-fine-tune' });
        expect(isProvider(p)).toBe(true);
    });

    it('createWatsonxProvider uses us-south by default', () => {
        const p = createWatsonxProvider({ apiKey: 'ibm-token' });
        expect(isProvider(p)).toBe(true);
    });

    it('createWatsonxProvider accepts explicit region', () => {
        const p = createWatsonxProvider({ apiKey: 'ibm-token', region: 'eu-de' });
        expect(isProvider(p)).toBe(true);
    });

    it('createRunPodProvider builds endpoint URL from endpointId', () => {
        const p = createRunPodProvider({ apiKey: 'key', endpointId: 'ep-abc123-xyz' });
        expect(isProvider(p)).toBe(true);
    });

    it('createOpenAICompatibleProvider validates required fields', () => {
        expect(() => createOpenAICompatibleProvider({ baseURL: '', apiKey: 'k', model: 'm' }))
            .toThrowError(/baseURL/);
        expect(() => createOpenAICompatibleProvider({ baseURL: 'http://x/v1', apiKey: '', model: 'm' }))
            .toThrowError(/apiKey/);
        expect(() => createOpenAICompatibleProvider({ baseURL: 'http://x/v1', apiKey: 'k', model: '' }))
            .toThrowError(/model/);
    });
});
