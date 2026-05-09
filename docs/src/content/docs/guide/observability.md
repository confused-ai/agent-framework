---
title: "Observability"
---

# Observability

confused-ai has built-in logging, metrics, and distributed tracing via OpenTelemetry.

## Console logging

Zero-config — all agents log to console by default:

```ts
import { ConsoleLogger } from 'confused-ai/observability';

const logger = new ConsoleLogger({ level: 'info' }); // debug | info | warn | error

const myAgent = agent({
  model: 'gpt-4o',
  instructions: '...',
  logger,
});
```

## OpenTelemetry tracing

Export traces to any OTLP-compatible backend (Jaeger, Zipkin, Honeycomb, Datadog, etc.):

```ts
import { OtlpExporter } from 'confused-ai/observability';

const exporter = new OtlpExporter({
  endpoint: 'http://localhost:4318/v1/traces', // OTLP HTTP endpoint
  headers: { 'x-honeycomb-team': process.env.HONEYCOMB_API_KEY! },
});

const myAgent = agent({
  model: 'gpt-4o',
  instructions: '...',
  tracer: exporter.getTracer('my-service'),
});
```

## Metrics

Track latency, token usage, error rates, and custom counters:

```ts
import { Metrics } from 'confused-ai/observability';

const metrics = new Metrics({
  exporter: 'console', // or 'otlp' with endpoint
});

// Automatic metrics for all agent runs:
// - agent.run.duration (histogram, ms)
// - agent.run.tokens.input (counter)
// - agent.run.tokens.output (counter)
// - agent.tool.calls (counter, by tool name)
// - agent.errors (counter, by error type)

// Custom metrics
const orderCount = metrics.counter('orders.processed');
orderCount.add(1, { region: 'us-east-1' });
```

## Eval / evaluation

Score agent outputs against expected results:

```ts
import { evaluate } from 'confused-ai/observability';

const results = await evaluate({
  agent: myAgent,
  dataset: [
    { input: 'What is 2+2?', expected: '4' },
    { input: 'Capital of France?', expected: 'Paris' },
  ],
  scorers: ['exact-match', 'semantic-similarity'],
});

console.log(results.summary);
// { score: 0.95, passed: 19, failed: 1 }
```

## Lifecycle hooks for custom observability

The most flexible option — use hooks to plug in any observability stack:

```ts
import { defineAgent } from 'confused-ai';
import * as Sentry from '@sentry/node';

const myAgent = defineAgent({
  model: 'gpt-4o',
  instructions: '...',
}).hooks({
  beforeRun: async (ctx) => {
    ctx.metadata.sentryTx = Sentry.startTransaction({
      name: 'agent.run',
      op: 'ai.agent',
    });
  },

  afterRun: async (output, ctx) => {
    (ctx.metadata.sentryTx as Sentry.Transaction).finish();
  },

  onError: async (error, ctx) => {
    Sentry.captureException(error);
    (ctx.metadata.sentryTx as Sentry.Transaction).finish();
  },
});
```

## Telemetry (built-in)

Framework-level telemetry is captured automatically. Opt out if needed:

```ts
import { configureTelemetry } from 'confused-ai';

configureTelemetry({
  enabled: false,    // disable all telemetry
  endpoint: '...',   // custom OTLP endpoint
  serviceName: 'my-service',
  serviceVersion: '1.0.0',
});
```
