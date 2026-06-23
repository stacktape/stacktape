import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './docs' }),
  schema: z
    .object({
      title: z.string().optional(),
      order: z.number().optional(),
      category: z.string().optional(),
      seoTitle: z.string().optional(),
      seoDescription: z.string().optional()
    })
    .passthrough()
});

export const collections = { docs };
