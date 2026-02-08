import { tool } from 'ai';
import { z } from 'zod';

export const agentTools = {
  getCurrentTime: tool({
    description: 'Get the current date and time in UTC',
    parameters: z.object({
      timezone: z.string().optional().default('UTC').describe('Timezone (default: UTC)')
    }),
    execute: async () => ({ time: new Date().toISOString() })
  }),

  getWeather: tool({
    description: 'Get weather information for a city (mock data for demo)',
    parameters: z.object({
      city: z.string().describe('City name')
    }),
    execute: async ({ city }) => ({
      city,
      temperature: Math.round(15 + Math.random() * 20),
      condition: ['sunny', 'cloudy', 'rainy', 'partly cloudy'][Math.floor(Math.random() * 4)],
      note: 'This is mock data. Replace with a real weather API.'
    })
  }),

  calculate: tool({
    description: 'Perform a mathematical calculation',
    parameters: z.object({
      expression: z.string().describe('Math expression to evaluate, e.g. "2 * 3 + 1"')
    }),
    execute: async ({ expression }) => {
      try {
        const result = Function(`"use strict"; return (${expression})`)();
        return { expression, result: Number(result) };
      } catch {
        return { expression, error: 'Invalid expression' };
      }
    }
  })
};
