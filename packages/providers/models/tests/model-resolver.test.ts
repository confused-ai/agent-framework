/**
 * Tests for packages/providers/models/src/model-resolver.ts
 *
 * Coverage:
 *  – PROVIDER enum completeness (50+ providers)
 *  – Base URL constants are well-formed
 *  – isModelString()
 *  – resolveModelString() for every supported provider
 *
 * No API keys / network calls required.
 */

import { describe, it, expect } from 'vitest';
import {
    resolveModelString,
    isModelString,
    PROVIDER,
    // Wave 2
    DEEPINFRA_BASE_URL,
    HUGGINGFACE_INFERENCE_BASE_URL,
    LEPTON_BASE_URL,
    FEATHERLESS_BASE_URL,
    SNOWFLAKE_BASE_URL,
    // Wave 4 Chinese
    HUNYUAN_BASE_URL,
    VOLCENGINE_BASE_URL,
    MINIMAX_BASE_URL,
    BAICHUAN_BASE_URL,
    STEPFUN_BASE_URL,
    INTERNLM_BASE_URL,
    // Wave 4 global
    REPLICATE_BASE_URL,
    // Self-hosted
    VLLM_BASE_URL,
    LMSTUDIO_BASE_URL,
    LOCALAI_BASE_URL,
    KOBOLD_BASE_URL,
    TEXTGENWEBUI_BASE_URL,
    JAN_BASE_URL,
} from '../src/model-resolver.js';

// ── helpers ────────────────────────────────────────────────────────────────

function makeEnv(vars: Record<string, string>) {
    return (key: string): string | undefined => vars[key];
}

const ALL_KEYS_ENV = makeEnv({
    OPENAI_API_KEY: 'ok', ANTHROPIC_API_KEY: 'ok', GOOGLE_API_KEY: 'ok',
    GROQ_API_KEY: 'ok', XAI_API_KEY: 'ok', TOGETHER_API_KEY: 'ok',
    FIREWORKS_API_KEY: 'ok', DEEPSEEK_API_KEY: 'ok', MISTRAL_API_KEY: 'ok',
    COHERE_API_KEY: 'ok', PERPLEXITY_API_KEY: 'ok', OPENROUTER_API_KEY: 'ok',
    LLAMABARN_API_KEY: 'ok', CEREBRAS_API_KEY: 'ok', SAMBANOVA_API_KEY: 'ok',
    NVIDIA_API_KEY: 'ok', AI21_API_KEY: 'ok', HYPERBOLIC_API_KEY: 'ok',
    LAMBDA_API_KEY: 'ok', MOONSHOT_API_KEY: 'ok', DASHSCOPE_API_KEY: 'ok',
    ZHIPU_API_KEY: 'ok', YI_API_KEY: 'ok', UPSTAGE_API_KEY: 'ok',
    NOVITA_API_KEY: 'ok', WRITER_API_KEY: 'ok',
    DEEPINFRA_API_KEY: 'ok', HUGGINGFACE_API_KEY: 'ok', LEPTON_API_KEY: 'ok',
    FEATHERLESS_API_KEY: 'ok', SNOWFLAKE_API_KEY: 'ok',
    HUNYUAN_API_KEY: 'ok', VOLCENGINE_API_KEY: 'ok', MINIMAX_API_KEY: 'ok',
    BAICHUAN_API_KEY: 'ok', STEPFUN_API_KEY: 'ok', INTERNLM_API_KEY: 'ok',
    REPLICATE_API_TOKEN: 'ok', WATSONX_API_KEY: 'ok',
    AZURE_OPENAI_API_KEY: 'ok',
});

// ─────────────────────────────────────────────────────────────────────────────
// PROVIDER enum
// ─────────────────────────────────────────────────────────────────────────────

