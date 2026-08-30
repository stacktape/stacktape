/**
 * The single production-stage classifier. Incident severity, error-tracking escalation, the
 * delete-production permission gate, deploy gates, and remediation autonomy all branch on "is this
 * stage production?" — they must agree, so every classification goes through here.
 *
 * An explicit `stageType` from stack config always wins; the name inference only fills its absence.
 */

export type StageType = 'production' | 'non-production';

/** A token that marks a stage name as production-like when it appears alone or as a segment. */
const PRODUCTION_TOKENS = new Set(['prod', 'production', 'prd', 'live']);

/**
 * A token that vetoes the production inference even when a production token is present:
 * `pre-prod`, `prod-test`, and `staging-live` are rehearsal environments, and paging someone for
 * them defeats the point of the classification.
 */
const NON_PRODUCTION_TOKENS = new Set([
  'pre',
  'preprod',
  'nonprod',
  'non',
  'dev',
  'development',
  'test',
  'testing',
  'qa',
  'uat',
  'stage',
  'staging',
  'demo',
  'sandbox',
  'preview',
  'local'
]);

/** Splits a stage name into comparable segments: `Prod-EU_west` -> ['prod', 'eu', 'west']. */
const tokenizeStageName = (stageName: string): string[] =>
  stageName.trim().toLowerCase().split(/[-_.]/).filter(Boolean);

/** Name-based inference alone. Prefer `classifyStage`, which honors an explicit stage type. */
export const isProductionStageName = (stageName: string): boolean => {
  const tokens = tokenizeStageName(stageName);
  if (!tokens.length) return false;
  if (tokens.some((token) => NON_PRODUCTION_TOKENS.has(token))) return false;
  return tokens.some((token) => PRODUCTION_TOKENS.has(token));
};

export type StageClassification = {
  isProduction: boolean;
  /** Whether the verdict came from an explicit config `stageType` or from the name inference. */
  source: 'explicit' | 'inferred';
};

export const classifyStage = ({
  stageName,
  explicitStageType
}: {
  stageName: string;
  explicitStageType?: StageType | null;
}): StageClassification => {
  if (explicitStageType) {
    return { isProduction: explicitStageType === 'production', source: 'explicit' };
  }
  return { isProduction: isProductionStageName(stageName), source: 'inferred' };
};
