import { readJson, pathExists } from 'fs-extra';
import { join } from 'node:path';

const stacktapeRoot = join(import.meta.dir, '..', '..', '..');
const pricesJsonPath = join(stacktapeRoot, '@generated', 'aws-price', 'prices.json');

type InstancePrice = {
  label: string;
  instanceType: string;
  vCpu: string;
  memory: string;
  monthlyCost: number;
};

type FargateRow = {
  label: string;
  monthlyCost: number;
};

type PricesJson = {
  rdsInstances?: InstancePrice[];
  auroraInstances?: InstancePrice[];
  elasticacheInstances?: InstancePrice[];
  fargateCpu?: FargateRow[];
  fargateMemory?: FargateRow[];
};

let pricesCache: PricesJson | null | undefined;

const loadPrices = async (): Promise<PricesJson | null> => {
  if (pricesCache !== undefined) return pricesCache;
  if (!(await pathExists(pricesJsonPath))) {
    pricesCache = null;
    return pricesCache;
  }
  pricesCache = (await readJson(pricesJsonPath)) as PricesJson;
  return pricesCache;
};

const formatPrice = (value: number) => {
  if (value < 1) return `$${value.toFixed(3)}`;
  if (value < 100) return `$${value.toFixed(2)}`;
  return `$${Math.round(value)}`;
};

const summarizeInstanceFamily = ({
  rows,
  familyLabel
}: {
  rows: InstancePrice[];
  familyLabel: string;
}) => {
  if (rows.length === 0) return null;
  const sortedByPrice = [...rows].sort((a, b) => a.monthlyCost - b.monthlyCost);
  const cheapest = sortedByPrice[0];
  const expensive = sortedByPrice[sortedByPrice.length - 1];
  // Pick a "common" mid-tier choice: ~25% of the way through, but cap at first general-purpose.
  const midIndex = Math.min(Math.floor(sortedByPrice.length * 0.25), sortedByPrice.length - 1);
  const common = sortedByPrice[midIndex];
  return [
    `**${familyLabel}**:`,
    `- Cheapest: \`${cheapest.instanceType}\` (${cheapest.vCpu} vCPU, ${cheapest.memory}) — ~${formatPrice(cheapest.monthlyCost)}/month`,
    `- Common low-end: \`${common.instanceType}\` (${common.vCpu} vCPU, ${common.memory}) — ~${formatPrice(common.monthlyCost)}/month`,
    `- Largest: \`${expensive.instanceType}\` (${expensive.vCpu} vCPU, ${expensive.memory}) — ~${formatPrice(expensive.monthlyCost)}/month`,
    `- ${rows.length} sizes available across this family. Prices are us-east-1 list price for an on-demand single-AZ instance, before storage and I/O.`
  ].join('\n');
};

const summarizeFargate = (cpuRows: FargateRow[], memoryRows: FargateRow[]) => {
  if (cpuRows.length === 0 && memoryRows.length === 0) return null;
  const lines = ['**AWS Fargate** (used by `web-service`, `private-service`, `worker-service`, `multi-container-workload`, `batch-job`):'];
  if (cpuRows.length) {
    const sorted = [...cpuRows].sort((a, b) => a.monthlyCost - b.monthlyCost);
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];
    lines.push(`- vCPU billing: ~${formatPrice(cheapest.monthlyCost)}/month per ${cheapest.label} up to ~${formatPrice(expensive.monthlyCost)}/month per ${expensive.label}.`);
  }
  if (memoryRows.length) {
    const sorted = [...memoryRows].sort((a, b) => a.monthlyCost - b.monthlyCost);
    const cheapest = sorted[0];
    const expensive = sorted[sorted.length - 1];
    lines.push(`- Memory billing: ~${formatPrice(cheapest.monthlyCost)}/month per ${cheapest.label} up to ~${formatPrice(expensive.monthlyCost)}/month per ${expensive.label}.`);
  }
  lines.push('- Total monthly cost = (vCPU rate × tasks × hours) + (memory rate × tasks × hours). Idle tasks still bill — Fargate cannot scale to zero.');
  lines.push('- Prices are us-east-1 list price; ARM (Graviton) tasks bill ~20% less than x86.');
  return lines.join('\n');
};

const buildSummary = (prices: PricesJson, sections: string[]): string => {
  return [
    '# AWS pricing summary',
    '',
    '_Distilled from `@generated/aws-price/prices.json`. All prices are us-east-1 list price for an on-demand single instance/task and exclude storage, I/O, and data transfer. Use these as ballpark figures — quote them with "~" or "approximately" in docs._',
    '',
    ...sections
  ]
    .filter(Boolean)
    .join('\n');
};

export const getPricingSummary = async (resourceSlug: string): Promise<string | null> => {
  const prices = await loadPrices();
  if (!prices) return null;

  if (resourceSlug === 'relational-database') {
    const sections: string[] = [];
    if (prices.rdsInstances?.length) {
      const summary = summarizeInstanceFamily({ rows: prices.rdsInstances, familyLabel: 'RDS instance pricing' });
      if (summary) sections.push(summary, '');
    }
    if (prices.auroraInstances?.length) {
      const summary = summarizeInstanceFamily({ rows: prices.auroraInstances, familyLabel: 'Aurora instance pricing' });
      if (summary) sections.push(summary, '');
    }
    if (sections.length === 0) return null;
    return buildSummary(prices, sections);
  }

  if (resourceSlug === 'redis') {
    if (!prices.elasticacheInstances?.length) return null;
    const summary = summarizeInstanceFamily({ rows: prices.elasticacheInstances, familyLabel: 'ElastiCache (Redis) instance pricing' });
    return summary ? buildSummary(prices, [summary]) : null;
  }

  // Container-based compute resources all use Fargate pricing.
  if (
    [
      'web-service',
      'private-service',
      'worker-service',
      'multi-container-workload',
      'batch-job'
    ].includes(resourceSlug)
  ) {
    const summary = summarizeFargate(prices.fargateCpu || [], prices.fargateMemory || []);
    return summary ? buildSummary(prices, [summary]) : null;
  }

  return null;
};
