---
title: LLM Providers
description: Complete reference for all 40+ LLM providers supported by confused-ai — setup, configuration, and model IDs.
outline: [2, 3]
---

# LLM Providers

confused-ai ships with built-in support for **40+ LLM providers**. Every provider is auto-detected from environment variables — no manual wiring required.

## Quick selection

| Provider | Import shorthand | Env var |
|----------|-----------------|---------|
| OpenAI | `openai:gpt-4o` | `OPENAI_API_KEY` |
| Anthropic | `anthropic:claude-3-5-sonnet-20241022` | `ANTHROPIC_API_KEY` |
| Google Gemini | `google:gemini-2.0-flash` | `GOOGLE_API_KEY` |
| Azure OpenAI | `azure:gpt-4o` | `AZURE_OPENAI_API_KEY` |
| AWS Bedrock | `bedrock:anthropic.claude-3-5-sonnet` | `AWS_ACCESS_KEY_ID` |
| Groq | `groq:llama-3.3-70b-versatile` | `GROQ_API_KEY` |
| OpenRouter | `openrouter:anthropic/claude-3.5-sonnet` | `OPENROUTER_API_KEY` |
| Together AI | `together:meta-llama/Meta-Llama-3.1-70B` | `TOGETHER_API_KEY` |
| Cohere | `cohere:command-r-plus` | `COHERE_API_KEY` |
| Mistral | `mistral:mistral-large-latest` | `MISTRAL_API_KEY` |

Pass any shorthand directly to `model`:

```ts
import { agent } from 'confused-ai';

const ai = agent({ model: 'anthropic:claude-3-5-sonnet-20241022', instructions: '...' });
```

The model resolver splits on `:`, looks up the provider, reads the env var, and constructs the provider automatically.

---

## Using the `ModelResolver`

```ts
import { ModelResolver } from '@confused-ai/models';

// Resolve a provider from a shorthand string
const provider = ModelResolver.resolve('openai:gpt-4o');

// Or construct explicitly
const provider = ModelResolver.resolve('openai:gpt-4o', {
  apiKey:  process.env.OPENAI_API_KEY!,
  baseURL: 'https://api.openai.com/v1',
});
```

---

## Providers — Cloud

### OpenAI

```ts
import { OpenAIProvider } from '@confused-ai/models';

const llm = new OpenAIProvider({
  apiKey:      process.env.OPENAI_API_KEY!,
  model:       'gpt-4o',           // or: gpt-4o-mini, gpt-4-turbo, o1-mini, o3-mini
  temperature: 0.7,
  maxTokens:   4096,
  baseURL:     'https://api.openai.com/v1', // override for proxies
});
```

| Model ID | Context | Best for |
|----------|---------|---------|
| `gpt-4o` | 128k | Reasoning, tool use, multimodal |
| `gpt-4o-mini` | 128k | Fast, cost-efficient |
| `gpt-4-turbo` | 128k | Long-context tasks |
| `o1` | 200k | Complex multi-step reasoning |
| `o1-mini` | 128k | Fast reasoning |
| `o3-mini` | 200k | Advanced reasoning, low cost |

---

### Anthropic

```ts
import { AnthropicProvider } from '@confused-ai/models';

const llm = new AnthropicProvider({
  apiKey: process.env.ANTHROPIC_API_KEY!,
  model:  'claude-3-5-sonnet-20241022',
});
```

| Model ID | Context | Best for |
|----------|---------|---------|
| `claude-3-5-sonnet-20241022` | 200k | Coding, analysis, instruction-following |
| `claude-3-5-haiku-20241022` | 200k | Fast, cost-efficient |
| `claude-3-opus-20240229` | 200k | Complex reasoning |

---

### Google Gemini

```ts
import { GoogleProvider } from '@confused-ai/models';

const llm = new GoogleProvider({
  apiKey: process.env.GOOGLE_API_KEY!,
  model:  'gemini-2.0-flash',
});
```

| Model ID | Context | Best for |
|----------|---------|---------|
| `gemini-2.0-flash` | 1M | Fast, long-context |
| `gemini-1.5-pro` | 2M | Very long documents |
| `gemini-1.5-flash` | 1M | Cost-efficient |

---

### Azure OpenAI

```ts
import { createAzureOpenAI } from '@confused-ai/models';

const llm = createAzureOpenAI({
  apiKey:     process.env.AZURE_OPENAI_API_KEY!,
  endpoint:   process.env.AZURE_OPENAI_ENDPOINT!,    // e.g. https://my-resource.openai.azure.com
  deployment: 'gpt-4o',                              // your deployment name
  apiVersion: '2024-10-21',
});
```

