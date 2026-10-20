import { z } from 'zod';

export const runSchema = z.object({
  name: z.string().regex(/^v4swap-[a-z0-9-]+$/),
  owner: z.string().min(8),
  table: z.string(),
  mode: z.enum(['swap', 'image']),
  phase3: z.boolean().optional(),
  phase4: z.boolean().optional(),
  optOut: z.boolean().optional(),
  fault: z.enum(['before-proposal', 'after-commit']).optional(),
  readinessControl: z.boolean().optional(),
  supervisor: z.string(),
  result: z.string(),
  memory: z.union([z.literal(512), z.literal(1024)]),
  count: z.union([z.literal(1), z.literal(2)])
});
export type BenchmarkRun = z.infer<typeof runSchema>;
