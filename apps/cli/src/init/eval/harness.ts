/**
 * Scoring what the pipeline produces, per stage rather than only end to end.
 *
 * A three-stage pipeline you can only score end to end is a three-stage pipeline you cannot debug:
 * "the config was wrong" does not say whether a probe missed something, the agent misread it, or the
 * composer mapped it badly. So each case reports where it lost points.
 *
 * Two metrics matter more than they look, and neither is a pass/fail:
 *
 * - **Things assumed.** Nothing is asked any more, but every assumption is still a detector we did
 *   not write. The count is the honest measure of how good the deterministic half is, and it should
 *   fall over time.
 * - **Claims dropped for bad citations.** How much the model is making up. It should be near zero on
 *   a healthy provider, and a jump is the first sign that a vendor changed something under us.
 *
 * Running with no agent is the baseline every provider is measured against. If a provider does not
 * beat the probes, it is not earning the user's tokens.
 */

import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runGreenfieldMission, type AgentRunner, type GreenfieldResult } from '../missions/greenfield';

export type EvalExpectation = {
  /** Resource names and their Stacktape type, as the composer should emit them. */
  resources?: Record<string, string>;
  /** Dependency kinds the analysis must find, in any order. */
  dependencyKinds?: readonly string[];
  /** Dependency kinds it must NOT invent. */
  absentDependencyKinds?: readonly string[];
  /** Whether the result should be ready to deploy without further answers. */
  deployable?: boolean;
  /** Decisions the run must have taken on the user's behalf rather than asked about. */
  assumesKinds?: string[];
  /** Ceiling on questions asked. Exceeding it is a regression in the deterministic half. */
  maxQuestions?: number;
  /**
   * Claims the sensors must CATCH, named by the uncertainty kind they should raise.
   *
   * Every other expectation here asserts that good input passes. Without this one the corpus can
   * only tell us the pipeline is permissive, never that it is discriminating — and a suite reporting
   * "0 claims dropped" would look identical whether the verifier is working or switched off. Asking
   * "if a sensor never fires, is that quality or blindness?" is only answerable if some cases
   * require it to fire.
   */
  raisesQuestionKinds?: readonly string[];
};

export type EvalCase = {
  name: string;
  /** A fixture repository, written to a temporary directory for the run. */
  files: Record<string, string>;
  expect: EvalExpectation;
};

export type EvalFailure = {
  /** Which stage lost the point, so a failure names its own cause. */
  stage: 'facts' | 'verification' | 'composition';
  detail: string;
};

export type EvalScore = {
  name: string;
  passed: boolean;
  failures: EvalFailure[];
  /** Every question is a detector we did not write. */
  questionsAsked: number;
  /** How much the model made up. Should be near zero. */
  claimsDropped: number;
  servicesFound: number;
  dependenciesFound: number;
};

const writeFixture = async (files: Record<string, string>): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-eval-'));
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, contents, 'utf8');
  }
  return root;
};

export const scoreResult = (evalCase: EvalCase, result: GreenfieldResult): EvalScore => {
  const failures: EvalFailure[] = [];
  const { expect: expected } = evalCase;

  const foundKinds = new Set(result.facts.dependencies.map((dependency) => dependency.kind));
  for (const kind of expected.dependencyKinds ?? []) {
    if (!foundKinds.has(kind as never)) {
      failures.push({ stage: 'facts', detail: `Expected a ${kind} dependency; none was found.` });
    }
  }
  for (const kind of expected.absentDependencyKinds ?? []) {
    if (foundKinds.has(kind as never)) {
      failures.push({ stage: 'facts', detail: `Invented a ${kind} dependency that the repository does not use.` });
    }
  }

  if (expected.resources !== undefined) {
    const composed = result.composition.config.resources;
    for (const [name, type] of Object.entries(expected.resources)) {
      const actual = composed[name];
      if (actual === undefined) {
        failures.push({ stage: 'composition', detail: `Expected a resource named "${name}".` });
      } else if (actual.type !== type) {
        failures.push({ stage: 'composition', detail: `"${name}" is a ${actual.type}; expected a ${type}.` });
      }
    }
  }

  if (expected.deployable !== undefined && result.composition.deployable !== expected.deployable) {
    failures.push({
      stage: 'composition',
      detail: `deployable was ${result.composition.deployable}; expected ${expected.deployable}. Assumed: ${result.composition.assumptions.map((entry) => entry.kind).join(', ') || 'none'}`
    });
  }

  // `composition.assumptions`, not `facts.uncertainties`. Composition decides some things itself —
  // keeping a live database rather than replacing it is one — and only the composition holds both.
  // This has now caught the same team out twice: the wizard silently ignored answers to exactly
  // those questions, and this scorer reported a sensor as blind when it had fired correctly.
  const assumptions = result.composition.assumptions;
  const raisedKinds = new Set(assumptions.map((entry) => entry.kind));
  for (const kind of [...(expected.raisesQuestionKinds ?? []), ...(expected.assumesKinds ?? [])]) {
    if (!raisedKinds.has(kind as never)) {
      failures.push({
        stage: 'verification',
        detail: `Expected a "${kind}" question to be raised; the sensors let this through. Raised: ${[...raisedKinds].join(', ') || 'nothing'}.`
      });
    }
  }

  // Assumptions are not free even though they never interrupt: each one is something the pipeline
  // could not work out, and a run that assumes ten things is a run that read the project badly.
  const questionsAsked = assumptions.length;
  if (expected.maxQuestions !== undefined && questionsAsked > expected.maxQuestions) {
    failures.push({
      stage: 'facts',
      detail: `Assumed ${questionsAsked} things; at most ${expected.maxQuestions} expected. Each one is a detector we did not write.`
    });
  }

  return {
    name: evalCase.name,
    passed: failures.length === 0,
    failures,
    questionsAsked,
    claimsDropped: assumptions.filter((entry) => entry.kind === 'unconfirmed-claim').length,
    servicesFound: result.facts.services.length,
    dependenciesFound: result.facts.dependencies.length
  };
};

/**
 * Run one case.
 *
 * `runAgent` is omitted for the baseline and supplied as a replay runner for a recorded provider, so
 * the same harness scores both without a second code path.
 */
export const runEvalCase = async (evalCase: EvalCase, runAgent?: AgentRunner): Promise<EvalScore> => {
  const root = await writeFixture(evalCase.files);
  try {
    const result = await runGreenfieldMission({
      repositoryRoot: root,
      projectName: 'eval',
      ...(runAgent === undefined ? {} : { runAgent })
    });
    return scoreResult(evalCase, result);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

export const summarise = (scores: readonly EvalScore[]): string => {
  const passed = scores.filter((score) => score.passed).length;
  const questions = scores.reduce((total, score) => total + score.questionsAsked, 0);
  const dropped = scores.reduce((total, score) => total + score.claimsDropped, 0);
  return `${passed}/${scores.length} cases passed · ${questions} things assumed · ${dropped} claims dropped`;
};