describe('PROVIDER enum', () => {
    const expectedValues = [
        'openai', 'anthropic', 'google', 'groq', 'xai', 'together', 'fireworks',
        'deepseek', 'mistral', 'cohere', 'perplexity', 'openrouter', 'ollama',
        'azure', 'llamabarn', 'cerebras', 'sambanova', 'nvidia', 'ai21',
        'hyperbolic', 'lambda', 'moonshot', 'dashscope', 'zhipu', 'yi',
        'upstage', 'novita', 'writer',
        'deepinfra', 'huggingface', 'lepton', 'featherless', 'snowflake',
        'hunyuan', 'volcengine', 'minimax', 'baichuan', 'stepfun', 'internlm',
        'replicate', 'watsonx',
        'vllm', 'lmstudio', 'localai', 'kobold', 'textgenwebui', 'jan',
    ];

    it('contains all expected provider values', () => {
        const values = Object.values(PROVIDER);
        for (const v of expectedValues) {
            expect(values, `missing provider: ${v}`).toContain(v);
        }
    });

    it('has at least 47 providers', () => {
        expect(Object.keys(PROVIDER).length).toBeGreaterThanOrEqual(47);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Base URL constants
// ─────────────────────────────────────────────────────────────────────────────

describe('base URL constants', () => {
    it('Wave 2 base URLs are HTTPS', () => {
        expect(DEEPINFRA_BASE_URL).toMatch(/^https:\/\//);
        expect(HUGGINGFACE_INFERENCE_BASE_URL).toMatch(/^https:\/\//);
        expect(LEPTON_BASE_URL).toMatch(/^https:\/\//);
        expect(FEATHERLESS_BASE_URL).toMatch(/^https:\/\//);
        expect(SNOWFLAKE_BASE_URL).toMatch(/^https:\/\//);
    });

    it('Wave 4 Chinese base URLs are HTTPS', () => {
        expect(HUNYUAN_BASE_URL).toMatch(/^https:\/\//);
        expect(VOLCENGINE_BASE_URL).toMatch(/^https:\/\//);
        expect(MINIMAX_BASE_URL).toMatch(/^https:\/\//);
        expect(BAICHUAN_BASE_URL).toMatch(/^https:\/\//);
        expect(STEPFUN_BASE_URL).toMatch(/^https:\/\//);
        expect(INTERNLM_BASE_URL).toMatch(/^https:\/\//);
    });

    it('Replicate base URL is HTTPS', () => {
        expect(REPLICATE_BASE_URL).toMatch(/^https:\/\//);
    });

    it('self-hosted URLs are localhost HTTP', () => {
        for (const url of [VLLM_BASE_URL, LMSTUDIO_BASE_URL, LOCALAI_BASE_URL, KOBOLD_BASE_URL, TEXTGENWEBUI_BASE_URL, JAN_BASE_URL]) {
            expect(url).toMatch(/^http:\/\/localhost:\d+/);
        }
    });

    it('self-hosted URLs end with /v1', () => {
        for (const url of [VLLM_BASE_URL, LMSTUDIO_BASE_URL, LOCALAI_BASE_URL, KOBOLD_BASE_URL, JAN_BASE_URL]) {
            expect(url).toMatch(/\/v1$/);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// isModelString
// ─────────────────────────────────────────────────────────────────────────────

describe('isModelString', () => {
    it.each([
        'openai:gpt-4o',
        'hunyuan:hunyuan-pro',
        'volcengine:ep-abc123-xyz',
        'minimax:MiniMax-Text-01',
        'replicate:meta/llama-3-70b',
        'watsonx:us-south/meta-llama/llama-3-70b',
        'vllm:default',
        'lmstudio:my-model',
        'localai:ggml-gpt4all-j',
        'kobold:local-model',
        'textgenwebui:local-model',
        'jan:llama3.2-3b-instruct',
        'baichuan:Baichuan4-Turbo',
        'stepfun:step-2-16k',
        'internlm:internlm2.5-latest',
    ])('returns true for "%s"', (s) => {
        expect(isModelString(s)).toBe(true);
    });

    it.each(['gpt-4o', '', 'nocodon', 'openai:'])('returns false for "%s"', (s) => {
        expect(isModelString(s)).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveModelString — Wave 2 providers
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveModelString — Wave 2 providers', () => {
    it('deepinfra', () => {
        const r = resolveModelString('deepinfra:meta-llama/Meta-Llama-3.1-70B-Instruct', makeEnv({ DEEPINFRA_API_KEY: 'di' }));
        expect(r?.baseURL).toBe(DEEPINFRA_BASE_URL);
        expect(r?.apiKey).toBe('di');
        expect(r?.model).toBe('meta-llama/Meta-Llama-3.1-70B-Instruct');
    });

    it('huggingface', () => {
        const r = resolveModelString('huggingface:mistralai/Mistral-7B-Instruct-v0.3', makeEnv({ HUGGINGFACE_API_KEY: 'hf' }));
        expect(r?.baseURL).toBe(HUGGINGFACE_INFERENCE_BASE_URL);
        expect(r?.apiKey).toBe('hf');
    });

    it('lepton', () => {
        const r = resolveModelString('lepton:llama3-1-405b', makeEnv({ LEPTON_API_KEY: 'lp' }));
        expect(r?.baseURL).toBe(LEPTON_BASE_URL);
    });

    it('featherless', () => {
        const r = resolveModelString('featherless:mistralai/Mistral-7B-Instruct-v0.3', makeEnv({ FEATHERLESS_API_KEY: 'fl' }));
        expect(r?.baseURL).toBe(FEATHERLESS_BASE_URL);
    });

    it('snowflake', () => {
        const r = resolveModelString('snowflake:snowflake-arctic', makeEnv({ SNOWFLAKE_API_KEY: 'sn' }));
        expect(r?.baseURL).toBe(SNOWFLAKE_BASE_URL);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveModelString — Wave 4 Chinese providers
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveModelString — Wave 4 Chinese providers', () => {
    const env = makeEnv({
        HUNYUAN_API_KEY: 'hy', VOLCENGINE_API_KEY: 'vce', MINIMAX_API_KEY: 'mm',
        BAICHUAN_API_KEY: 'bc', STEPFUN_API_KEY: 'sf', INTERNLM_API_KEY: 'ilm',
    });

    it('hunyuan — correct baseURL and model', () => {
        const r = resolveModelString('hunyuan:hunyuan-pro', env);
        expect(r?.baseURL).toBe(HUNYUAN_BASE_URL);
        expect(r?.apiKey).toBe('hy');
        expect(r?.model).toBe('hunyuan-pro');
    });

    it('volcengine — endpoint ID as model', () => {
        const r = resolveModelString('volcengine:ep-20240601-abcde', env);
        expect(r?.baseURL).toBe(VOLCENGINE_BASE_URL);
        expect(r?.apiKey).toBe('vce');
        expect(r?.model).toBe('ep-20240601-abcde');
    });

    it('volcengine — falls back to ARK_API_KEY', () => {
        const r = resolveModelString('volcengine:ep-test', makeEnv({ ARK_API_KEY: 'ark' }));
        expect(r?.apiKey).toBe('ark');
    });

    it('minimax', () => {
        const r = resolveModelString('minimax:MiniMax-Text-01', env);
        expect(r?.baseURL).toBe(MINIMAX_BASE_URL);
        expect(r?.apiKey).toBe('mm');
    });

    it('baichuan', () => {
        const r = resolveModelString('baichuan:Baichuan4-Turbo', env);
        expect(r?.baseURL).toBe(BAICHUAN_BASE_URL);
        expect(r?.apiKey).toBe('bc');
    });

    it('stepfun', () => {
        const r = resolveModelString('stepfun:step-2-16k', env);
        expect(r?.baseURL).toBe(STEPFUN_BASE_URL);
        expect(r?.apiKey).toBe('sf');
    });

    it('internlm', () => {
        const r = resolveModelString('internlm:internlm2.5-latest', env);
        expect(r?.baseURL).toBe(INTERNLM_BASE_URL);
        expect(r?.apiKey).toBe('ilm');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveModelString — Wave 4 global cloud providers
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveModelString — Replicate', () => {
    it('resolves from REPLICATE_API_TOKEN', () => {
        const r = resolveModelString('replicate:meta/meta-llama-3-70b-instruct',
            makeEnv({ REPLICATE_API_TOKEN: 'r8_token' }));
        expect(r?.baseURL).toBe(REPLICATE_BASE_URL);
        expect(r?.apiKey).toBe('r8_token');
        expect(r?.model).toBe('meta/meta-llama-3-70b-instruct');
    });

    it('falls back to REPLICATE_API_KEY', () => {
        const r = resolveModelString('replicate:meta/llama-3-8b',
            makeEnv({ REPLICATE_API_KEY: 'r8_alt' }));
        expect(r?.apiKey).toBe('r8_alt');
    });
});

describe('resolveModelString — watsonx', () => {
    const env = makeEnv({ WATSONX_API_KEY: 'ibm-token' });

    it('defaults to us-south when model has slash but no known region prefix', () => {
        const r = resolveModelString('watsonx:meta-llama/llama-3-70b-instruct', env);
        expect(r?.baseURL).toMatch(/us-south\.ml\.cloud\.ibm\.com/);
        expect(r?.apiKey).toBe('ibm-token');
        expect(r?.model).toBe('meta-llama/llama-3-70b-instruct');
    });

    it('uses explicit region from "region/model" format', () => {
        const r = resolveModelString('watsonx:eu-de/ibm/granite-13b-chat-v2', env);
        expect(r?.baseURL).toMatch(/eu-de\.ml\.cloud\.ibm\.com/);
        expect(r?.model).toBe('ibm/granite-13b-chat-v2');
    });

    it('includes required version query param', () => {
        const r = resolveModelString('watsonx:meta-llama/llama-3-70b-instruct', env);
        expect(r?.baseURL).toMatch(/version=/);
    });

    it('falls back to IBMCLOUD_API_KEY', () => {
        const r = resolveModelString('watsonx:ibm/granite', makeEnv({ IBMCLOUD_API_KEY: 'ibm2' }));
        expect(r?.apiKey).toBe('ibm2');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveModelString — self-hosted providers
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveModelString — self-hosted providers', () => {
    it('vllm defaults to localhost:8000/v1', () => {
        const r = resolveModelString('vllm:my-llm', makeEnv({}));
        expect(r?.baseURL).toBe(VLLM_BASE_URL);
        expect(r?.model).toBe('my-llm');
    });

    it('vllm respects VLLM_BASE_URL override', () => {
        const r = resolveModelString('vllm:model', makeEnv({ VLLM_BASE_URL: 'http://gpu:9000/v1' }));
        expect(r?.baseURL).toBe('http://gpu:9000/v1');
    });

    it('lmstudio defaults to localhost:1234/v1, no apiKey needed', () => {
        const r = resolveModelString('lmstudio:local-model', makeEnv({}));
        expect(r?.baseURL).toBe(LMSTUDIO_BASE_URL);
        expect(r?.apiKey).toBe('not-needed');
    });

    it('localai defaults to localhost:8080/v1', () => {
        const r = resolveModelString('localai:ggml-gpt4all-j', makeEnv({}));
        expect(r?.baseURL).toBe(LOCALAI_BASE_URL);
    });

    it('kobold defaults to localhost:5001/v1, no apiKey needed', () => {
        const r = resolveModelString('kobold:local-model', makeEnv({}));
        expect(r?.baseURL).toBe(KOBOLD_BASE_URL);
        expect(r?.apiKey).toBe('not-needed');
    });

    it('textgenwebui defaults to localhost:7860/v1', () => {
        const r = resolveModelString('textgenwebui:local-model', makeEnv({}));
        expect(r?.baseURL).toBe(TEXTGENWEBUI_BASE_URL);
    });

    it('jan defaults to localhost:1337/v1, no apiKey needed', () => {
        const r = resolveModelString('jan:llama3.2-3b-instruct', makeEnv({}));
        expect(r?.baseURL).toBe(JAN_BASE_URL);
        expect(r?.apiKey).toBe('not-needed');
    });

    it.each(['vllm', 'lmstudio', 'localai', 'kobold', 'textgenwebui', 'jan'])(
        '%s resolves without any env vars', (p) => {
            const r = resolveModelString(`${p}:some-model`, makeEnv({}));
            expect(r).toBeDefined();
            expect(r?.baseURL).toBeDefined();
            expect(r?.model).toBe('some-model');
        },
    );
});

// ─────────────────────────────────────────────────────────────────────────────
// resolveModelString — complete provider sweep (50+ providers)
// ─────────────────────────────────────────────────────────────────────────────

describe('resolveModelString — all providers return defined result', () => {
    const cases: [string, string][] = [
        ['openai', 'gpt-4o'],
        ['anthropic', 'claude-opus-4-5'],
        ['google', 'gemini-2.0-flash'],
        ['groq', 'llama-3.3-70b-versatile'],
        ['xai', 'grok-3'],
        ['together', 'meta-llama/Llama-3.3-70B-Instruct-Turbo'],
        ['fireworks', 'accounts/fireworks/models/llama-v3p3-70b-instruct'],
        ['deepseek', 'deepseek-chat'],
        ['mistral', 'mistral-large-latest'],
        ['cohere', 'command-r-plus-08-2024'],
        ['perplexity', 'sonar-pro'],
        ['openrouter', 'meta-llama/llama-3.3-70b-instruct'],
        ['ollama', 'llama3.2'],
        ['llamabarn', 'llama3.2'],
        ['azure', 'my-resource/my-deployment'],
        ['cerebras', 'llama-3.3-70b'],
        ['sambanova', 'Meta-Llama-3.3-70B-Instruct'],
        ['nvidia', 'meta/llama-3.3-70b-instruct'],
        ['ai21', 'jamba-1.5-large'],
        ['hyperbolic', 'meta-llama/Llama-3.3-70B-Instruct'],
        ['lambda', 'llama3.3-70b-instruct-fp8'],
        ['moonshot', 'moonshot-v1-32k'],
        ['dashscope', 'qwen-max'],
        ['zhipu', 'glm-4-plus'],
        ['yi', 'yi-large'],
        ['upstage', 'solar-pro'],
        ['novita', 'meta-llama/llama-3.3-70b-instruct'],
        ['writer', 'palmyra-x5'],
        ['deepinfra', 'meta-llama/Meta-Llama-3.1-70B-Instruct'],
        ['huggingface', 'mistralai/Mistral-7B-Instruct-v0.3'],
        ['lepton', 'llama3-1-405b'],
        ['featherless', 'mistralai/Mistral-7B-Instruct-v0.3'],
        ['snowflake', 'snowflake-arctic'],
        ['hunyuan', 'hunyuan-pro'],
        ['volcengine', 'ep-20240601-xxxxx'],
        ['minimax', 'MiniMax-Text-01'],
        ['baichuan', 'Baichuan4-Turbo'],
        ['stepfun', 'step-2-16k'],
        ['internlm', 'internlm2.5-latest'],
        ['replicate', 'meta/meta-llama-3-70b-instruct'],
        ['watsonx', 'meta-llama/llama-3-70b-instruct'],
        ['vllm', 'default'],
        ['lmstudio', 'local-model'],
        ['localai', 'ggml-gpt4all-j'],
        ['kobold', 'local-model'],
        ['textgenwebui', 'local-model'],
        ['jan', 'llama3.2-3b-instruct'],
    ];

    it.each(cases)('%s:%s → defined result', (provider, model) => {
        const r = resolveModelString(`${provider}:${model}`, ALL_KEYS_ENV);
        expect(r, `${provider}:${model} returned undefined`).toBeDefined();
        // azure strips the resource/ prefix, watsonx parses region/model
        if (provider === 'azure') {
            expect(r!.model).toBe('my-deployment');
        } else {
            expect(r!.model).toBe(model);
        }
        // native providers (anthropic/google/openai) have no baseURL
        if (!['anthropic', 'google', 'openai'].includes(provider)) {
            expect(r!.baseURL, `${provider} missing baseURL`).toBeDefined();
        }
    });

    it('returns undefined for unknown provider', () => {
        expect(resolveModelString('unknown:model', ALL_KEYS_ENV)).toBeUndefined();
    });

    it('returns undefined for plain model name (no colon)', () => {
        expect(resolveModelString('gpt-4o', ALL_KEYS_ENV)).toBeUndefined();
    });

    it('returns undefined for empty model part "provider:"', () => {
        expect(resolveModelString('openai:', ALL_KEYS_ENV)).toBeUndefined();
    });
});
