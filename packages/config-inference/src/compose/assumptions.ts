/**
 * Decisions taken on the user's behalf, and shown rather than asked.
 *
 * This is the difference between the wizard as it was and the wizard as it is. Every open question
 * used to stop the run: a screen, a choice, a click, before anything could be deployed. Most of
 * those questions had an obvious right answer, and the ones that did not were still better answered
 * *provisionally* than asked — because a configuration you can look at and correct is a much
 * clearer question than a sentence about the same subject.
 *
 * So nothing blocks. Everything is decided, recorded here with what else it could have been, and
 * rendered next to the resource it affected. Changing one is a dropdown, not a step.
 *
 * The safety story is unchanged: an assumption still carries the evidence that produced it, and
 * still names a `kind` from a closed list so the words the user reads are ours rather than an
 * agent's.
 */

import type { Citation } from '../facts/citation';
import type { ProjectFacts } from '../facts/project-facts';
import type { Uncertainty } from '../facts/uncertainty';
import { applyAnswer, recommendationFor } from '../facts/apply-answer';

export type Assumption = {
  /** Stable across recompositions, so the interface can keep a control bound to it. */
  id: string;
  kind: Uncertainty['kind'];
  /** What we went with. */
  chosen: string;
  /** Everything else it could be, so the interface can offer them without inventing options. */
  alternatives: string[];
  /** Kind-specific values the wording needs: a service name, a variable, a provider. */
  parameters: Record<string, unknown>;
  /** The line in the user's own repository that led here. */
  evidence: Citation[];
  /**
   * Whether getting this wrong would be expensive to discover later.
   *
   * Not a blocker — nothing is — but the interface lifts these to the top, because "your uploads
   * will vanish on the next deploy" deserves a glance and "the log level is a runtime variable"
   * does not.
   */
  notable: boolean;
};

/** The kinds where a wrong guess is discovered in production rather than immediately. */
const NOTABLE_KINDS: ReadonlySet<Uncertainty['kind']> = new Set([
  'external-database-disposition',
  'sqlite-persistence',
  'local-filesystem-writes',
  'environment-variable-timing',
  'unconfirmed-claim',
  'migration-timing-unknown'
]);

/** Every value this kind of decision could have taken, for the control that lets it be changed. */
const alternativesFor = (uncertainty: Uncertainty): string[] => {
  switch (uncertainty.kind) {
    case 'database-engine-ambiguous':
      return uncertainty.candidates;
    case 'external-database-disposition':
      return ['point-at-existing', 'create-new'];
    case 'sqlite-persistence':
      return ['migrate-to-managed-database', 'persistent-volume', 'accept-ephemeral'];
    case 'local-filesystem-writes':
      return ['object-storage', 'persistent-volume', 'accept-ephemeral'];
    case 'service-deployment-intent':
      return ['deploy', 'skip'];
    case 'environment-variable-timing':
      return ['runtime', 'build-time'];
    case 'migration-timing-unknown':
      return ['deploy-hook', 'service-startup', 'manual'];
    case 'unconfirmed-claim':
      return ['accept', 'reject'];
    case 'conflicting-observation':
      return ['probe', 'agent'];
    case 'cross-service-target-unknown':
      return uncertainty.candidateServiceNames;
    case 'command-unknown':
    case 'schedule-unknown':
      // Free text. The suggestions are a convenience, not the full set.
      return uncertainty.suggestions;
    default:
      return [];
  }
};

/** The kind-specific values the interface needs to say the sentence. Never any prose. */
const parametersOf = (uncertainty: Uncertainty): Record<string, unknown> => {
  const {
    id: _id,
    kind: _kind,
    blocksDeploy: _blocks,
    evidence: _evidence,
    source: _source,
    ...rest
  } = uncertainty as Uncertainty & Record<string, unknown>;
  return rest;
};

/**
 * Decide every open question, and say what was decided.
 *
 * The order matters: each answer is folded into the facts before the next is read, because
 * answering one can remove another — resolving an external database drops the dependency that a
 * later question was about.
 */
export const resolveAssumptions = (
  facts: ProjectFacts,
  /** What the user changed, keyed by decision id. Overrides the recommendation for that one. */
  decisions: Readonly<Record<string, string>> = {}
): { facts: ProjectFacts; assumptions: Assumption[] } => {
  const assumptions: Assumption[] = [];
  let current = facts;

  // The snapshot is `facts.uncertainties`, taken before the loop: `applyAnswer` returns facts with
  // the answered question removed, so iterating the *current* list would skip every other entry.
  const open = facts.uncertainties;
  for (const uncertainty of open) {
    const chosen = decisions[uncertainty.id] ?? recommendationFor(uncertainty);
    if (chosen === undefined) {
      // Nothing sensible to assume. Left in place, which the composer reports as a gap rather than
      // pretending it decided something.
      continue;
    }

    assumptions.push({
      id: uncertainty.id,
      kind: uncertainty.kind,
      chosen,
      alternatives: alternativesFor(uncertainty),
      parameters: parametersOf(uncertainty),
      evidence: [...uncertainty.evidence],
      notable: NOTABLE_KINDS.has(uncertainty.kind)
    });

    current = applyAnswer({ facts: current, uncertainty, value: chosen });
  }

  return { facts: current, assumptions };
};
