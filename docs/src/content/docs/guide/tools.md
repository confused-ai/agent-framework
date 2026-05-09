---
title: "Built-in Tools"
---

# Built-in Tools

confused-ai ships **50+ production-ready tools** organized into categories. Every tool uses the same interface — plug any of them into `agent()` via the `tools:` option.

```ts
import { agent } from 'confused-ai';
import { TavilySearchTool, GitHubToolkit, CalculatorToolkit } from 'confused-ai';

const ai = agent({
  instructions: 'You are a research assistant.',
  tools: [
    new TavilySearchTool({ apiKey: process.env.TAVILY_API_KEY }),
    ...GitHubToolkit.create({ token: process.env.GITHUB_TOKEN }),
    ...CalculatorToolkit.create(),
  ],
});
```

---

## Web & Browser

### `HttpClientTool`
Make arbitrary HTTP requests (GET, POST, PUT, PATCH, DELETE). SSRF-protected by default — private IP ranges are blocked.

```ts
import { HttpClientTool } from 'confused-ai';

const ai = agent({
  tools: [
    new HttpClientTool({
      // optional: restrict which hosts the agent may call
      allowedHosts: ['api.github.com', 'api.openai.com'],
      blockPrivateNetworks: true, // default: true
    }),
  ],
});

const result = await ai.run('GET https://api.github.com/repos/microsoft/typescript and tell me the star count');
```

### `BrowserTool`
Fetch a URL and extract page title, visible text, and all links. No headless browser required — uses native `fetch`.

```ts
import { BrowserTool } from 'confused-ai';

const ai = agent({
  tools: [new BrowserTool()],
});

const result = await ai.run('Summarize the homepage of https://typescriptlang.org');
```

### `PlaywrightPageTitleTool`
Full headless browser via Playwright — renders JavaScript-heavy pages. Requires `playwright` peer dep.

```ts
import { PlaywrightPageTitleTool } from 'confused-ai';

const ai = agent({
  tools: [new PlaywrightPageTitleTool()],
});
```

### `WriteFileTool` / `ReadFileTool`
Read and write files within a sandboxed base directory.

```ts
import { WriteFileTool, ReadFileTool } from 'confused-ai';

const ai = agent({
  tools: [
    new WriteFileTool({ baseDir: './output' }),
    new ReadFileTool({ baseDir: './data' }),
  ],
});

await ai.run('Read report.csv from data/, summarize it, and save the summary to output/summary.md');
```

---

## Web Search

### `DuckDuckGoSearchTool` / `DuckDuckGoNewsTool`
Free, no-API-key web search and news via DuckDuckGo.

```ts
import { DuckDuckGoSearchTool, DuckDuckGoNewsTool } from 'confused-ai';

const ai = agent({
  tools: [new DuckDuckGoSearchTool(), new DuckDuckGoNewsTool()],
});

await ai.run('What are the top stories about TypeScript 5.5 today?');
```

### `TavilySearchTool` / `TavilyExtractTool`
AI-optimized web search and content extraction. Best for research tasks.

```ts
import { TavilyToolkit } from 'confused-ai';

const ai = agent({
  tools: TavilyToolkit.create({ apiKey: process.env.TAVILY_API_KEY }),
});

await ai.run('Find the latest benchmarks comparing GPT-4o and Claude 3.5 Sonnet');
```

### `WikipediaSearchTool`
Search and retrieve Wikipedia articles.

```ts
import { WikipediaSearchTool } from 'confused-ai';

const ai = agent({
  tools: [new WikipediaSearchTool()],
});
```

### `HackerNewsTopStoriesTool` / `HackerNewsUserTool`
Browse Hacker News top stories and user profiles.

```ts
import { HackerNewsToolkit } from 'confused-ai';

const ai = agent({
  tools: HackerNewsToolkit.create(),
});

await ai.run('What are the top 5 stories on Hacker News right now?');
```

### `ArxivSearchTool` / `ArxivGetPaperTool`
Search and retrieve academic papers from arXiv.

```ts
import { ArxivToolkit } from 'confused-ai';

const ai = agent({
  tools: ArxivToolkit.create(),
});

await ai.run('Find recent papers on mixture-of-experts transformer architectures');
```

### `SerpApiGoogleSearchTool` / `SerpApiYouTubeSearchTool`
Google Search and YouTube search via SerpAPI.