Or via shorthand: `azure:gpt-4o` (reads `AZURE_OPENAI_API_KEY` + `AZURE_OPENAI_ENDPOINT`).

---

### AWS Bedrock

```ts
import { createBedrockProvider } from '@confused-ai/models';

const llm = createBedrockProvider({
  region:          process.env.AWS_REGION ?? 'us-east-1',
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID!,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  model:           'anthropic.claude-3-5-sonnet-20241022-v2:0',
});
```

Popular Bedrock model IDs:
- `anthropic.claude-3-5-sonnet-20241022-v2:0`
- `amazon.titan-text-express-v1`
- `meta.llama3-70b-instruct-v1:0`
- `mistral.mistral-large-2402-v1:0`
- `cohere.command-r-plus-v1:0`

---

### Groq

```ts
import { createGroq } from '@confused-ai/models';

const llm = createGroq({
  apiKey: process.env.GROQ_API_KEY!,
  model:  'llama-3.3-70b-versatile',
});
```

Groq delivers **very low latency** via custom LPU hardware.

| Model ID | Context | Speed |
|----------|---------|-------|
| `llama-3.3-70b-versatile` | 128k | Very fast |
| `llama-3.1-8b-instant` | 128k | Extremely fast |
| `mixtral-8x7b-32768` | 32k | Fast |
| `gemma2-9b-it` | 8k | Fast |

---

### OpenRouter

```ts
import { createOpenRouter } from '@confused-ai/models';

const llm = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY!,
  model:  'anthropic/claude-3.5-sonnet',
});
```

