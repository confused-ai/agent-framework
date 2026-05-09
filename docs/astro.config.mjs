// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

const SITE_URL = process.env.SITE_URL ?? 'https://rvuyyuru2.github.io/agent-framework';
const base = process.env.BASE ?? undefined;

export default defineConfig({
    site: SITE_URL,
    base,
    integrations: [
        starlight({
            title: 'confused-ai',
            description:
                'TypeScript framework for building production-grade AI agents, teams, and services. ReAct loop, 50+ tools, multi-agent orchestration, circuit breakers, HITL, budget enforcement — all in one package.',
            logo: {
                src: './src/assets/logo.svg',
                alt: 'confused-ai',
                replacesTitle: false,
            },
            favicon: '/favicon.ico',
            customCss: ['./src/styles/custom.css'],
            social: [
                {
                    icon: 'github',
                    label: 'GitHub',
                    href: 'https://github.com/rvuyyuru2/agent-framework',
                },
                {
                    icon: 'npm',
                    label: 'npm',
                    href: 'https://www.npmjs.com/package/confused-ai',
                },
            ],
            editLink: {
                baseUrl:
                    'https://github.com/rvuyyuru2/agent-framework/edit/main/docs/src/content/docs/',
            },
            lastUpdated: true,
            head: [
                { tag: 'meta', attrs: { name: 'theme-color', content: '#8b5cf6' } },
                { tag: 'meta', attrs: { property: 'og:type', content: 'website' } },
                { tag: 'meta', attrs: { property: 'og:site_name', content: 'confused-ai' } },
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:title',
                        content: 'confused-ai — Production-Grade AI Agent Framework',
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        property: 'og:description',
                        content:
                            'Build and ship AI agents in TypeScript. 50+ tools, multi-agent orchestration, circuit breakers, budget caps, HITL, MCP, OTLP tracing — zero magic, every escape hatch open.',
                    },
                },
                {
                    tag: 'meta',
                    attrs: { property: 'og:image', content: `${SITE_URL}/og-banner.png` },
                },
                { tag: 'meta', attrs: { property: 'og:url', content: SITE_URL } },
                { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'twitter:title',
                        content: 'confused-ai — Production-Grade AI Agent Framework',
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'twitter:description',
                        content:
                            'Build and ship AI agents in TypeScript. 50+ tools, multi-agent orchestration, circuit breakers, budget caps, HITL, MCP.',
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'twitter:image',
                        content: `${SITE_URL}/og-banner.png`,
                    },
                },
                {
                    tag: 'meta',
                    attrs: {
                        name: 'keywords',
                        content:
                            'AI agent framework, TypeScript AI agents, LLM orchestration, multi-agent, RAG, MCP, production AI, OpenAI, Anthropic, Google Gemini',
                    },
                },
                { tag: 'meta', attrs: { name: 'author', content: 'confused-ai contributors' } },
                { tag: 'meta', attrs: { name: 'robots', content: 'index, follow' } },
            ],
            sidebar: [
                {
                    label: 'Introduction',
                    collapsed: false,
                    items: [
                        { label: 'Getting Started', slug: 'guide/getting-started' },
                        { label: 'Core Concepts', slug: 'guide/concepts' },
                        { label: 'All Modules', slug: 'guide/all-modules' },
                        { label: 'Adapters System', slug: 'guide/adapters' },
                    ],
                },
                {
                    label: 'Building Agents',
                    collapsed: false,
                    items: [
                        { label: 'Creating Agents', slug: 'guide/agents' },
                        { label: 'Built-in Tools (50+)', slug: 'guide/tools' },
                        { label: 'Custom Tools', slug: 'guide/custom-tools' },
                        { label: 'Lifecycle Hooks', slug: 'guide/hooks' },
                        { label: 'Compose & Pipe', slug: 'guide/compose' },
                    ],
                },
                {
                    label: 'Data & Storage',
                    collapsed: false,
                    items: [
                        { label: 'RAG / Knowledge', slug: 'guide/rag' },
                        { label: 'Memory', slug: 'guide/memory' },
                        { label: 'Storage (KV/File)', slug: 'guide/storage' },
                        { label: 'Session Management', slug: 'guide/session' },
                        { label: 'Database Tools', slug: 'guide/database' },
                    ],
                },
                {
                    label: 'Multi-Agent',
                    collapsed: false,
                    items: [
                        { label: 'Orchestration', slug: 'guide/orchestration' },
                        { label: 'Execution Workflows', slug: 'guide/workflows' },
                    ],
                },
                {
                    label: 'Enterprise & Production',
                    collapsed: false,
                    items: [
                        { label: 'Observability & OTLP', slug: 'guide/observability' },
                        { label: 'Guardrails', slug: 'guide/guardrails' },
                        { label: 'Resilience & Circuit Breakers', slug: 'guide/production' },
                        { label: 'Human-in-the-Loop', slug: 'guide/hitl' },
                        { label: 'Multi-Tenancy', slug: 'guide/multi-tenancy' },
                        { label: 'Background Queues', slug: 'guide/background-queues' },
                        { label: 'Voice (TTS/STT)', slug: 'guide/voice' },
                        { label: 'MCP Client & Server', slug: 'guide/mcp' },
                        { label: 'Plugins', slug: 'guide/plugins' },
                    ],
                },
                {
                    label: 'Examples',
                    collapsed: true,
                    items: [
                        { label: 'Overview', slug: 'examples' },
                        {
                            label: 'Quickstart',
                            items: [
                                { label: '01 · Hello World', slug: 'examples/01-hello-world' },
                                { label: '02 · First Custom Tool', slug: 'examples/02-custom-tool' },
                                { label: '03 · Tool with Approval', slug: 'examples/03-approval-tool' },
                                { label: '04 · Extend & Wrap Tools', slug: 'examples/04-extend-tools' },
                            ],
                        },
                        {
                            label: 'Data & Knowledge',
                            items: [
                                { label: '05 · RAG Knowledge Base', slug: 'examples/05-rag' },
                                { label: '06 · Persistent Memory', slug: 'examples/06-memory' },
                                { label: '07 · Storage Patterns', slug: 'examples/07-storage' },
                                { label: '10 · Database Analyst', slug: 'examples/10-database' },
                            ],
                        },
                        {
                            label: 'Multi-Agent',
                            items: [
                                { label: '08 · Multi-Agent Team', slug: 'examples/08-team' },
                                { label: '09 · Supervisor Workflow', slug: 'examples/09-supervisor' },
                                { label: '16 · LLM Router', slug: 'examples/16-llm-router' },
                            ],
                        },
                        {
                            label: 'Production',
                            items: [
                                { label: '11 · Customer Support Bot', slug: 'examples/11-support-bot' },
                                { label: '12 · Observability & Hooks', slug: 'examples/12-observability' },
                                { label: '13 · Production Resilience', slug: 'examples/13-production' },
                                { label: '14 · MCP Filesystem Agent', slug: 'examples/14-mcp' },
                                { label: '15 · Full-Stack App', slug: 'examples/15-full-stack' },
                            ],
                        },
                        {
                            label: 'Showcases',
                            items: [
                                { label: '17 · Full Framework Showcase', slug: 'examples/17-full-framework-showcase' },
                                { label: '18 · Meridian Platform', slug: 'examples/18-meridian-platform' },
                            ],
                        },
                    ],
                },
                {
                    label: 'API Reference',
                    collapsed: true,
                    items: [
                        { label: 'Overview', slug: 'api' },
                    ],
                },
                { label: 'Changelog', slug: 'changelog' },
            ],
        }),
    ],
});
