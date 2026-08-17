/**
 * What one init session reports home, and the rule that decides what may be in it.
 *
 * The rule: **categories and counts, never content.** A framework name like `rails` is a label our
 * own pipeline assigned; a service called `orders-api` is the user's. The first kind teaches us
 * where generation succeeds and dies — which frameworks fail, whether the repair loop earns its
 * keep, how far people get before they stop — and the second kind is none of our business. Nothing
 * here may carry a name, a path, a quote, or a line of anyone's repository.
 *
 * Opt-out and transport belong to the existing CLI telemetry (`STP_DISABLE_TELEMETRY`, PostHog with
 * the shared sanitiser); this module only shapes the event. It never throws and never blocks: a
 * session summary that cannot be sent is dropped, not retried.
 */

import { ANALYTICS_EVENTS, type ProductAnalyticsEventMap } from '@stacktape/analytics/events';
import { capturePostHogEvent, flushPostHog, getTelemetryIdentity } from '@utils/telemetry';
import type { WizardState } from './server/wizard-server';

type InitCompleted = ProductAnalyticsEventMap[typeof ANALYTICS_EVENTS.initCompleted];

/** How far the session got, which is the single most useful thing to know about it. */
const reachedFrom = (state: WizardState): InitCompleted['reached'] | undefined => {
  if (state.deployment?.status === 'succeeded') return 'deployed';
  if (state.deployment !== undefined) return 'deploy_failed';
  if (state.configFile !== undefined) return 'written';
  if (state.composition !== undefined) return 'reviewed';
  if (state.facts !== undefined) return 'analysed';
  // Nothing ran. A session someone opened and closed is not an outcome worth a row.
  return undefined;
};

type StateFacts = {
  services?: Array<{ framework?: string; language?: string }>;
  dependencies?: Array<{ kind: string }>;
  decisions?: Array<{ id: string }>;
  existingDeployments?: Array<{ tool: string }>;
};

type StateComposition = {
  resources?: Record<string, { type: string }>;
  gaps?: unknown[];
};

/**
 * The event for one finished session, or undefined when there is nothing worth reporting.
 *
 * `analysisDurationMs` comes from the caller because only it saw both ends of the run.
 */
export const initTelemetryEvent = (
  state: WizardState,
  {
    presentation,
    analysisDurationMs,
    deployDurationMs,
    agentSkipped
  }: {
    presentation: 'browser' | 'terminal';
    analysisDurationMs?: number;
    deployDurationMs?: number;
    agentSkipped?: boolean;
  }
): InitCompleted | undefined => {
  const reached = reachedFrom(state);
  if (reached === undefined) return undefined;

  const facts = (state.facts ?? {}) as StateFacts;
  const composition = (state.composition ?? {}) as StateComposition;
  const services = facts.services ?? [];

  return {
    presentation,
    agent: state.choice?.agentId ?? 'none',
    mode: state.mode ?? 'standard',
    reached,
    // Labels the pipeline itself assigned — `rails`, `django` — never names from the repository.
    frameworks: [...new Set(services.map((service) => service.framework ?? service.language ?? 'unknown'))],
    dependency_kinds: [...new Set((facts.dependencies ?? []).map((dependency) => dependency.kind))],
    resource_types: [...new Set(Object.values(composition.resources ?? {}).map((resource) => resource.type))],
    service_count: services.length,
    decision_count: (facts.decisions ?? []).length,
    decisions_changed: Object.keys(state.answers ?? {}).length,
    gap_count: (composition.gaps ?? []).length,
    analysis_duration_ms: analysisDurationMs ?? null,
    deploy_duration_ms: deployDurationMs ?? null,
    repairs: (state.deployment?.repairs ?? []).map((repair) => repair.applied),
    ...(state.deployment !== undefined && state.deployment.status !== 'succeeded' && state.deployment.outcome
      ? { deploy_error_code: state.deployment.outcome.code }
      : {}),
    existing_deployment_tools: (facts.existingDeployments ?? []).map((deployment) => deployment.tool),
    ...verificationSummary(state),
    ...(agentSkipped === true ? { agent_skipped: true } : {})
  };
};

/**
 * How the local try-out went, reduced to a category. Statuses only — nothing a container printed
 * ever leaves the machine, because a log line is repository content.
 */
const verificationSummary = (
  state: WizardState
): Pick<
  InitCompleted,
  | 'verification'
  | 'verification_passed_services'
  | 'verification_failed_services'
  | 'verification_inconclusive_services'
  | 'verification_skipped_services'
> => {
  const verification = state.verification;
  if (verification === undefined) return {};
  if (verification.status === 'unavailable' || verification.status === 'dismissed') {
    return { verification: verification.status };
  }
  const services = verification.services ?? [];
  const passed = services.filter((service) => service.status === 'passed').length;
  const failed = services.filter((service) => service.status === 'failed').length;
  const inconclusive = services.filter((service) => service.status === 'inconclusive').length;
  const skipped = services.filter((service) => service.status === 'skipped').length;
  return {
    verification: failed > 0 ? 'failed' : inconclusive > 0 || skipped > 0 || passed === 0 ? 'inconclusive' : 'passed',
    ...(passed > 0 ? { verification_passed_services: passed } : {}),
    ...(failed > 0 ? { verification_failed_services: failed } : {}),
    ...(inconclusive > 0 ? { verification_inconclusive_services: inconclusive } : {}),
    ...(skipped > 0 ? { verification_skipped_services: skipped } : {})
  };
};

/** Send the session summary, if there is one. Fire-and-forget by design. */
export const reportInitTelemetry = async (
  state: WizardState,
  context: {
    presentation: 'browser' | 'terminal';
    analysisDurationMs?: number;
    deployDurationMs?: number;
    agentSkipped?: boolean;
  }
): Promise<void> => {
  try {
    const event = initTelemetryEvent(state, context);
    if (event === undefined) return;
    const { distinctId, hasIdentifiedUser } = getTelemetryIdentity();
    capturePostHogEvent(distinctId, ANALYTICS_EVENTS.initCompleted, event, {
      processPersonProfile: hasIdentifiedUser
    });
    await flushPostHog();
  } catch {
    // Telemetry must never make init fail, hang, or say anything.
  }
};
