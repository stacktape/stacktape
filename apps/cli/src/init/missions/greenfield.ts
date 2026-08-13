/**
 * The greenfield mission: a repository with no infrastructure yet, turned into a configuration.
 *
 * The whole pipeline in one place, and the order is the design:
 *
 *   scan (no AI) → agent reviews the draft → merge → verify → compose (no AI)
 *
 * The agent sits in the middle and touches nothing on either side of itself. It cannot see the
 * configuration, cannot name a resource, and cannot decide what runs on what. It reviews a draft
 * some deterministic probes already filled in, and everything it adds is checked against the files
 * it claims to have read.
 *
 * A run with no agent at all is a supported outcome, not a failure mode: the probes alone produce a
 * usable document with more open questions. That also gives the eval harness its baseline — the
 * honest measure of an agent is what it adds on top of that.
 */

import { assembleCandidateFacts } from '@stacktape/config-inference/scan/assemble';
import { dockerComposeProbe } from '@stacktape/config-inference/scan/probes/docker-compose';
import { environmentProbe } from '@stacktape/config-inference/scan/probes/environment';
import { existingDeploymentProbe } from '@stacktape/config-inference/scan/probes/existing-deployment';
import { languageManifestProbe } from '@stacktape/config-inference/scan/probes/language-manifests';
import { manifestProbe } from '@stacktape/config-inference/scan/probes/manifest';
import { procfileProbe } from '@stacktape/config-inference/scan/probes/procfile';
import { mergeAgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { checkFactsCompleteness, type ProjectFacts } from '@stacktape/config-inference/facts';
import { verifyFacts, type VerificationFinding } from '@stacktape/config-inference/verify';
import { composeConfig, type CompositionResult } from '@stacktape/config-inference/compose';
import versionJson from '@generated/db-engine-versions/versions.json' with { type: 'json' };
import type { InfrastructureMode } from '@stacktape/config-inference/compose/modes';
import { Workspace } from '../tools/workspace';
import type { AgentEvent, SessionOutcome, SessionRunInput } from '../agent/transport';

// Order matters where two probes see the same thing. The manifest names the service and its
// language; compose states the engine and its version; the environment file is the only one that
// knows where the data lives today. Each fills what the ones before it left open.
const PROBES = [
  manifestProbe,
  languageManifestProbe,
  procfileProbe,
  dockerComposeProbe,
  environmentProbe,
  existingDeploymentProbe
];

/**
 * What the agent is told it is doing.
 *
 * Written to make the honest answer the easy one. Three things carry most of the weight: the job is
 * described as *reviewing a draft* rather than producing one, "I could not tell" is given an
 * explicit destination so it is never the harder path, and the format of a citation is shown rather
 * than described, because a model copies a shape far more reliably than it follows a rule.
 */
export const GREENFIELD_SYSTEM_PROMPT = `You are examining a software repository so it can be deployed. Your job is to describe what the repository IS — not what infrastructure it should get. Someone else decides that.

Start by calling get_project_brief. It contains everything already established by static analysis: package manager, workspace layout, detected services, their build and start commands, backing services, and open questions. Treat it as a draft to review, not as a starting point to redo. Most of it is already correct.

Your job is to:
- fill the gaps it left, especially environment variables, which it barely covers;
- add anything it missed entirely;
- correct it where you can see it is wrong.

On that last point, be aware of how corrections are handled: the draft was built by reading files
directly, so where you disagree with it about a command, a port or a framework, we do not simply
take your word for it — we show both readings to the user and let them settle it. So a correction is
worth making when you have seen something the scan could not, and worth skipping when you are only
restating what the draft already says.

Every claim you make or change must cite a file, a line, and the text on that line. The grep tool returns matches in exactly that shape, so quoting a grep result is the cheapest way to cite something.

Environment variables are the most valuable thing you can get right, and the draft is weakest there. For each one a service reads, say which of these it is:
- infra-dependency — supplied by a database, cache, queue or bucket
- third-party-secret — an API key or token only the user has
- build-time — needed while the app is BUILT, not while it runs (anything NEXT_PUBLIC_*, VITE_*, or read at module scope in a bundled front end)
- cross-service-reference — the address of another service in this same repository
- runtime-config — ordinary settings: log level, feature flags, port

Getting build-time wrong is invisible until production: the value bakes into the bundle as an empty string and the deploy still goes green.

When you cannot establish something, put it in "unknowns" rather than guessing. A guess that looks plausible is worse than an admission, because the admission becomes one question the user answers in seconds and the guess becomes infrastructure that does not work. There is an unknown kind for every gap you are likely to hit.

Do not report anything you cannot point at. No inferring a Redis cache because the project "probably caches". No inventing a port. No assuming a framework from a directory name.

Finish by calling submit_facts. That call IS your answer — anything you write as chat text is discarded. If submit_facts rejects your submission it will tell you exactly what is wrong; fix it and call it again.`;

export const GREENFIELD_USER_PROMPT = 'Analyse this repository and submit your findings. Call get_project_brief first.';

export type GreenfieldResult = {
  /** The facts after merge and verification. */
  facts: ProjectFacts;
  composition: CompositionResult;
  verification: VerificationFinding[];
  /** How the agent phase went, or undefined when it was skipped. */
  agent?: { stopReason: SessionOutcome['stopReason']; usage: SessionOutcome['usage']; errorMessage?: string };
  /** Structural problems in the final document, if any survived. */
  completeness: ReturnType<typeof checkFactsCompleteness>;
};

/** Runs one agent session. Injected so the mission can be exercised without spawning a CLI. */
export type AgentRunner = (
  input: SessionRunInput,
  hooks: { onEvent: (event: AgentEvent) => void }
) => Promise<SessionOutcome>;

export type RunGreenfieldOptions = {
  repositoryRoot: string;
  projectName?: string;
  /** How much infrastructure to compose for. Passed straight through to the composer. */
  mode?: InfrastructureMode;
  /** Omit to run probes only, which is the no-agent path and the eval baseline. */
  runAgent?: AgentRunner;
  onEvent?: (event: AgentEvent) => void;
  budget?: { maxTurns: number; wallClockMs: number };
};

const DEFAULT_BUDGET = { maxTurns: 30, wallClockMs: 10 * 60_000 };

export const runGreenfieldMission = async (options: RunGreenfieldOptions): Promise<GreenfieldResult> => {
  const { facts: draft, files } = await assembleCandidateFacts({ root: options.repositoryRoot, probes: PROBES });

  let facts = draft;
  let agent: GreenfieldResult['agent'];

  if (options.runAgent !== undefined) {
    const outcome = await options.runAgent(
      {
        repositoryRoot: options.repositoryRoot,
        systemPrompt: GREENFIELD_SYSTEM_PROMPT,
        userPrompt: GREENFIELD_USER_PROMPT,
        files,
        brief: draft,
        budget: options.budget ?? DEFAULT_BUDGET
      },
      { onEvent: options.onEvent ?? (() => {}) }
    );

    agent = {
      stopReason: outcome.stopReason,
      usage: outcome.usage,
      ...(outcome.errorMessage === undefined ? {} : { errorMessage: outcome.errorMessage })
    };

    // A failed or empty session degrades to the draft rather than failing the run. The probes'
    // answer is worse than a reviewed one and far better than nothing.
    if (outcome.submission !== undefined) {
      facts = mergeAgentSubmission({ baseline: draft, submission: outcome.submission });
    }
  }

  const workspace = new Workspace(options.repositoryRoot);
  const verification = await verifyFacts({
    facts,
    readFile: async (path) => {
      const result = await workspace.read(path);
      return 'contents' in result ? result.contents : null;
    }
  });

  return {
    facts: verification.facts,
    verification: verification.findings,
    composition: composeConfig({
      ...(options.mode === undefined ? {} : { mode: options.mode }),
      facts: verification.facts,
      ...(options.projectName === undefined ? {} : { projectName: options.projectName }),
      engineVersions: versionJson.rds
    }),
    ...(agent === undefined ? {} : { agent }),
    completeness: checkFactsCompleteness(verification.facts)
  };
};
