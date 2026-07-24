import { z } from 'zod';

export const v4MachineEventSchema = z
  .object({
    version: z.literal(1),
    sequence: z.number().int().nonnegative(),
    timestamp: z.iso.datetime(),
    type: z.string().min(1),
    payload: z.record(z.string(), z.unknown())
  })
  .strict();

export type V4MachineEvent = z.infer<typeof v4MachineEventSchema>;
