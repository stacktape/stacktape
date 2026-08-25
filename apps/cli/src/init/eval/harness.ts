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
  /** Exact resource count, including zero for deliberately unsupported application shapes. */
  resourceCount?: number;
  /** Exact deployable process count, used where phantom package detection is part of the contract. */
  serviceCount?: number;
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
  /** Deploy-time scripts the composition must emit, by name — the migration hook above all. */
  scriptNames?: readonly string[];
  /**
   * Environment entries a composed resource must carry, value included.
   *
   * The wiring is the part a deploy cannot check — infrastructure that exists next to an app that
   * cannot reach it deploys green — so the corpus has to assert the emitted values directly.
   */
  serviceEnvironment?: ReadonlyArray<{ resource: string; name: string; value: string }>;
  /** Environment entries that optional capabilities must not force into the generated service. */
  absentServiceEnvironment?: ReadonlyArray<{ resource: string; name: string }>;
  /** Routing and scaling semantics that are otherwise invisible behind a valid resource type. */
  serviceProperties?: ReadonlyArray<{
    resource: string;
    containerPort?: number;
    minInstances?: number;
    maxInstances?: number;
  }>;
  /** User-visible setup guidance emitted by composition. */
  requiredGapPatterns?: readonly string[];
  forbiddenGapPatterns?: readonly string[];
  /** Packaging contracts that must survive the complete probe, verification, and composition path. */
  resourcePackaging?: ReadonlyArray<{
    resource: string;
    type: string;
    /** `null` asserts that the image's own CMD/ENTRYPOINT remains authoritative. */
    command?: readonly string[] | null;
    buildContextPath?: string;
    dockerfilePath?: string;
    buildArgs?: ReadonlyArray<{ argName: string; value: string }>;
  }>;
  /** Persistent service mounts whose resource binding and in-container path must survive composition. */
  serviceVolumeMounts?: ReadonlyArray<{
    resource: string;
    type: string;
    efsFilesystemName: string;
    mountPath: string;
  }>;
};

