import { z } from 'zod';
import { createAgent, tool } from '../src/index';

const getWeather = tool({
  name: 'getWeather',
  description: 'Get the current weather for a city. Use this when the user asks about weather.',
  parameters: z.object({
    city: z.string().describe('The city name, e.g. "London"'),
    country: z.string().optional().describe('ISO country code, e.g. "GB"'),
  }),
  execute: async ({ city, country }) => {
    const location = country ? `${city}, ${country}` : city;
    return {
      location,
      temperature: 22,
      unit: 'Celsius',
      condition: 'Partly cloudy',
      humidity: 65,
    };
  },
});

const agent = createAgent({
  name: 'weather-agent',
  model: 'gpt-4o-mini',
  instructions: 'You are a helpful weather assistant.',
  tools: [getWeather],
});

void agent;
