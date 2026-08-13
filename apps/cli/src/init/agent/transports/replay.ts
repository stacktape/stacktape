/**
 * A transport that plays back a recorded session.
 *
 * This is the only way to exercise the pipeline in CI. Every other transport spends real money on
 * the user's subscription, takes minutes, and gives a different answer each time — none of which a
 * test suite can live with. A recorded session gives the same answer every run, costs nothing, and
 * still exercises the parts most likely to break: merging, verification, composition, and the
 * behaviour of the whole thing when an agent returns something odd.
 *
 * Recordings are captured from live runs and kept as fixtures, so the cases CI protects are cases
 * that actually happened rather than ones someone imagined.
 */

import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { agentSubmissionSchema } from '@stacktape/config-inference/facts/agent-submission';
import type { AgentEvent, SessionHooks, SessionOutcome, SessionRunInput } from '../transport';

export const recordedSessionSchema = z.object({
  /** What the recording is of, so a failing fixture names itself. */
  label: z.string().min(1),
  provider: z.string().min(1),
  events: z
    .array(
      z.discriminatedUnion('type', [
        z.object({ type: z.literal('tool-call'), name: z.string(), summary: z.string() }),
        z.object({ type: z.literal('text'), text: z.string() }),
        z.object({
          type: z.literal('usage'),
          usage: z.object({
            inputTokens: z.number(),
            outputTokens: z.number(),
            costUsd: z.number().optional(),
            planUsedPercent: z.number().optional()
          })
        })
      ])
    )
    .default([]),
  submission: agentSubmissionSchema.optional(),
  stopReason: z.enum(['complete', 'max-turns', 'no-submission', 'timeout', 'cancelled', 'error']),
  errorMessage: z.string().optional(),
  usage: z
    .object({
      inputTokens: z.number(),
      outputTokens: z.number(),
      costUsd: z.number().optional(),
      planUsedPercent: z.number().optional()
    })
    .default({ inputTokens: 0, outputTokens: 0 })
});

export type RecordedSession = z.infer<typeof recordedSessionSchema>;

/**
 * Turn a recording into something the mission can run.
 *
 * The events are replayed through the same hook a live transport uses, so anything downstream that
 * consumes the timeline — the wizard, the eval harness — is exercised identically.
 */
export const createReplayRunner =
  (recording: RecordedSession) =>
  async (_input: SessionRunInput, hooks: SessionHooks): Promise<SessionOutcome> => {
    for (const event of recording.events as AgentEvent[]) {
      hooks.onEvent(event);
    }
    return {
      ...(recording.submission === undefined ? {} : { submission: recording.submission }),
      usage: recording.usage,
      stopReason: recording.stopReason,
      ...(recording.errorMessage === undefined ? {} : { errorMessage: recording.errorMessage })
    };
  };

/** Load a recording from disk, failing loudly if it does not match the schema. */
export const loadRecordedSession = async (path: string): Promise<RecordedSession> => {
  const parsed = recordedSessionSchema.safeParse(JSON.parse(await readFile(path, 'utf8')));
  if (!parsed.success) {
    throw new Error(
      `Recorded session at ${path} is not valid: ${parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`
    );
  }
  return parsed.data;
};

/**
 * Capture a live outcome as a recording.
 *
 * Used by a capture script rather than by the product, so a live run someone already paid for can
 * become a fixture instead of being thrown away.
 */
export const recordSession = ({
  label,
  provider,
  events,
  outcome
}: {
  label: string;
  provider: string;
  events: readonly AgentEvent[];
  outcome: SessionOutcome;
}): RecordedSession =>
  recordedSessionSchema.parse({
    label,
    provider,
    events,
    ...(outcome.submission === undefined ? {} : { submission: outcome.submission }),
    stopReason: outcome.stopReason,
    ...(outcome.errorMessage === undefined ? {} : { errorMessage: outcome.errorMessage }),
    usage: outcome.usage
  });
