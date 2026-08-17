/**
 * Turning a failed deploy into something worth handing to an agent.
 *
 * A deploy that fails emits hundreds of events, and almost all of them describe things that went
 * fine. Passing the lot to a model wastes the user's tokens on scrollback and buries the one line
 * that matters. So this keeps four things: the outcome, the error-level messages, the build output
 * around a failure, and which resources CloudFormation reported as failing.
 *
 * It also decides something the caller needs: whether this failure is one an agent could plausibly
 * fix by changing the configuration. A wrong start command is; an AWS quota, an expired credential
 * and a missing secret are not. Retrying those spends the user's subscription to arrive at the same
 * error, which is worse than saying plainly what happened.
 */

import type { JsonlEvent } from '@application-services/tui-manager/output/jsonl-types';

export type DeployFailure = {
  /** The CLI's own result code, e.g. `CONFIG_ERROR`. */
  code: string;
  /** The one-line outcome the CLI reported. */
  message: string;
  /** Error-level log lines, most recent last. */
  errors: string[];
  /** Build and container output near the failure, which is where a bad command shows itself. */
  output: string[];
  /** Resources CloudFormation reported as failed, when it got that far. */
  failedResources: string[];
  /**
   * Whether changing the configuration could plausibly fix this.
   *
   * False for anything that is about the account rather than the file. See `UNFIXABLE_CODES`.
   */
  worthRetrying: boolean;
};

/**
 * Failures no configuration change will fix.
 *
 * Matched against the result code and, failing that, the message. Being wrong in this direction
 * costs a retry; being wrong in the other direction sends an agent to fix a permissions problem.
 */
const ACCOUNT_PATTERNS: readonly RegExp[] = [
  // AWS phrases this several ways — "The security token included in the request is expired" puts
  // the two words either side of the noun, so matching them adjacently misses the common case.
  /credential|security token|token.*expired|expired.*token/i,
  /not authorized|unauthorized|accessdenied|access denied|forbidden/i,
  // Stacktape's own account layer, which no reading of the repository can fix either.
  /api key|not logged in|not signed in|stacktape login/i,
  /quota|limit exceeded|too many|throttl/i,
  /\bsecret\b.*\b(not set|missing|does not exist)\b/i,
  /insufficient permissions|assume role/i
];

/**
 * The user cancelled, or we did. Matched only against the outcome and error lines: build and
 * container output is arbitrary application text, and a bundler printing "aborted" is not a
 * cancellation — treating it as one suppresses a legitimate repair.
 */
const CANCELLATION_PATTERN = /cancelled|canceled|aborted|interrupt/i;
const NEVER_REPAIR_CODES: ReadonlySet<string> = new Set(['INIT_STACK_EXPECTATION_MISMATCH']);

const MAX_ERRORS = 12;
const MAX_OUTPUT = 40;

/**
 * Reduce a finished deploy to the parts worth reading.
 *
 * `lines` are the raw non-JSONL lines the child printed, which is where a crashed build usually
 * ends up.
 */
export const summariseFailure = ({
  events,
  lines,
  outcome
}: {
  events: readonly JsonlEvent[];
  lines: readonly string[];
  outcome?: { ok: boolean; code: string; message: string };
}): DeployFailure | undefined => {
  if (outcome?.ok !== false) return undefined;

  const errors: string[] = [];
  const output: string[] = [];
  const failedResources = new Set<string>();

  for (const event of events) {
    if (event.type === 'log' && event.level === 'error') {
      errors.push(event.message);
      continue;
    }
    if (event.type === 'output') {
      output.push(...event.lines);
      continue;
    }
    if (event.type === 'event' && event.detail?.kind === 'cloudformation-progress') {
      // The progress detail names what is in flight rather than what failed, so a resource that is
      // still listed as in-progress when the deploy ends is the one that did not finish.
      for (const name of event.detail.inProgressResources ?? []) failedResources.add(name);
    }
  }

  // Raw lines are last because the interesting ones — a stack trace, a compiler error — are printed
  // at the end, and this list is truncated from the front.
  output.push(...lines);

  const keptErrors = errors.slice(-MAX_ERRORS);
  const keptOutput = output.slice(-MAX_OUTPUT);

  // Account-level failures land in build output as often as in the outcome line — an SDK printing
  // an expired credential to stdout must not send the agent hunting for a repository fact that
  // does not exist. So those patterns scan everything we keep, while cancellation stays scoped to
  // the outcome and errors.
  const narrow = [outcome.message, ...keptErrors].join('\n');
  const broad = [narrow, ...keptOutput].join('\n');
  const worthRetrying =
    !NEVER_REPAIR_CODES.has(outcome.code) &&
    !ACCOUNT_PATTERNS.some((pattern) => pattern.test(broad)) &&
    !CANCELLATION_PATTERN.test(narrow);

  return {
    code: outcome.code,
    message: outcome.message,
    errors: keptErrors,
    output: keptOutput,
    failedResources: [...failedResources],
    worthRetrying
  };
};

/**
 * The failure as the agent sees it.
 *
 * Plain text rather than JSON: this goes into a prompt, and a model reads a transcript better than
 * it reads a serialised object. Sections are omitted when empty so nothing has to say "none".
 */
export const describeFailureForAgent = (failure: DeployFailure): string =>
  [
    `The deploy failed: ${failure.message} (${failure.code})`,
    failure.failedResources.length === 0
      ? undefined
      : `Resources that did not finish: ${failure.failedResources.join(', ')}`,
    failure.errors.length === 0 ? undefined : `Errors:\n${failure.errors.map((line) => `  ${line}`).join('\n')}`,
    failure.output.length === 0 ? undefined : `Output:\n${failure.output.map((line) => `  ${line}`).join('\n')}`
  ]
    .filter((section) => section !== undefined)
    .join('\n\n');
