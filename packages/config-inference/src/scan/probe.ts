/**
 * The contract every deterministic probe implements.
 *
 * Probes are the reason this pipeline can work with a weak model, or with no model at all. They run
 * before any agent and emit the same kind of cited facts an agent emits, so what reaches the agent
 * is a populated draft rather than an empty form. Reviewing a draft is a task small models do far
 * better than open-ended authorship, it costs a fraction of the turns, and when no coding agent is
 * installed the draft alone is still a usable document.
 *
 * A probe never guesses. If it can see something in the bytes it emits a fact; if it can see that
 * something is ambiguous it emits an uncertainty; otherwise it stays silent and leaves the question
 * for the agent.
 */

import type { Citation } from '../facts/citation';
import type { DependencyFact } from '../facts/dependency';
import type { ExistingDeploymentFact } from '../facts/existing-deployment';
import type { MigrationFact, PackageManager } from '../facts/project-facts';
import type { ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import type { SourceRead } from './read-source';

export type ProbeContext = {
  /** Absolute path to the repository root. */
  root: string;
  /** Every file the access policy permits, repository-relative and POSIX. */
  files: readonly string[];
  /** Policy-respecting read: environment files come back as names, credentials never come back. */
  read: (repoRelativePath: string) => Promise<SourceRead>;
  /**
   * Unfiltered read, including environment values.
   *
   * **This is the privileged reader and it exists for exactly one purpose**: classifying where data
   * currently lives. A hostname ending in `supabase.co` tells us there is a live Supabase database
   * the user probably does not want disturbed, and that is worth knowing. The value is read inside
   * the probe, reduced to an enum, and discarded.
   *
   * It is never wired to a tool, never reachable by an agent, and nothing derived from it may carry
   * the value forward — not into a fact, not into a citation quote, not into a log line.
   */
  readPrivileged: (repoRelativePath: string) => Promise<string | null>;
};

export type ProbeOutput = {
  services?: ServiceFactInput[];
  dependencies?: DependencyFact[];
  existingDeployments?: ExistingDeploymentFact[];
  migrations?: MigrationFact[];
  uncertainties?: Uncertainty[];
  packageManager?: PackageManager;
  workspaceGlobs?: string[];
  notes?: string[];
};

export type Probe = {
  name: string;
  run: (context: ProbeContext) => Promise<ProbeOutput>;
};

/**
 * Build a citation for a line a probe has just read.
 *
 * Probes cite by construction rather than by recall, which is what makes their citations
 * trustworthy in a way an agent's cannot be: the quote is sliced out of the same buffer the line
 * number was counted in, so the two cannot disagree.
 */
export const citeLine = (file: string, lines: readonly string[], index: number, field?: string): Citation => ({
  ...(field === undefined ? {} : { field }),
  file,
  line: index + 1,
  quote: (lines[index] ?? '').trim().slice(0, 200)
});

/**
 * Find the first line matching a pattern, and cite it.
 *
 * Returns undefined rather than a citation with a guessed line, because a fabricated location is
 * worse than an absent one — verification would pass it through as "found elsewhere" and the
 * provenance UI would point the user at the wrong place in their own code.
 */
export const citeFirstMatch = (
  file: string,
  contents: string,
  pattern: RegExp,
  field?: string
): Citation | undefined => {
  const lines = contents.split(/\r?\n/);
  const index = lines.findIndex((line) => pattern.test(line));
  return index === -1 ? undefined : citeLine(file, lines, index, field);
};

/** Read a file's text through the policy-respecting reader, or undefined if it is not plain content. */
export const readText = async (context: ProbeContext, path: string): Promise<string | undefined> => {
  const result = await context.read(path);
  return result.kind === 'contents' ? result.contents : undefined;
};