```ts
import { SerpApiToolkit } from 'confused-ai';

const ai = agent({
  tools: SerpApiToolkit.create({ apiKey: process.env.SERPAPI_KEY }),
});
```

---

## Communication

### Slack

```ts
import { SlackToolkit } from 'confused-ai';

const ai = agent({
  tools: SlackToolkit.create({ token: process.env.SLACK_BOT_TOKEN }),
});

await ai.run('Send "Deployment succeeded ✅" to the #deployments channel');
```

Available tools: `SlackSendMessageTool`, `SlackListChannelsTool`, `SlackGetChannelHistoryTool`

### Discord

```ts
import { DiscordToolkit } from 'confused-ai';

const ai = agent({
  tools: DiscordToolkit.create({ token: process.env.DISCORD_BOT_TOKEN }),
});
```

Available tools: `DiscordSendMessageTool`, `DiscordGetMessagesTool`, `DiscordCreateChannelTool`, `DiscordDeleteMessageTool`, `DiscordListMembersTool`

### Telegram

```ts
import { TelegramToolkit } from 'confused-ai';

const ai = agent({
  tools: TelegramToolkit.create({ botToken: process.env.TELEGRAM_BOT_TOKEN }),
});
```

### Email (SMTP / SendGrid)

```ts
import { EmailToolkit, SmtpEmailTool, SendGridEmailTool } from 'confused-ai';

// SMTP
const smtpAgent = agent({
  tools: [
    new SmtpEmailTool({
      host: 'smtp.gmail.com',
      port: 587,
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    }),
  ],
});

// SendGrid
const sgAgent = agent({
  tools: [
    new SendGridEmailTool({ apiKey: process.env.SENDGRID_API_KEY }),
  ],
});

await sgAgent.run('Email hello@example.com with subject "Weekly Report" and a summary of Q1 results');
```

### Twilio (SMS / Voice)

```ts
import { TwilioToolkit } from 'confused-ai';

const ai = agent({
  tools: TwilioToolkit.create({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_FROM_NUMBER,
  }),
});

await ai.run('Send an SMS to +14155552671: "Your order has shipped!"');
```

Available tools: `TwilioSendSmsTool`, `TwilioMakeCallTool`

---

## Productivity

### GitHub

```ts
import { GitHubToolkit } from 'confused-ai';

const ai = agent({
  tools: GitHubToolkit.create({ token: process.env.GITHUB_TOKEN }),
});

await ai.run('List all open issues labeled "bug" in microsoft/typescript');
```

Available tools: `GitHubSearchRepositoriesTool`, `GitHubGetRepositoryTool`, `GitHubListIssuesTool`, `GitHubCreateIssueTool`, `GitHubListPullRequestsTool`

### Jira

```ts
import { JiraToolkit } from 'confused-ai';

const ai = agent({
  tools: JiraToolkit.create({
    host: 'https://your-org.atlassian.net',
    email: process.env.JIRA_EMAIL,
    apiToken: process.env.JIRA_API_TOKEN,
  }),
});

await ai.run('Create a Jira bug ticket: "Login fails when email contains a + sign"');
```

Available tools: `JiraGetIssueTool`, `JiraCreateIssueTool`, `JiraSearchIssuesTool`, `JiraAddCommentTool`

### Linear

```ts
import { LinearToolkit } from 'confused-ai';

const ai = agent({
  tools: LinearToolkit.create({ apiKey: process.env.LINEAR_API_KEY }),
});
```

Available tools: `LinearCreateIssueTool`, `LinearGetIssueTool`, `LinearSearchIssuesTool`, `LinearUpdateIssueTool`, `LinearAddCommentTool`, `LinearListTeamsTool`

### Notion

```ts
import { NotionToolkit } from 'confused-ai';

const ai = agent({
  tools: NotionToolkit.create({ apiKey: process.env.NOTION_API_KEY }),
});

await ai.run('Create a new Notion page titled "Sprint 42 Retrospective" with a summary of what went well');
```

Available tools: `NotionCreatePageTool`, `NotionSearchTool`, `NotionUpdatePageTool`

### Todoist

```ts
import { TodoistToolkit } from 'confused-ai';

const ai = agent({
  tools: TodoistToolkit.create({ apiToken: process.env.TODOIST_API_TOKEN }),
});

await ai.run('Add a task: "Review PR #142" due tomorrow with priority 2');
```

