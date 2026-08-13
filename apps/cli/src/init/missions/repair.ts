/**
 * The repair mission: a deploy failed, so go and find out what we got wrong about the repository.
 *
 * This is the greenfield mission pointed backwards. There, the agent reviews a draft built from
 * static analysis; here it reviews a draft that has already been tested against AWS and come back
 * with an error. That is much better evidence than anything a scan can produce, and it is why a
 * repair attempt is worth the tokens where a second speculative pass would not be.
 *
 * The boundary does not move. The agent still submits *facts about the repository* and never
 * touches the configuration — the composer rebuilds it. That keeps every guarantee the first pass
 * has: claims are cited, citations are verified, and infrastructure is decided by code. A repair
 * loop that let a model edit the config directly would be the one place the whole design leaks,
 * and it would leak at the moment the user is least able to check the result.
 *
 * What it can fix follows from that. A start command that does not exist, a build step we missed, a
 * variable the application needs at build time rather than at run time — all facts about the code,
 * all things a failing container proves we got wrong. What it cannot fix is anything about the AWS
 * account: quotas, credentials, an unset secret. `summariseFailure` decides which of those this is
 * before we spend anything.
 */

import { mergeAgentSubmission } from '@stacktape/config-inference/facts/agent-submission';
import { checkFactsCompleteness, type ProjectFacts } from '@stacktape/config-inference/facts';
import { verifyFacts, type VerificationFinding } from '@stacktape/config-inference/verify';
import { composeConfig, type CompositionResult } from '@stacktape/config-inference/compose';
import versionJson from '@generated/db-engine-versions/versions.json' with { type: 'json' };
import type { InfrastructureMode } from '@stacktape/config-inference/compose/modes';
import { listRepositoryFiles } from '@stacktape/config-inference/scan/file-tree';
import { Workspace } from '../tools/workspace';
import type { AgentEvent } from '../agent/transport';
import { describeFailureForAgent, type DeployFailure } from '../deploy/failure';
import type { AgentRunner } from './greenfield';

/**
 * What the agent is told when a deploy has failed.
 *
 * The important sentence is the one about what a failure proves. Left to itself a model asked to
 * "fix a deploy error" will start proposing infrastructure — a bigger instance, a longer timeout,
 * a retry — because that is what the error text talks about. It cannot do any of that here, and
 * saying so plainly produces a better answer than letting it discover the constraint by having its
 * submission rejected.
 */
export const REPAIR_SYSTEM_PROMPT = `A deployment of this repository just failed. You are going to work out what we got wrong ABOUT THE REPOSITORY, so it can be deployed again.

Read the failure carefully, then go and look at the code. A failed deploy is evidence: it proves that something we believed about this project is not true. Your job is to find that thing.

The most common causes, in order:
- the start command does not exist, or is not the one that actually starts the application
- the build step is missing, or produces its output somewhere other than where the start command looks
- an environment variable is needed while the application is BUILT, not while it runs, so it was empty at build time
- the application listens on a different port, or on localhost rather than on all interfaces
- a dependency the application needs at runtime is only installed as a development dependency

Call get_project_brief first. It contains what we currently believe, which is what produced the configuration that just failed. Then use the file tools to check the specific belief the error points at.

You cannot change the configuration, and you must not try. You do not choose instance sizes, memory, timeouts, scaling or any other infrastructure setting — those are decided from your facts by code you are not part of, and a submission that tries to reach them is discarded. If the failure genuinely is about infrastructure rather than about the code, submit nothing and say so.

Every correction must cite a file, a line, and the text on that line, exactly as the first pass did. A correction you cannot point at is a guess, and a guess here costs the user another failed deploy.

Finish by calling submit_facts with the corrected facts. Submit only what you are changing or adding.`;

export type RepairResult = {
  facts: ProjectFacts;
  composition: CompositionResult;
  verification: VerificationFinding[];
  /** True when the agent actually changed something. A no-op repair must not trigger a redeploy. */
  changed: boolean;
  agent?: { stopReason: string; errorMessage?: string };
};

export type RunRepairOptions = {
  repositoryRoot: string;
  projectName?: string;
  mode?: InfrastructureMode;
  /** What we believed when we composed the configuration that failed. */
  facts: ProjectFacts;
  /** Decisions the user has changed. Carried through so a repair cannot silently undo one. */
  decisions?: Record<string, string>;
  failure: DeployFailure;
  runAgent: AgentRunner;
  onEvent?: (event: AgentEvent) => void;
  budget?: { maxTurns: number; wallClockMs: number };
};

/** Smaller than the first pass: the failure says where to look, so exploration should be short. */
const DEFAULT_BUDGET = { maxTurns: 15, wallClockMs: 5 * 60_000 };

/**
 * Did this submission actually change anything?
 *
 * Compared on the composed configuration rather than on the facts, because that is what gets
 * deployed: an agent that adds a citation to a fact it did not otherwise touch has told us
 * something true and given us no reason to try AWS again.
 */
const producesDifferentConfig = (before: CompositionResult, after: CompositionResult): boolean =>
  JSON.stringify(before.config) !== JSON.stringify(after.config);

export const runRepairMission = async (options: RunRepairOptions): Promise<RepairResult> => {
  const compose = (facts: ProjectFacts): CompositionResult =>
    composeConfig({
      facts,
      ...(options.mode === undefined ? {} : { mode: options.mode }),
      ...(options.projectName === undefined ? {} : { projectName: options.projectName }),
      ...(options.decisions === undefined ? {} : { decisions: options.decisions }),
      engineVersions: versionJson.rds
    });

  const before = compose(options.facts);
  const { files } = await listRepositoryFiles(options.repositoryRoot);

  const outcome = await options.runAgent(
    {
      repositoryRoot: options.repositoryRoot,
      systemPrompt: REPAIR_SYSTEM_PROMPT,
      userPrompt: `${describeFailureForAgent(options.failure)}\n\nFind what we got wrong about this repository and submit the corrected facts.`,
      files,
      brief: options.facts,
      budget: options.budget ?? DEFAULT_BUDGET
    },
    { onEvent: options.onEvent ?? (() => {}) }
  );

  const agent = {
    stopReason: outcome.stopReason,
    ...(outcome.errorMessage === undefined ? {} : { errorMessage: outcome.errorMessage })
  };

  if (outcome.submission === undefined) {
    return { facts: options.facts, composition: before, verification: [], changed: false, agent };
  }

  const merged = mergeAgentSubmission({ baseline: options.facts, submission: outcome.submission });

  // Verified exactly as the first pass is. A model under pressure to produce *a* fix is a model
  // more likely to invent one, so this is the attempt where citation checking earns the most.
  const workspace = new Workspace(options.repositoryRoot);
  const verification = await verifyFacts({
    facts: merged,
    readFile: async (path) => {
      const result = await workspace.read(path);
      return 'contents' in result ? result.contents : null;
    }
  });

  const after = compose(verification.facts);
  return {
    facts: verification.facts,
    composition: after,
    verification: verification.findings,
    changed: producesDifferentConfig(before, after),
    agent
  };
};

/** Structural problems in the repaired document, for a caller that wants to report them. */
export const repairCompleteness = (result: RepairResult): ReturnType<typeof checkFactsCompleteness> =>
  checkFactsCompleteness(result.facts);