OpenRouter proxies 100+ models from a single endpoint. Use any model ID from [openrouter.ai/models](https://openrouter.ai/models).

---

### Together AI

```ts
import { createTogetherAI } from '@confused-ai/models';

const llm = createTogetherAI({
  apiKey: process.env.TOGETHER_API_KEY!,
  model:  'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
});
```

---

### Cohere

```ts
import { createCohere } from '@confused-ai/models';

const llm = createCohere({
  apiKey: process.env.COHERE_API_KEY!,
  model:  'command-r-plus',
});
```

| Model ID | Context | Best for |
|----------|---------|---------|
| `command-r-plus` | 128k | RAG, complex reasoning |
| `command-r` | 128k | Balanced |
| `command-light` | 4k | Fast, low cost |

---

### Mistral AI

```ts
import { createMistral } from '@confused-ai/models';

const llm = createMistral({
  apiKey: process.env.MISTRAL_API_KEY!,
  model:  'mistral-large-latest',
});
```

| Model ID | Context | Best for |
|----------|---------|---------|
| `mistral-large-latest` | 128k | Complex tasks |
| `mistral-small-latest` | 32k | Fast, low cost |
| `codestral-latest` | 256k | Code generation |
| `open-mistral-7b` | 32k | Self-host, free |

---

### Perplexity

```ts
import { createPerplexity } from '@confused-ai/models';

const llm = createPerplexity({
  apiKey: process.env.PERPLEXITY_API_KEY!,
  model:  'sonar-pro',
});
```

Perplexity models have **real-time web access** built in.

---

### Fireworks AI

```ts
import { createFireworks } from '@confused-ai/models';

const llm = createFireworks({
  apiKey: process.env.FIREWORKS_API_KEY!,
  model:  'accounts/fireworks/models/llama-v3p1-70b-instruct',
});
```

---

### Deepseek

```ts
import { createDeepseek } from '@confused-ai/models';

const llm = createDeepseek({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model:  'deepseek-chat',  // or: deepseek-reasoner
});
```

---

### xAI Grok

```ts
import { createXAI } from '@confused-ai/models';

const llm = createXAI({
  apiKey: process.env.XAI_API_KEY!,
  model:  'grok-2',
});
```

---

### Replicate

```ts
import { createReplicate } from '@confused-ai/models';

const llm = createReplicate({
  apiKey: process.env.REPLICATE_API_KEY!,
  model:  'meta/llama-3.1-405b-instruct',
});
```

---

### RunPod (Serverless Endpoints)

```ts
import { createRunPod } from '@confused-ai/models';

const llm = createRunPod({
  apiKey:      process.env.RUNPOD_API_KEY!,
  endpointId:  'abc123xyz',    // your RunPod serverless endpoint ID
  model:       'llama-3.1-70b',
});
```

---

### IBM watsonx

```ts
import { createWatsonx } from '@confused-ai/models';

const llm = createWatsonx({
  apiKey:    process.env.WATSONX_API_KEY!,
  projectId: process.env.WATSONX_PROJECT_ID!,
  model:     'ibm/granite-34b-code-instruct',
  region:    'us-south',
});
```

---

## Providers — Chinese

### Alibaba Qwen

```ts
import { createQwen } from '@confused-ai/models';

const llm = createQwen({
  apiKey: process.env.DASHSCOPE_API_KEY!,
  model:  'qwen-max',   // or: qwen-turbo, qwen-plus, qwen2.5-72b-instruct
});
```

---

### Baidu ERNIE

```ts
import { createERNIE } from '@confused-ai/models';

const llm = createERNIE({
  apiKey:    process.env.BAIDU_API_KEY!,
  secretKey: process.env.BAIDU_SECRET_KEY!,
  model:     'ernie-4.0',
});
```

---

### Tencent Hunyuan

```ts
import { createHunyuan } from '@confused-ai/models';

const llm = createHunyuan({
  secretId:  process.env.HUNYUAN_SECRET_ID!,
  secretKey: process.env.HUNYUAN_SECRET_KEY!,
  model:     'hunyuan-pro',
});
```

---

### Volcengine ARK (ByteDance DouBao)

```ts
import { createVolcengineARK } from '@confused-ai/models';

const llm = createVolcengineARK({
  apiKey:     process.env.ARK_API_KEY!,
  endpointId: process.env.ARK_ENDPOINT_ID!,
  model:      'doubao-pro-32k',
});
```

---

### Minimax

```ts
import { createMinimax } from '@confused-ai/models';

const llm = createMinimax({
  apiKey:  process.env.MINIMAX_API_KEY!,
  groupId: process.env.MINIMAX_GROUP_ID!,
  model:   'abab6.5s-chat',
});
```

---

### Baichuan

```ts
import { createBaichuan } from '@confused-ai/models';

const llm = createBaichuan({
  apiKey:    process.env.BAICHUAN_API_KEY!,
  secretKey: process.env.BAICHUAN_SECRET_KEY!,
  model:     'Baichuan4',
});
```

---

### Stepfun

```ts
import { createStepfun } from '@confused-ai/models';

const llm = createStepfun({
  apiKey: process.env.STEPFUN_API_KEY!,
  model:  'step-2-16k',
});
```

---

### InternLM (Shanghai AI Lab)

```ts
import { createInternLM } from '@confused-ai/models';

const llm = createInternLM({
  apiKey: process.env.INTERNLM_API_KEY!,
  model:  'internlm2_5-20b-chat',
});
```

---

## Providers — Self-Hosted / Local

All self-hosted providers implement the same `LLMProvider` interface so they're interchangeable with cloud providers.

### Ollama

```ts
import { createOllama } from '@confused-ai/models';

const llm = createOllama({
  baseURL: 'http://localhost:11434',  // default
  model:   'llama3.2',               // any model you've pulled
});
```

Start Ollama: `ollama serve` → pull a model: `ollama pull llama3.2`.

---

### vLLM

```ts
import { createVLLM } from '@confused-ai/models';

const llm = createVLLM({
  baseURL: 'http://localhost:8000/v1',
  model:   'meta-llama/Llama-3.1-70B-Instruct',
  apiKey:  'dummy',                  // vLLM requires a non-empty key
});
```

---

### LM Studio

```ts
import { createLMStudio } from '@confused-ai/models';

const llm = createLMStudio({
  baseURL: 'http://localhost:1234/v1',
  model:   'lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF',
});
```

---

### LocalAI

```ts
import { createLocalAI } from '@confused-ai/models';

const llm = createLocalAI({
  baseURL: 'http://localhost:8080/v1',
  model:   'ggml-gpt4all-j',
});
```

---

### KoboldCpp

```ts
import { createKoboldCpp } from '@confused-ai/models';

const llm = createKoboldCpp({
  baseURL: 'http://localhost:5001',
  model:   'koboldcpp',
});
```

---

### Text Generation WebUI (Oobabooga)

```ts
import { createTextGenWebUI } from '@confused-ai/models';

const llm = createTextGenWebUI({
  baseURL: 'http://localhost:5000/v1',
  model:   'model-name',
});
```

---

### Jan

```ts
import { createJan } from '@confused-ai/models';

const llm = createJan({
  baseURL: 'http://localhost:1337/v1',
  model:   'tinyllama-1.1b',
});
```

---

## Providers — Specialized Cloud

### HuggingFace Inference

```ts
import { createHuggingFace } from '@confused-ai/models';

const llm = createHuggingFace({
  apiKey: process.env.HUGGINGFACE_API_KEY!,
  model:  'meta-llama/Meta-Llama-3.1-70B-Instruct',
});
```

---

### DeepInfra

```ts
import { createDeepInfra } from '@confused-ai/models';

const llm = createDeepInfra({
  apiKey: process.env.DEEPINFRA_API_KEY!,
  model:  'meta-llama/Meta-Llama-3.1-70B-Instruct',
});
```

---

### Lepton AI

```ts
import { createLepton } from '@confused-ai/models';

const llm = createLepton({
  apiKey: process.env.LEPTON_API_KEY!,
  model:  'llama3-1-70b',
});
```

---

### Featherless AI

```ts
import { createFeatherless } from '@confused-ai/models';

const llm = createFeatherless({
  apiKey: process.env.FEATHERLESS_API_KEY!,
  model:  'Qwen/Qwen2.5-72B-Instruct',
});
```

---

### Snowflake Cortex

```ts
import { createSnowflake } from '@confused-ai/models';

const llm = createSnowflake({
  account:  process.env.SNOWFLAKE_ACCOUNT!,
  username: process.env.SNOWFLAKE_USERNAME!,
  password: process.env.SNOWFLAKE_PASSWORD!,
  model:    'mistral-large2',
});
```

---

### Cloudflare Workers AI

```ts
import { createCloudflare } from '@confused-ai/models';

const llm = createCloudflare({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
  apiToken:  process.env.CLOUDFLARE_API_TOKEN!,
  model:     '@cf/meta/llama-3.1-8b-instruct',
});
```

---

## ISP Interfaces

All providers implement the following TypeScript interfaces from `@confused-ai/core`:

```ts
interface ITextGenerator {
  generate(messages: Message[], opts?: GenerateOptions): Promise<GenerateResult>;
}

interface IStreamingProvider {
  stream(messages: Message[], opts?: GenerateOptions): AsyncIterable<StreamChunk>;
}

interface IToolCallProvider {
  generateWithTools(
    messages: Message[],
    tools: ToolDefinition[],
    opts?: GenerateOptions,
  ): Promise<GenerateWithToolsResult>;
}

interface IEmbeddingProvider {
  embed(input: string | string[]): Promise<number[][]>;
}
```

A provider may implement one or all four. Use these interfaces to write provider-agnostic code:

```ts
import type { ITextGenerator } from '@confused-ai/core';

function summarise(llm: ITextGenerator, text: string) {
  return llm.generate([{ role: 'user', content: `Summarise: ${text}` }]);
}
```

---

## Model fallback chains

Pass an array to `model` to set up automatic fallbacks:

```ts
const ai = agent({
  model: [
    'anthropic:claude-3-5-sonnet-20241022',   // primary
    'openai:gpt-4o',                           // fallback 1
    'groq:llama-3.3-70b-versatile',            // fallback 2
  ],
  instructions: '...',
});
```

When the primary model fails (network error, rate limit, or context overflow), the next model in the chain is tried automatically.

---

## LLM Router

For **intelligent routing** based on task type, cost, and speed, see the [LLM Router guide](/guide/llm-router).

```ts
import { createBalancedRouter } from 'confused-ai/llm';

const router = createBalancedRouter({
  models: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'groq:llama-3.3-70b-versatile'],
});
```

---

## Bring your own provider

Implement `IFullLLMProvider` to integrate any API:

```ts
import type { IFullLLMProvider, Message, GenerateResult } from '@confused-ai/core';

class MyCustomProvider implements IFullLLMProvider {
  async generate(messages: Message[]): Promise<GenerateResult> {
    const response = await fetch('https://my-api.example.com/v1/chat', {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ messages }),
    });
    const data = await response.json() as { content: string; usage: { total_tokens: number } };
    return {
      text:       data.content,
      totalTokens: data.usage.total_tokens,
      finishReason: 'stop',
    };
  }

  async *stream(messages: Message[]) {
    // implement streaming...
  }

  async generateWithTools(messages, tools) {
    // implement tool use...
  }

  async embed(input) {
    // implement embeddings...
  }
}

// Use it like any built-in provider
const ai = agent({ model: new MyCustomProvider({ apiKey: '...' }), instructions: '...' });
```