export type EvalCase = {
  name: string;
  /** A fixture repository, written to a temporary directory for the run. */
  files: Record<string, string>;
  /** Stable repository basename for cases whose inferred service name comes from the directory. */
  directoryName?: string;
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

const writeFixture = async (
  files: Record<string, string>,
  directoryName?: string
): Promise<{ root: string; cleanupRoot: string }> => {
  const cleanupRoot = await mkdtemp(join(tmpdir(), 'stacktape-eval-'));
  const root = directoryName === undefined ? cleanupRoot : join(cleanupRoot, directoryName);
  if (directoryName !== undefined) await mkdir(root, { recursive: true });
  for (const [path, contents] of Object.entries(files)) {
    const absolute = join(root, path);
    await mkdir(join(absolute, '..'), { recursive: true });
    await writeFile(absolute, contents, 'utf8');
  }
  return { root, cleanupRoot };
};

export const scoreResult = (evalCase: EvalCase, result: GreenfieldResult): EvalScore => {
  const failures: EvalFailure[] = [];
  const { expect: expected } = evalCase;

  const foundKinds = new Set(result.facts.dependencies.map((dependency) => dependency.kind));
  if (expected.serviceCount !== undefined && result.facts.services.length !== expected.serviceCount) {
    failures.push({
      stage: 'facts',
      detail: `Expected ${expected.serviceCount} service(s); found ${result.facts.services.length}.`
    });
  }
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
        failures.push({
          stage: 'composition',
          detail: `Expected a resource named "${name}". Found: ${Object.keys(composed).join(', ') || 'none'}.`
        });
      } else if (actual.type !== type) {
        failures.push({ stage: 'composition', detail: `"${name}" is a ${actual.type}; expected a ${type}.` });
      }
    }
  }
  if (
    expected.resourceCount !== undefined &&
    Object.keys(result.composition.config.resources).length !== expected.resourceCount
  ) {
    failures.push({
      stage: 'composition',
      detail: `Composed ${Object.keys(result.composition.config.resources).length} resources; expected exactly ${expected.resourceCount}.`
    });
  }

  for (const scriptName of expected.scriptNames ?? []) {
    if (result.composition.config.scripts?.[scriptName] === undefined) {
      failures.push({ stage: 'composition', detail: `Expected a script named "${scriptName}"; none was emitted.` });
    }
  }

  for (const wiring of expected.serviceEnvironment ?? []) {
    const resource = result.composition.config.resources[wiring.resource];
    const container = resource?.properties.container as
      | { environment?: Array<{ name: string; value: unknown }> }
      | undefined;
    const environment = (resource?.properties.environment ?? container?.environment ?? []) as Array<{
      name: string;
      value: unknown;
    }>;
    const entry = environment.find((variable) => variable.name === wiring.name);
    if (entry === undefined) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${wiring.resource}" to carry the ${wiring.name} variable; it does not.`
      });
    } else if (entry.value !== wiring.value) {
      failures.push({
        stage: 'composition',
        detail: `${wiring.name} on "${wiring.resource}" is ${String(entry.value)}; expected ${wiring.value}.`
      });
    }
  }

  for (const absent of expected.absentServiceEnvironment ?? []) {
    const resource = result.composition.config.resources[absent.resource];
    const container = resource?.properties.container as
      | { environment?: Array<{ name: string; value: unknown }> }
      | undefined;
    const environment = (resource?.properties.environment ?? container?.environment ?? []) as Array<{
      name: string;
      value: unknown;
    }>;
    if (environment.some((variable) => variable.name === absent.name)) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${absent.resource}" to omit optional ${absent.name}; it was emitted.`
      });
    }
  }

  for (const expectedProperties of expected.serviceProperties ?? []) {
    const properties = result.composition.config.resources[expectedProperties.resource]?.properties;
    const scaling = properties?.scaling as { minInstances?: number; maxInstances?: number } | undefined;
    for (const [field, actual] of [
      ['containerPort', properties?.containerPort],
      ['minInstances', scaling?.minInstances],
      ['maxInstances', scaling?.maxInstances]
    ] as const) {
      const wanted = expectedProperties[field];
      if (wanted !== undefined && actual !== wanted) {
        failures.push({
          stage: 'composition',
          detail: `${field} on "${expectedProperties.resource}" is ${String(actual)}; expected ${wanted}.`
        });
      }
    }
  }

  const gapText = result.composition.gaps.map((gap) => `${gap.subject}: ${gap.message}`);
  for (const pattern of expected.requiredGapPatterns ?? []) {
    if (!gapText.some((gap) => new RegExp(pattern, 'i').test(gap))) {
      failures.push({ stage: 'composition', detail: `Expected a composition gap matching /${pattern}/i.` });
    }
  }
  for (const pattern of expected.forbiddenGapPatterns ?? []) {
    const match = gapText.find((gap) => new RegExp(pattern, 'i').test(gap));
    if (match !== undefined) {
      failures.push({ stage: 'composition', detail: `Unexpected composition gap matching /${pattern}/i: ${match}` });
    }
  }

  for (const packagingExpectation of expected.resourcePackaging ?? []) {
    const resource = result.composition.config.resources[packagingExpectation.resource];
    const container = resource?.properties.container as { packaging?: unknown } | undefined;
    const packaging = (resource?.properties.packaging ?? container?.packaging) as
      | {
          type?: string;
          properties?: {
            command?: readonly string[];
            buildContextPath?: string;
            dockerfilePath?: string;
            buildArgs?: ReadonlyArray<{ argName: string; value: string }>;
          };
        }
      | undefined;
    if (packaging?.type !== packagingExpectation.type) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" packaging to be ${packagingExpectation.type}; found ${packaging?.type ?? 'nothing'}.`
      });
    } else if (packagingExpectation.command === null && packaging.properties?.command !== undefined) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" to preserve its image command; found ${JSON.stringify(packaging.properties.command)}.`
      });
    } else if (
      packagingExpectation.command !== undefined &&
      packagingExpectation.command !== null &&
      JSON.stringify(packaging.properties?.command) !== JSON.stringify(packagingExpectation.command)
    ) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" to run ${JSON.stringify(packagingExpectation.command)}; found ${JSON.stringify(packaging.properties?.command)}.`
      });
    } else if (
      packagingExpectation.buildContextPath !== undefined &&
      packaging.properties?.buildContextPath !== packagingExpectation.buildContextPath
    ) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" to build from ${packagingExpectation.buildContextPath}; found ${packaging.properties?.buildContextPath ?? 'nothing'}.`
      });
    } else if (
      packagingExpectation.dockerfilePath !== undefined &&
      packaging.properties?.dockerfilePath !== packagingExpectation.dockerfilePath
    ) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" to use Dockerfile ${packagingExpectation.dockerfilePath}; found ${packaging.properties?.dockerfilePath ?? 'nothing'}.`
      });
    } else if (
      packagingExpectation.buildArgs !== undefined &&
      JSON.stringify(packaging.properties?.buildArgs) !== JSON.stringify(packagingExpectation.buildArgs)
    ) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${packagingExpectation.resource}" build arguments ${JSON.stringify(packagingExpectation.buildArgs)}; found ${JSON.stringify(packaging.properties?.buildArgs)}.`
      });
    }
  }

  for (const mountExpectation of expected.serviceVolumeMounts ?? []) {
    const resource = result.composition.config.resources[mountExpectation.resource];
    const mounts = (resource?.properties.volumeMounts ?? []) as Array<{
      type?: string;
      properties?: { efsFilesystemName?: string; mountPath?: string };
    }>;
    const matching = mounts.find(
      (mount) =>
        mount.type === mountExpectation.type &&
        mount.properties?.efsFilesystemName === mountExpectation.efsFilesystemName &&
        mount.properties.mountPath === mountExpectation.mountPath
    );
    if (matching === undefined) {
      failures.push({
        stage: 'composition',
        detail: `Expected "${mountExpectation.resource}" to mount ${mountExpectation.efsFilesystemName} at ${mountExpectation.mountPath}; found ${JSON.stringify(mounts)}.`
      });
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
  const { root, cleanupRoot } = await writeFixture(evalCase.files, evalCase.directoryName);
  try {
    const result = await runGreenfieldMission({
      repositoryRoot: root,
      projectName: 'eval',
      ...(runAgent === undefined ? {} : { runAgent })
    });
    return scoreResult(evalCase, result);
  } finally {
    await rm(cleanupRoot, { recursive: true, force: true });
  }
};

export const summarise = (scores: readonly EvalScore[]): string => {
  const passed = scores.filter((score) => score.passed).length;
  const questions = scores.reduce((total, score) => total + score.questionsAsked, 0);
  const dropped = scores.reduce((total, score) => total + score.claimsDropped, 0);
  return `${passed}/${scores.length} cases passed · ${questions} things assumed · ${dropped} claims dropped`;
};
