import { agent, tool } from 'confused-ai';
import { z } from 'zod';

const getWeather = tool({
  name: 'get_weather',
  description: 'Returns the current weather for a city.',
  parameters: z.object({ city: z.string() }),
  execute: async ({ city }) => city,
});

const bot = agent({
  name: 'WeatherBot',
  instructions: 'Use the get_weather tool to answer weather questions.',
  tools: [getWeather],
  sessionStore: false,
  guardrails: false,
});

void bot;