Available tools: `TodoistCreateTaskTool`, `TodoistGetTasksTool`, `TodoistCompleteTaskTool`

---

## Data

### Databases (PostgreSQL / MySQL / SQLite)

```ts
import { DatabaseToolkit } from 'confused-ai';

const ai = agent({
  tools: DatabaseToolkit.create({
    type: 'postgres',
    connectionString: process.env.DATABASE_URL,
  }),
});

await ai.run('How many users signed up in the last 7 days? Query the users table.');
```

Available tools: `PostgreSQLQueryTool`, `PostgreSQLInsertTool`, `MySQLQueryTool`, `SQLiteQueryTool`

### Redis

```ts
import { RedisToolkit } from 'confused-ai';

const ai = agent({
  tools: RedisToolkit.create({ url: process.env.REDIS_URL }),
});

await ai.run('Check the cache key "feature_flags" and tell me its value');
```

Available tools: `RedisGetTool`, `RedisSetTool`, `RedisDeleteTool`, `RedisKeysTool`, `RedisHashGetTool`, `RedisIncrTool`

### CSV

```ts
import { CsvToolkit } from 'confused-ai';

const ai = agent({
  tools: CsvToolkit.create(),
});

await ai.run(`
  Parse this CSV, filter rows where "status" = "active", 
  then aggregate the "revenue" column:
  id,name,status,revenue
  1,Alice,active,4200
  2,Bob,inactive,1800
  3,Carol,active,3100
`);
```

Available tools: `CsvParseTool`, `CsvFilterTool`, `CsvSelectColumnsTool`, `CsvSortTool`, `CsvAggregateTool`, `CsvToJsonTool`

---

## Finance

### Stripe

```ts
import { StripeToolkit } from 'confused-ai';

const ai = agent({
  tools: StripeToolkit.create({ secretKey: process.env.STRIPE_SECRET_KEY }),
});

await ai.run('Create a payment intent for $49.99 USD for customer cus_abc123');
```

Available tools: `StripeCreateCustomerTool`, `StripeGetCustomerTool`, `StripeCreatePaymentIntentTool`, `StripeCreateSubscriptionTool`, `StripeCancelSubscriptionTool`, `StripeRefundTool`

### Yahoo Finance

```ts
import { YFinanceTool } from 'confused-ai';

const ai = agent({
  tools: [new YFinanceTool()],
});

await ai.run('What is the current stock price and PE ratio for NVDA?');
```

### OpenWeather

```ts
import { OpenWeatherToolkit } from 'confused-ai';

const ai = agent({
  tools: OpenWeatherToolkit.create({ apiKey: process.env.OPENWEATHER_API_KEY }),
});

await ai.run('What is the 5-day weather forecast for San Francisco?');
```

Available tools: `OpenWeatherCurrentTool`, `OpenWeatherForecastTool`

---

## AI Tools

### OpenAI (Images / Audio)

```ts
import { OpenAIToolkit } from 'confused-ai';

const ai = agent({
  tools: OpenAIToolkit.create({ apiKey: process.env.OPENAI_API_KEY }),
});

await ai.run('Generate an image of a futuristic city at sunset');
```

Available tools: `OpenAIGenerateImageTool`, `OpenAITranscribeAudioTool`

---

## Social

### YouTube

```ts
import { YouTubeToolkit } from 'confused-ai';

const ai = agent({
  tools: YouTubeToolkit.create({ apiKey: process.env.YOUTUBE_API_KEY }),
});

await ai.run('Find the top 3 videos about "Rust programming" published this month');
```

Available tools: `YouTubeSearchTool`, `YouTubeGetVideoTool`

### Reddit

```ts
import { RedditToolkit } from 'confused-ai';

const ai = agent({
  tools: RedditToolkit.create(),
});

await ai.run('What are the top posts in r/MachineLearning this week?');
```

Available tools: `RedditSearchTool`, `RedditGetPostsTool`

---

## Code Execution

::: warning Security Notice
Code execution tools run user-supplied code on your server. Only enable them in trusted environments and behind proper guardrails. The `JavaScriptExecTool` uses Node.js `vm` which is **not** a full security sandbox. For untrusted code, run in a container or isolated process.
:::

### JavaScript (Node.js vm sandbox)

