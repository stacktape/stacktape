import { z } from 'zod';

export const runSchema = z.object({
  name: z.string(),
  service: z.string().default('api'),
  recordService: z.string().default('node'),
  artifactService: z.string().default('api'),
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
  memory: z.number().int().positive(),
  count: z.number().int().min(1).max(10)
});
export type BenchmarkRun = z.infer<typeof runSchema>;
