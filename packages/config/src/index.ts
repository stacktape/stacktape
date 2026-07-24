import { z } from 'zod';

export const stacktapeConfigSchema = z
  .object({
    resources: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export type StacktapeConfig = z.infer<typeof stacktapeConfigSchema>;