```ts
import { JavaScriptExecTool } from 'confused-ai';

const ai = agent({
  tools: [new JavaScriptExecTool({ timeoutMs: 3000 })],
});

await ai.run('Calculate the first 20 Fibonacci numbers using JavaScript');
```

### Python (subprocess)

```ts
import { PythonExecTool } from 'confused-ai';

const ai = agent({
  tools: [new PythonExecTool({ timeoutMs: 10_000 })],
});

await ai.run('Write and run a Python script to parse this JSON and compute average age: [{"age":25},{"age":31},{"age":28}]');
```

### Shell Commands (allowlist-gated)

```ts
import { ShellCommandTool } from 'confused-ai';

const ai = agent({
  tools: [
    new ShellCommandTool({
      allowedCommands: ['ls', 'cat', 'wc', 'grep', 'date'],
    }),
  ],
});
```

### ShellTool (explicit import — production use)

The `ShellTool` is **not** in the default barrel export to avoid supply chain flags. Import explicitly:

```ts
import { ShellTool } from 'confused-ai/tools/shell';

const ai = agent({
  tools: [
    new ShellTool({
      baseDir: '/app/workspace',           // restrict to this directory
      allowedCommands: ['git', 'npm'],     // only allow these command prefixes
      sanitizeEnv: true,                   // strip process env vars (default: true)
    }),
  ],
});
```

---

## Calculator

```ts
import { CalculatorToolkit } from 'confused-ai';

const ai = agent({
  tools: CalculatorToolkit.create(),
});

await ai.run('What is 17! and is 97 prime?');
```

Available tools: `CalculatorAddTool`, `CalculatorSubtractTool`, `CalculatorMultiplyTool`, `CalculatorDivideTool`, `CalculatorExponentiateTool`, `CalculatorFactorialTool`, `CalculatorIsPrimeTool`, `CalculatorSquareRootTool`

---

## MCP (Model Context Protocol)

### Consume an MCP server

```ts
import { loadMcpToolsFromUrl } from 'confused-ai';

// Load all tools exposed by any MCP-compatible server
const mcpTools = await loadMcpToolsFromUrl('http://localhost:8811/mcp');

const ai = agent({
  tools: mcpTools,
});
```

### Expose this framework's tools as an MCP server

```ts
import { createMcpServer } from 'confused-ai';
import { CalculatorToolkit, TavilyToolkit } from 'confused-ai';

const server = createMcpServer({
  port: 8811,
  tools: [
    ...CalculatorToolkit.create(),
    ...TavilyToolkit.create({ apiKey: process.env.TAVILY_API_KEY }),
  ],
  auth: { type: 'bearer', token: process.env.MCP_TOKEN },
});

await server.start();
```

---

## Building Custom Tools

All tools extend `BaseTool`. Use the `tool()` helper for quick inline definitions:

```ts
import { tool } from 'confused-ai';
import { z } from 'zod';

const getWeatherTool = tool({
  name: 'get_weather',
  description: 'Get current weather for a city',
  parameters: z.object({
    city: z.string().describe('City name'),
  }),
  execute: async ({ city }) => {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`);
    const data = await res.json();
    return { temp: data.current_condition[0].temp_C, city };
  },
});

const ai = agent({
  tools: [getWeatherTool],
});
```

Or use the fluent `ToolBuilder`:

```ts
import { ToolBuilder } from 'confused-ai';
import { z } from 'zod';

const myTool = new ToolBuilder('fetch_price')
  .description('Fetch the current price of a product')
  .parameters(z.object({ productId: z.string() }))
  .execute(async ({ productId }) => {
    // ... fetch from your API
    return { price: 9.99, currency: 'USD' };
  })
  .build();
```

Extend or wrap any existing tool:

```ts
import { extendTool, wrapTool, TavilySearchTool } from 'confused-ai';

