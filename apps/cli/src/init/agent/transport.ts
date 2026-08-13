/**
 * The contract every way of running an agent implements.
 *
 * The important asymmetry is that **we own the tools and the result; a transport only carries model
 * traffic**. A vendor breaking its headless mode costs us one provider, never the feature.
 *
 * There are two modes, and the difference is not cosmetic — it decides who runs the turn loop:
 *
 * - `session` — the vendor CLI owns sequencing. We spawn it, it connects back to our MCP server, and
 *   we watch. Turn budgets are whatever the CLI will enforce for us.
 * - `loop` — we own sequencing and call a model API per turn, executing tools in-process. Budgets
 *   are ours to enforce exactly.
 *
 * Both deliver their result the same way: through `submit_facts`, never through final text. That is
 * what lets a provider with no structured output (Copilot has none) still be a first-class
 * transport — the answer arrives as a tool call, and our MCP server sees every one of those.
 */

import type { AgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import type { ProjectFacts } from '@stacktape/config-inference/facts';

export type AgentProviderId = 'claude-code' | 'codex' | 'copilot' | 'stacktape-hosted';

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
  /** Only when the vendor reports an authoritative figure; never estimated into this field. */
  costUsd?: number;
  /**
   * Percentage of the user's subscription plan consumed, when the vendor reports it.
   *
   * Worth surfacing because we are spending someone else's allowance. It is also the *right* signal
   * on a flat-rate plan: a dollar estimate there is meaningless, so a cost-based cutoff would stop
   * work that is not costing anything extra.
   */
  planUsedPercent?: number;
};

/** What the wizard renders as a live timeline. Normalised so every provider looks the same. */
export type AgentEvent =
  | { type: 'tool-call'; name: string; summary: string }
  | { type: 'text'; text: string }
  | { type: 'usage'; usage: TokenUsage };

export type SessionRunInput = {
  repositoryRoot: string;
  systemPrompt: string;
  userPrompt: string;
  /** Files the policy permits, handed to the child so it never walks the tree again. */
  files: readonly string[];
  /** What the deterministic probes already established. */
  brief: ProjectFacts;
  budget: { maxTurns: number; wallClockMs: number };
  signal?: AbortSignal;
};

export type SessionHooks = {
  onEvent: (event: AgentEvent) => void;
};

export type AgentStopReason =
  | 'complete'
  /** The CLI hit its own turn ceiling. Not a failure: what was submitted may still be usable. */
  | 'max-turns'
  /** It finished without ever calling `submit_facts`, so there is no result to use. */
  | 'no-submission'
  | 'timeout'
  | 'cancelled'
  | 'error';

export type SessionOutcome = {
  submission?: AgentSubmission;
  usage: TokenUsage;
  stopReason: AgentStopReason;
  errorMessage?: string;
};

export type AgentTransport = {
  id: AgentProviderId;
  mode: 'session' | 'loop';
  run: (input: SessionRunInput, hooks: SessionHooks) => Promise<SessionOutcome>;
};

/**
 * A failure that is worth another attempt.
 *
 * Rate limiting is the case that matters: subscriptions throttle mid-run, and losing a whole
 * analysis to a 429 the user cannot see is a poor experience for something they are paying for.
 */
export class TransportError extends Error {
  readonly retryable: boolean;
  readonly rateLimited: boolean;

  constructor({
    message,
    retryable = false,
    rateLimited = false
  }: {
    message: string;
    retryable?: boolean;
    rateLimited?: boolean;
  }) {
    super(message);
    this.name = 'TransportError';
    this.retryable = retryable || rateLimited;
    this.rateLimited = rateLimited;
  }
}

/**
 * Whether a CLI's own error output looks like throttling.
 *
 * Checked against stderr only, and only when the process failed. Stdout carries model output, which
 * can discuss rate limits perfectly innocently — treating that as a signal would retry runs that
 * already succeeded.
 */
export const looksRateLimited = (stderr: string): boolean =>
  /rate.?limit|429|too many requests|quota exceeded|overloaded|resource_exhausted/i.test(stderr);
