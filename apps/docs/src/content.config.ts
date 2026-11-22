import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * The canonical 212-page documentation corpus. `content/**` is the single source of truth for both
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
      seoDescription: z.string().optional(),
      hideTitle: z.boolean().optional()
    })
    .passthrough()
});

/**
 * The frozen Stacktape v3.7.1 documentation, served under `/v3/`. It lives outside `content/` so
 * the CLI's LLM corpus, the sitemap and search never include it. See `archive/v3/README.md`.
 */
const v3 = defineCollection({
  loader: glob({ pattern: '**/*.mdx', base: './archive/v3/content' }),
  schema: z
    .object({
      title: z.string().optional(),
      order: z.number().optional(),
      nestedTo: z.string().optional()
    })
    .passthrough()
});

export const collections = { docs, v3 };