// Add logging around an existing tool
const loggedSearch = wrapTool(new TavilySearchTool(), {
  beforeExecute: async (args) => {
    console.log('Search query:', args.query);
    return args;
  },
  afterExecute: async (result) => {
    console.log('Got', result.results?.length, 'results');
    return result;
  },
});
```

---

## Full Tool Reference

| Category | Tool(s) | Requires |
|----------|---------|----------|
| Web | `HttpClientTool` | — |
| Web | `BrowserTool` | — |
| Web | `WriteFileTool`, `ReadFileTool` | — |
| Web | `PlaywrightPageTitleTool` | `playwright` |
| Search | `DuckDuckGoSearchTool`, `DuckDuckGoNewsTool` | — |
| Search | `TavilySearchTool`, `TavilyExtractTool` | `TAVILY_API_KEY` |
| Search | `WikipediaSearchTool` | — |
| Search | `HackerNewsTopStoriesTool`, `HackerNewsUserTool` | — |
| Search | `ArxivSearchTool`, `ArxivGetPaperTool` | — |
| Search | `SerpApiGoogleSearchTool`, `SerpApiYouTubeSearchTool` | `SERPAPI_KEY` |
| Search | `OpenWeatherCurrentTool`, `OpenWeatherForecastTool` | `OPENWEATHER_API_KEY` |
| Search | `YouTubeSearchTool`, `YouTubeGetVideoTool` | `YOUTUBE_API_KEY` |
| Search | `RedditSearchTool`, `RedditGetPostsTool` | — |
| Comms | `SlackSendMessageTool`, `SlackListChannelsTool`, `SlackGetChannelHistoryTool` | `SLACK_BOT_TOKEN` |
| Comms | `DiscordSendMessageTool`, `DiscordGetMessagesTool`, `DiscordCreateChannelTool`, `DiscordDeleteMessageTool`, `DiscordListMembersTool` | `DISCORD_BOT_TOKEN` |
| Comms | `TelegramTool` | `TELEGRAM_BOT_TOKEN` |
| Comms | `SmtpEmailTool` | SMTP credentials |
| Comms | `SendGridEmailTool` | `SENDGRID_API_KEY` |
| Comms | `TwilioSendSmsTool`, `TwilioMakeCallTool` | `TWILIO_*` |
| Productivity | `GitHubSearchRepositoriesTool`, `GitHubGetRepositoryTool`, `GitHubListIssuesTool`, `GitHubCreateIssueTool`, `GitHubListPullRequestsTool` | `GITHUB_TOKEN` |
| Productivity | `JiraGetIssueTool`, `JiraCreateIssueTool`, `JiraSearchIssuesTool`, `JiraAddCommentTool` | Jira credentials |
| Productivity | `LinearCreateIssueTool`, `LinearGetIssueTool`, `LinearSearchIssuesTool`, `LinearUpdateIssueTool`, `LinearAddCommentTool`, `LinearListTeamsTool` | `LINEAR_API_KEY` |
| Productivity | `NotionCreatePageTool`, `NotionSearchTool`, `NotionUpdatePageTool` | `NOTION_API_KEY` |
| Productivity | `TodoistCreateTaskTool`, `TodoistGetTasksTool`, `TodoistCompleteTaskTool` | `TODOIST_API_TOKEN` |
| Data | `PostgreSQLQueryTool`, `PostgreSQLInsertTool`, `MySQLQueryTool`, `SQLiteQueryTool` | DB connection |
| Data | `RedisGetTool`, `RedisSetTool`, `RedisDeleteTool`, `RedisKeysTool`, `RedisHashGetTool`, `RedisIncrTool` | `REDIS_URL` |
| Data | `CsvParseTool`, `CsvFilterTool`, `CsvSelectColumnsTool`, `CsvSortTool`, `CsvAggregateTool`, `CsvToJsonTool` | — |
| Finance | `StripeCreateCustomerTool`, `StripeGetCustomerTool`, `StripeCreatePaymentIntentTool`, `StripeCreateSubscriptionTool`, `StripeCancelSubscriptionTool`, `StripeRefundTool` | `STRIPE_SECRET_KEY` |
| Finance | `YFinanceTool` | `yahoo-finance2` |
| AI | `OpenAIGenerateImageTool`, `OpenAITranscribeAudioTool` | `OPENAI_API_KEY` |
| Code | `JavaScriptExecTool` | — |
| Code | `PythonExecTool` | `python3` on PATH |
| Code | `ShellCommandTool` | — |
| Code | `ShellTool` *(explicit import)* | — |
| Math | `CalculatorToolkit` (8 tools) | — |
| MCP | `HttpMcpClient`, `loadMcpToolsFromUrl` | MCP server |
| MCP | `McpHttpServer`, `createMcpServer` | — |
