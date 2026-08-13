/**
 * Checking what the agent said against what the repository actually contains.
 *
 * The governing rule is **downgrade, never drop**. It is tempting to delete a claim that fails
 * verification, and it produces a lovely-looking document. It also produces the worst outcome this
 * pipeline can produce: a configuration that deploys perfectly and an application that crashes on
 * boot because the database it needed was quietly removed. From the user's chair that is not
 * "reduced coverage" — it is wrong infrastructure, discovered at the worst possible moment, by
 * someone with no way to diagnose it.
 *
 * So nothing is deleted here. A claim that cannot be confirmed becomes a question with a
 * recommended answer, and the user resolves it in one click. Failure is routed to the user, never
 * to silence.
 */

import type { Citation } from '../facts/citation';
import type { ProjectFacts } from '../facts/project-facts';
import type { Uncertainty } from '../facts/uncertainty';
import {
  checkCommandAnchor,
  checkDependencyAnchor,
  checkHttpAnchor,
  checkPortAnchor,
  checkScheduleAnchor,
  type AnchorOutcome
} from './anchors';
import { isLocated, matchQuote } from './quote-match';

/** Reads a repository-relative file, or resolves null when it does not exist. */
export type FileReader = (repoRelativePath: string) => Promise<string | null>;

export type VerificationOutcome =
  | 'verified'
  | 'corroborated'
  | 'quote-not-found'
  | 'quote-misplaced'
  | 'anchor-failed'
  | 'no-evidence';

export type VerificationFinding = {
  /** What the claim was about, e.g. `dependency:mainDatabase`. */
  subject: string;
  field?: string;
  outcome: VerificationOutcome;
  detail: string;
};

export type VerificationResult = {
  /** The same document, with unconfirmed claims turned into questions. Nothing is removed. */
  facts: ProjectFacts;
  findings: VerificationFinding[];
  /** Lines handed back to the agent for its repair round, when there is anything to say. */
  agentFeedback: string[];
};

/** Lines around a citation, which is what anchors are tested against. */
const CONTEXT_LINES = 2;

const gatherEvidenceText = async (
  citations: readonly Citation[],
  readFile: FileReader,
  field?: string
): Promise<{ text: string; located: boolean; misplaced: boolean; hasCitations: boolean }> => {
  const relevant =
    field === undefined ? citations : citations.filter((c) => c.field === undefined || c.field === field);
  if (relevant.length === 0) {
    return { text: '', located: false, misplaced: false, hasCitations: false };
  }

  const fragments: string[] = [];
  let located = false;
  let misplaced = false;

  for (const citation of relevant) {
    // The submitted quote is deliberately NOT added to the anchor text. Adding it meant a
    // fabricated quote — "provider = postgresql" against a file that says no such thing — satisfied
    // the anchor as long as some *other* citation on the same claim happened to locate. The anchors
    // are supposed to test what the repository says, so they may only ever see bytes read back off
    // disk.
    // oxlint-disable-next-line no-await-in-loop -- reads stop early once the quote is located.
    const contents = await readFile(citation.file);
    if (contents === null) {
      continue;
    }
    const lines = contents.split(/\r?\n/);
    const match = matchQuote(lines, citation.line, citation.quote);
    if (!isLocated(match)) {
      continue;
    }
    located = true;
    if (match.outcome === 'elsewhere') {
      misplaced = true;
    }
    const centre = match.outcome === 'absent' ? citation.line : match.line;
    fragments.push(lines.slice(Math.max(0, centre - 1 - CONTEXT_LINES), centre + CONTEXT_LINES).join('\n'));
  }

  return { text: fragments.join('\n'), located, misplaced, hasCitations: true };
};

/**
 * What an unsatisfied anchor was looking for.
 *
 * Written as an `in` check rather than by narrowing on `satisfied`, because this package's source is
 * also compiled inside the CLI's own TypeScript project, which runs without `strictNullChecks` —
 * and there a boolean discriminant does not narrow a union.
 */
const anchorExpectation = (outcome: AnchorOutcome): string =>
  'expectation' in outcome ? outcome.expectation : 'the expected evidence';

const anchorFinding = (subject: string, field: string, outcome: AnchorOutcome): VerificationFinding | undefined =>
  outcome.satisfied
    ? undefined
    : {
        subject,
        field,
        outcome: 'anchor-failed',
        detail: `Evidence does not show ${anchorExpectation(outcome)}.`
      };

const unconfirmed = (
  subject: string,
  claimedValue: string,
  reason: Extract<Uncertainty, { kind: 'unconfirmed-claim' }>['reason'],
  evidence: readonly Citation[]
): Uncertainty => ({
  kind: 'unconfirmed-claim',
  id: `unconfirmed:${subject}:${claimedValue}`,
  blocksDeploy: true,
  evidence: [...evidence],
  source: 'probe',
  subject,
  claimedValue,
  reason,
  recommended: 'accept'
});

/**
 * Verify a facts document, returning it with unconfirmed claims raised as questions.
 *
 * Probe-authored claims are checked but never downgraded: their citations were built from bytes the
 * probe had just read, so a failure there is a bug in our own code rather than a reason to doubt
 * the repository. It is still reported, because we want to know.
 */
