import type { AgentModelConfig, AgentModelKey, AgentProvider } from './types';
import { getArgValue } from './cli-args';

export const AGENT_IDS: Record<AgentModelKey, string> = {
  writer: 'page-writer',
  firstTimeUserReviewer: 'first-time-user-reviewer',
  productionEngineerReviewer: 'production-engineer-reviewer',
  aiConsumerReviewer: 'ai-consumer-reviewer',
  factualAccuracyVerifier: 'factual-accuracy-verifier',
  sourceGroundingVerifier: 'source-grounding-verifier',
  apiCompletenessAuditor: 'api-completeness-auditor'
};

export const DEFAULT_REVIEWER_MODEL = 'claude-sonnet-4-6';

export const getModelNameForDisplay = (model?: string) => model || 'cli-default';

const DEFAULT_AGENT_PROVIDERS: Record<AgentModelKey, AgentProvider> = {
  writer: 'claude',
  firstTimeUserReviewer: 'claude',
  productionEngineerReviewer: 'claude',
  // AI-consumer reviewer runs on codex by default. Two reasons:
  //   1. Its rubric is mechanical (15 hard AEO/extractability criteria) — codex handles
  //      rule-based checklists well.
  //   2. Thematic fit: it simulates an AI answer engine reading the page; having codex play
  //      that role gives the lens an extra signal grounded in source files.
  // Also helps balance load — Claude is the rate-limit bottleneck; codex sits at lower
  // utilization.
  aiConsumerReviewer: 'codex',
  // Factual-accuracy-verifier on codex: the pipeline already special-cases codex factual-accuracy
  // highs in run-page.ts (treats them as hard blockers only when source-grounding-verifier agrees),
  // so over-flagging is already mitigated. Moving this here frees one Claude verifier call per
  // page during the parallel verifier burst.
  factualAccuracyVerifier: 'codex',
  sourceGroundingVerifier: 'codex',
  apiCompletenessAuditor: 'codex'
};

const DEFAULT_AGENT_MODELS: Partial<Record<AgentModelKey, string>> = {
  firstTimeUserReviewer: DEFAULT_REVIEWER_MODEL,
  productionEngineerReviewer: DEFAULT_REVIEWER_MODEL
  // ai-consumer-reviewer is now codex; CLI picks the default codex model.
};

export type ResolvedAgentModel = {
  provider: AgentProvider;
  model?: string;
};

const parseModelOverride = (value?: string): { provider?: AgentProvider; model?: string } => {
  const match = value?.match(/^(claude|codex):(.+)$/);
  if (!match) {
    return { model: value };
  }
  return { provider: match[1] as AgentProvider, model: match[2] };
};

export const resolveAgentModel = ({
  agentModels,
  key
}: {
  agentModels: AgentModelConfig;
  key: AgentModelKey;
}): ResolvedAgentModel => {
  const parsed = parseModelOverride(agentModels[key]);
  return {
    provider: parsed.provider || DEFAULT_AGENT_PROVIDERS[key],
    model: parsed.model || DEFAULT_AGENT_MODELS[key]
  };
};

export const formatResolvedAgentModel = ({ provider, model }: ResolvedAgentModel) =>
  `${provider}:${getModelNameForDisplay(model)}`;

export const buildAgentModelConfigFromArgv = (argv = process.argv): AgentModelConfig => {
  const reviewerModel = getArgValue(argv, '--reviewerModel');
  const codexVerifierModel = getArgValue(argv, '--codexVerifierModel');

  return {
    writer: getArgValue(argv, '--writerModel'),
    firstTimeUserReviewer: getArgValue(argv, '--firstTimeUserReviewerModel') || reviewerModel,
    productionEngineerReviewer: getArgValue(argv, '--productionEngineerReviewerModel') || reviewerModel,
    aiConsumerReviewer: getArgValue(argv, '--aiConsumerReviewerModel') || reviewerModel,
    factualAccuracyVerifier:
      getArgValue(argv, '--factualAccuracyVerifierModel') ||
      getArgValue(argv, '--factualVerifierModel'),
    sourceGroundingVerifier:
      getArgValue(argv, '--sourceGroundingVerifierModel') ||
      getArgValue(argv, '--sourceVerifierModel') ||
      codexVerifierModel,
    apiCompletenessAuditor:
      getArgValue(argv, '--apiCompletenessAuditorModel') ||
      getArgValue(argv, '--pageAuditorModel') ||
      codexVerifierModel
  };
};

export const formatAgentModelConfigForLog = (agentModels: AgentModelConfig) => {
  const entries = Object.entries(agentModels).filter((entry): entry is [AgentModelKey, string] => Boolean(entry[1]));
  if (entries.length === 0) return 'agentModels=defaults';
  return `agentModels=${entries.map(([key, model]) => `${AGENT_IDS[key]}:${model}`).join(',')}`;
};

export const getAgentModelAssignmentsForState = (agentModels: AgentModelConfig): Record<string, string> => ({
  [AGENT_IDS.writer]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'writer' })),
  [AGENT_IDS.firstTimeUserReviewer]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'firstTimeUserReviewer' })),
  [AGENT_IDS.productionEngineerReviewer]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'productionEngineerReviewer' })),
  [AGENT_IDS.aiConsumerReviewer]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'aiConsumerReviewer' })),
  [AGENT_IDS.factualAccuracyVerifier]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'factualAccuracyVerifier' })),
  [AGENT_IDS.sourceGroundingVerifier]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'sourceGroundingVerifier' })),
  [AGENT_IDS.apiCompletenessAuditor]: formatResolvedAgentModel(resolveAgentModel({ agentModels, key: 'apiCompletenessAuditor' })),
  'code-block-validator': 'local'
});
