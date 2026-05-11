# 14 · MCP Tools

The supported public MCP story in this repo is tool-focused: load remote MCP tools into a normal agent, or expose a tool registry as an MCP server from `confused-ai/tool`.

## Example

```ts
import { createAgent } from 'confused-ai';
import { loadMcpToolsFromUrl } from 'confused-ai/tool';

const remoteTools = await loadMcpToolsFromUrl('http://127.0.0.1:3100/mcp', {
  authorization: 'Bearer dev-token',
});

const mcpAgent = createAgent({
  name: 'mcp-assistant',
  instructions: 'Use remote MCP tools when they help answer the user request.',
  model: 'gpt-4o-mini',
  tools: remoteTools,
});

const result = await mcpAgent.run('List the tools exposed by the remote MCP server.');
console.log(result.text);
```

## Current public surface

- Client-side loading: `loadMcpToolsFromUrl()` and `HttpMcpClient`
- Server-side hosting: `createMcpServer()` and `McpHttpServer`
- Stdio servers: `runMcpStdioToolServer()`

Use `confused-ai/tool` for MCP imports. The old `confused-ai/workflow` MCP examples were wrong.