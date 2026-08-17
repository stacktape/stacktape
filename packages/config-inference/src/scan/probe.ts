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
import type { DependencyFact, DependencyKind } from '../facts/dependency';
import type { ExistingDeploymentFact } from '../facts/existing-deployment';
import type { MigrationFact, PackageManager } from '../facts/project-facts';
import type { EnvironmentVariableUse, ServiceFactInput } from '../facts/service';
import type { Uncertainty } from '../facts/uncertainty';
import type { ReadSourceFileOptions, SourceRead } from './read-source';

export type ProbeContext = {
  /** Absolute path to the repository root. */
  root: string;
  /** Every file the access policy permits, repository-relative and POSIX. */
  files: readonly string[];
  /** Policy-respecting read: environment files come back as names, credentials never come back. */
  read: (repoRelativePath: string, options?: ReadSourceFileOptions) => Promise<SourceRead>;
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
  /**
   * Variables a repository-level deployment manifest applies to every process in one service root.
   * Kept separate because `app.json` can declare config vars without declaring a runnable service;
   * inventing a placeholder service just to carry them would make the composer deploy a duplicate.
   */
  serviceEnvironments?: Array<{
    path: string;
    processType?: string;
    environmentVariables: EnvironmentVariableUse[];
  }>;
  dependencies?: DependencyFact[];
  /**
   * Kinds selected by the runnable deployment shape (for example the one database in the default
   * Compose application). These can suppress weaker, package-client-only alternatives during
   * reconciliation; they never suppress a live connection or an IaC declaration.
   */
  preferredDependencyKinds?: DependencyKind[];
  /** Explicitly disabled by the active application configuration, such as `FILE_DRIVER=local`. */
  disabledDependencyKinds?: DependencyKind[];
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

/**
 * Cite only the text a declaration pattern matched, not the rest of its line.
 *
 * Deployment code is often minified or written as a one-line object. A constructor declaration can
 * therefore share a line with `environment: { TOKEN: "..." }`; citing the whole line would copy a
 * value the importer never needed into the facts document. Use this for manifest/IaC identity
 * evidence. Use `citeFirstMatch` where the whole matched line is itself the fact, such as a start
 * command.
 */
export const citeFirstMatchOnly = (
  file: string,
  contents: string,
  pattern: RegExp,
  field?: string
): Citation | undefined => {
  const matcher = new RegExp(pattern.source, pattern.flags.replaceAll('g', '').replaceAll('y', ''));
  const lines = contents.split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    const quote = matcher.exec(line)?.[0]?.trim().slice(0, 200);
    if (quote !== undefined && quote !== '') {
      return { ...(field === undefined ? {} : { field }), file, line: index + 1, quote };
    }
  }
  return undefined;
};

/** Read a file's text through the policy-respecting reader, or undefined if it is not plain content. */
export const readText = async (
  context: ProbeContext,
  path: string,
  options: { fullFile?: boolean } = {}
): Promise<string | undefined> => {
  const result = await context.read(
    path,
    options.fullFile ? { startLine: 1, endLine: Number.MAX_SAFE_INTEGER } : undefined
  );
  return result.kind === 'contents' ? result.contents : undefined;
};