export const verifyFacts = async ({
  facts,
  readFile
}: {
  facts: ProjectFacts;
  readFile: FileReader;
}): Promise<VerificationResult> => {
  const findings: VerificationFinding[] = [];
  const raised: Uncertainty[] = [];

  /**
   * Dependency kinds a probe independently arrived at.
   *
   * This is the pre-brief acting as a witness rather than as prompt filler. If a deterministic
   * probe already concluded the project uses Redis, an agent saying the same thing is corroborated
   * regardless of how well it cited — two independent derivations agreeing is stronger evidence
   * than one quote, and asking the user about it would be noise.
   */
  const probeCorroborated = new Set(
    facts.dependencies.filter((dependency) => dependency.source === 'probe').map((dependency) => dependency.kind)
  );

  for (const dependency of facts.dependencies) {
    const subject = `dependency:${dependency.name}`;
    // oxlint-disable-next-line no-await-in-loop -- one dependency at a time; the reader caches.
    const evidence = await gatherEvidenceText(dependency.evidence, readFile);
    const corroborated = dependency.source === 'agent' && probeCorroborated.has(dependency.kind);

    // Establish what, if anything, is wrong with the evidence before deciding what to do about it.
    // Separating the two is what lets corroboration override any of the three failure modes without
    // repeating the decision three times.
    const anchor = evidence.located ? checkDependencyAnchor(dependency.kind, evidence.text) : undefined;
    const problem = !evidence.hasCitations
      ? { outcome: 'no-evidence' as const, reason: 'single-weak-source' as const, detail: 'No citation was given.' }
      : !evidence.located
        ? {
            outcome: 'quote-not-found' as const,
            reason: 'citation-unverified' as const,
            detail: 'The cited text is not in the cited file.'
          }
        : anchor !== undefined && !anchor.satisfied
          ? {
              outcome: 'anchor-failed' as const,
              reason: 'contradicted-by-probe' as const,
              detail: `Evidence does not show ${anchorExpectation(anchor)}.`
            }
          : undefined;

    if (problem === undefined) {
      findings.push({
        subject,
        outcome: corroborated ? 'corroborated' : 'verified',
        detail: evidence.misplaced ? 'Evidence found, though not at the cited line.' : 'Evidence supports the claim.'
      });
      continue;
    }

    if (corroborated) {
      findings.push({
        subject,
        outcome: 'corroborated',
        detail: `${problem.detail} A probe reached the same conclusion independently.`
      });
      continue;
    }

    findings.push({
      subject,
      ...(problem.outcome === 'anchor-failed' ? { field: 'kind' } : {}),
      outcome: problem.outcome,
      detail: problem.detail
    });
    if (dependency.source === 'agent') {
      raised.push(unconfirmed(subject, dependency.kind, problem.reason, dependency.evidence));
    }
  }

  for (const service of facts.services) {
    const subject = `service:${service.name}`;
    // oxlint-disable-next-line no-await-in-loop -- one service at a time; the reader caches.
    const general = await gatherEvidenceText(service.evidence, readFile);

    if (!general.hasCitations) {
      findings.push({ subject, outcome: 'no-evidence', detail: 'No citation was given.' });
    } else if (!general.located) {
      findings.push({ subject, outcome: 'quote-not-found', detail: 'The cited text is not in the cited file.' });
    } else {
      findings.push({ subject, outcome: 'verified', detail: 'Evidence supports the service.' });
    }

    if (service.exposesHttp) {
      const finding = anchorFinding(subject, 'exposesHttp', checkHttpAnchor(general.text));
      if (finding) findings.push(finding);
    }

    if (service.port !== undefined) {
      // oxlint-disable-next-line no-await-in-loop -- inside the per-service loop above.
      const scoped = await gatherEvidenceText(service.evidence, readFile, 'port');
      const finding = anchorFinding(subject, 'port', checkPortAnchor(service.port, scoped.text || general.text));
      if (finding) findings.push(finding);
    }

    if (service.schedule !== undefined) {
      const finding = anchorFinding(subject, 'schedule', checkScheduleAnchor(service.schedule, general.text));
      if (finding) findings.push(finding);
    }

    for (const [field, command] of [
      ['startCommand', service.startCommand],
      ['buildCommand', service.buildCommand]
    ] as const) {
      if (command === undefined) {
        continue;
      }
      // Commands are checked against whole cited files rather than quotes: a manifest names the
      // script, and the claim usually names the runner invocation of it.
      const cited = service.evidence.filter((c) => c.field === undefined || c.field === field);
      let satisfied = cited.length === 0;
      for (const citation of cited) {
        // oxlint-disable-next-line no-await-in-loop -- stops at the first citation that satisfies.
        const contents = await readFile(citation.file);
        if (contents !== null && checkCommandAnchor(command, contents).satisfied) {
          satisfied = true;
          break;
        }
      }
      if (!satisfied) {
        findings.push({
          subject,
          field,
          outcome: 'anchor-failed',
          detail: `"${command}" does not appear in any cited file.`
        });
      }
    }
  }

  const agentFeedback = findings
    .filter((finding) => finding.outcome !== 'verified' && finding.outcome !== 'corroborated')
    .map((finding) => `${finding.subject}${finding.field ? `.${finding.field}` : ''}: ${finding.detail}`);

  return {
    facts: { ...facts, uncertainties: [...facts.uncertainties, ...raised] },
    findings,
    agentFeedback
  };
};
