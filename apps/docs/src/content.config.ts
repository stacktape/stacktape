import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The canonical 194-page documentation corpus. `content/**` is the single source of truth for both
 * this site and the CLI's shipped LLM documentation corpus, so the loader reads it in place and
 * never copies or preprocesses it.
 */
const docs = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './content' }),
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
