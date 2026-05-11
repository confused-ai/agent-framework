---
title: Plugins
description: Register cross-cutting concerns — logging, rate limiting, telemetry — as plugins applied to all agents and tools via createPluginRegistry(). Author custom plugins with the Plugin interface.
outline: [2, 3]
---

# Plugins

Plugins are cross-cutting extensions that apply to all agents and tools registered in the same `PluginRegistry`. Unlike hooks (which are per-agent), plugins are global: register once, run everywhere.

```ts
import {
  createPluginRegistry,
  createLoggingPlugin,
  createRateLimitPlugin,
  createTelemetryPlugin,
} from 'confused-ai';
```

---

## Quick start

```ts
import {
  createPluginRegistry,
  createLoggingPlugin,
  createRateLimitPlugin,
} from 'confused-ai';

const plugins = createPluginRegistry();

plugins.register(createLoggingPlugin());
plugins.register(createRateLimitPlugin({ maxRpm: 60 }));

// Then attach the registry to your agent(s)
const agent = createAgent({
  name: 'my-agent',
  instructions: '...',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY!,
  plugins,
});
```

---

## Built-in plugins

### `createLoggingPlugin`

Logs every agent invocation, tool call, and error:

```ts
import { createLoggingPlugin } from 'confused-ai';

plugins.register(createLoggingPlugin(myLogger));  // optional custom logger
```

### `createRateLimitPlugin`

Rejects or queues requests that exceed a per-minute request rate:

```ts
import { createRateLimitPlugin } from 'confused-ai';

plugins.register(createRateLimitPlugin({
  maxRpm:    60,    // max requests per minute (default: 60)
  maxTokens: 100_000,  // optional token budget per minute
}));
```

### `createTelemetryPlugin`

Emits metrics counters and histograms to any `MetricsCollector`:

```ts
import { createTelemetryPlugin } from 'confused-ai';

plugins.register(createTelemetryPlugin(metricsCollector));
```

---

## `PluginRegistry` interface

```ts
interface PluginRegistry {
  register(plugin: Plugin): void;
  unregister(pluginId: string): boolean;
  get(pluginId: string): Plugin | undefined;
  list(): Plugin[];
}
```

---

## Author a custom plugin

```ts
import type { Plugin } from 'confused-ai';

const auditPlugin: Plugin = {
  id: 'audit-logger',
  name: 'Audit Logger',

  async beforeRun(input, ctx) {
    await auditLog.write({ event: 'run.start', runId: ctx.runId, userId: ctx.userId });
    return input;  // must return (possibly modified) input
  },

  async afterRun(output, ctx) {
    await auditLog.write({ event: 'run.end', runId: ctx.runId, tokens: output.usage?.totalTokens });
    return output;  // must return (possibly modified) output
  },

  async toolMiddleware(name, args, next) {
    const start = Date.now();
    try {
      const result = await next(name, args);
      metrics.counter('tool.success', 1, { tool: name });
      return result;
    } catch (err) {
      metrics.counter('tool.error', 1, { tool: name });
      throw err;
    }
  },

  async onError(error, ctx) {
    await alerting.notify(`Agent error in run ${ctx.runId}: ${error.message}`);
  },
};

plugins.register(auditPlugin);
```

### `Plugin` interface

```ts
interface Plugin {
  /** Unique identifier */
  readonly id: string;
  /** Human-readable name */
  readonly name: string;

  /** Runs before every agent.run() — can modify input */
  beforeRun?(input: AgentInput, ctx: PluginContext): Promise<AgentInput>;

  /** Runs after every agent.run() — can modify output */
  afterRun?(output: AgentOutput, ctx: PluginContext): Promise<AgentOutput>;

  /** Tool middleware — wraps every tool call */
  toolMiddleware?(name: string, args: unknown, next: (name: string, args: unknown) => Promise<unknown>): Promise<unknown>;

  /** Called when an unhandled error occurs */
  onError?(error: Error, ctx: PluginContext): Promise<void>;
}
```

---

## Convert hooks to a plugin

If you already have `AgentLifecycleHooks`, use `hooksToPlugin` to register them as a plugin:

```ts
import { hooksToPlugin } from 'confused-ai';

const myPlugin = hooksToPlugin('my-hooks', {
  beforeRun: async (input) => { console.log('run started'); return input; },
  afterRun:  async (output) => { console.log('run finished'); return output; },
});

plugins.register(myPlugin);
```

---

## Where to go next

- [Hooks](./hooks) — per-agent lifecycle hooks.
- [Observability](./observability) — OpenTelemetry spans and metrics.
- [Production](./production) — circuit breakers and rate limiters at the agent level.
