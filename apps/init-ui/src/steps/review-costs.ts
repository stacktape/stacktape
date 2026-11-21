/**
 * What the Review step says about money: each resource's share of the monthly estimate, what its price is made of, and
 * what each option of a setting would cost. Plain functions over the estimate the CLI sends, so the words and the
 * arithmetic are tested without a browser.
 */

import type { ResourceSetting, SettingValue } from '@stacktape/config-inference/compose/resource-settings';
import type { CostLine, WizardState } from '../session';

type Price = NonNullable<NonNullable<WizardState['composition']>['price']>;

/** "$14", "$3.65", "$1,204": whole dollars from $10, cents below, the way a person reads a monthly bill. */
export const money = (amount: number): string => {
  if (Math.abs(amount) >= 10) return `$${Math.round(amount).toLocaleString('en-US')}`;
  return `$${amount.toFixed(2).replace(/\.00$/, '')}`;
};

/** "+$12/mo", "−$4.20/mo", or undefined for a difference too small to mention. */
export const monthlyDelta = (delta: number): string | undefined =>
  Math.abs(delta) < 0.5 ? undefined : `${delta > 0 ? '+' : '−'}${money(Math.abs(delta))}/mo`;

/** A rate as a person reads it: whole cents keep two places ("$0.20"), a third only when it says something ("$0.023"). */
const rateText = (rate: number): string => {
  if (rate >= 1) return `$${rate.toFixed(2).replace(/\.00$/, '')}`;
  if (rate >= 0.01) return `$${rate.toFixed(3).replace(/(\.\d\d)0$/, '$1')}`;
  return `$${Number(rate.toPrecision(3))}`;
};

/** A usage rate in the unit people quote it in: "$0.20 per 1M requests", "$0.023 per GB-month". */
export const usageRate = (line: Pick<CostLine, 'rate' | 'unit'>): string | undefined => {
  if (line.rate === undefined) return undefined;
  const unit = (line.unit ?? '').trim();
  const lower = unit.toLowerCase();
  const scaled = rateText;
  // One request is priced in millionths of a dollar; nobody reads that.
  if (lower === 'requests' || lower === 'request') return `${scaled(line.rate * 1_000_000)} per 1M requests`;
  if (lower === 'gb-mo' || lower === 'gb-month') return `${scaled(line.rate)} per GB-month`;
  if (lower.includes('gb-second')) return `${scaled(line.rate)} per GB-second`;
  if (lower === 'hrs' || lower === 'hours') return `${scaled(line.rate)} per hour`;
  return unit === '' ? scaled(line.rate) : `${scaled(line.rate)} per ${unit}`;
};

const quantityOf = (line: CostLine): number | undefined =>
  line.quantity === undefined || line.quantity === 1 ? undefined : line.quantity;

/**
 * A product of a resource's price in words: "Instance db.t4g.micro", "Storage · 20 GB", "Requests". Unknown products
 * keep the estimator's name with its dashes taken out.
 */
export const costLineLabel = (line: CostLine): string => {
  const { name } = line;
  const quantity = quantityOf(line);
  const rds = /^RDS-instance-(.+)-[a-z0-9-]+$/.exec(name);
  if (rds !== null)
    return `Instance ${rds[1]}${quantity === 2 ? ' + standby' : quantity === undefined ? '' : ` × ${quantity}`}`;
  if (name.startsWith('RDS-gp2-storage') || name.startsWith('RDS-gp3-storage')) {
    return `Storage${line.quantity === undefined ? '' : ` · ${Number(line.quantity.toFixed(1))} GB`}`;
  }
  if (name.startsWith('RDS-serverless')) return 'Serverless capacity';
  if (name === 'EC2-public-ip') return 'Public IP address';
  const ec2 = /^EC2-instance-(.+?)-(Linux|Windows)$/.exec(name);
  if (ec2 !== null) return `Server ${ec2[1]}`;
  if (name.startsWith('ECS-cpu'))
    return `CPU${line.quantity === undefined ? '' : ` · ${Number(line.quantity.toFixed(2))} vCPU`}`;
  if (name.startsWith('ECS-memory')) {
    return `Memory${line.quantity === undefined ? '' : ` · ${Number(line.quantity.toFixed(2))} GB`}`;
  }
  if (name === 'ECS-storage') return 'Container disk';
  const cache = /^ElastiCache-instance-(.+)$/.exec(name);
  if (cache !== null) return `Node ${cache[1]}${quantity === undefined ? '' : ` × ${quantity}`}`;
  if (name === 'ElastiCache-serverless') return 'Serverless cache';
  if (name === 'Lambda-execution-time' || name === 'Lambda-edge-execution-time') return 'Compute time';
  if (name === 'Lambda-price-per-request' || name === 'Lambda-edge-price-per-request') return 'Requests';
  if (name === 'Lambda-price-for-storage') return 'Function disk';
  if (name.startsWith('CloudFront')) return 'CDN requests';
  if (name === 'S3-storage') return 'File storage';
  if (name === 'S3-put-requests') return 'Uploads';
  if (name === 'S3-get-requests') return 'Downloads';
  if (name === 'ApiGateway-http-api-requests') return 'API requests';
  if (name === 'EFS-storage') return 'Disk storage';
  if (name.startsWith('EFS-elastic')) return 'Disk reads and writes';
  if (name === 'VPC-nat-gateway') return 'NAT gateway';
  if (name.startsWith('EC2-load-balancer-lcu')) return 'Load balancer capacity';
  if (name.startsWith('EC2-load-balancer')) return 'Load balancer';
  if (name.startsWith('DynamoDB')) return name.replace(/^DynamoDB-/, 'Table ').replaceAll('-', ' ');
  return name.replaceAll('-', ' ');
};

/**
 * Each line with a key for a list: its product name, numbered when a resource lists one product twice (a read
 * replica's storage beside the primary's).
 */
export const keyedLines = (lines: readonly CostLine[]): Array<{ line: CostLine; key: string }> => {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const count = seen.get(line.name) ?? 0;
    seen.set(line.name, count + 1);
    return { line, key: count === 0 ? line.name : `${line.name}#${count}` };
  });
};

/** A resource's lines, the fixed ones first, largest first, then what is billed by use. */
export const costLinesOf = (price: Price | undefined, resourceName: string): CostLine[] =>
  [...(price?.lines?.[resourceName] ?? [])].toSorted((a, b) => {
    if ((a.monthly !== undefined) !== (b.monthly !== undefined)) return a.monthly === undefined ? 1 : -1;
    return (b.monthly ?? 0) - (a.monthly ?? 0);
  });

/** Whether any part of the resource is billed by use (requests, storage that grows). */
export const billedByUse = (price: Price | undefined, resourceName: string): boolean =>
  (price?.lines?.[resourceName] ?? []).some((line) => line.priceModel === 'pay-per-use');

export type CostShare = { name: string; amount: number | undefined; share: number; usage: boolean };

/**
 * Each resource's part of the fixed monthly estimate, largest first, with its share of the total (0–1) for the bar. A
 * resource with no fixed amount is listed after them with its usage noted, so nothing on the bill is left out.
 */
export const costShares = (price: Price | undefined, names: readonly string[]): CostShare[] => {
  const amounts: CostShare[] = names.map((name) => ({
    name,
    amount: price?.resourceFlat?.[name],
    share: 0,
    usage: billedByUse(price, name)
  }));
  const total = amounts.reduce((sum, entry) => sum + (entry.amount ?? 0), 0);
  for (const entry of amounts) entry.share = total > 0 && entry.amount !== undefined ? entry.amount / total : 0;
  return amounts.toSorted((a, b) => (b.amount ?? -1) - (a.amount ?? -1));
};

/** What an option of a priced setting costs, as the setting shows it beside the option. */
export type OptionPrice =
  /** A size list shows each size's own monthly amount. */
  | { kind: 'amount'; text: string; amount: number }
  /** Any other choice shows what it changes the stack's total by. */
  | { kind: 'delta'; text: string };

export const optionPrice = (
  price: Price | undefined,
  resourceName: string,
  setting: Pick<ResourceSetting, 'id' | 'control' | 'value'>,
  value: SettingValue
): OptionPrice | undefined => {
  const prices = price?.settings?.[resourceName]?.[setting.id];
  const option = prices?.[String(value)];
  if (option === undefined) return undefined;
  if (setting.control === 'size') {
    return option.resource === undefined
      ? undefined
      : { kind: 'amount', amount: option.resource, text: `${money(option.resource)}/mo` };
  }
  if (value === setting.value) return undefined;
  const current = prices?.[String(setting.value)]?.total ?? price?.flatMonthly;
  if (option.total === undefined || current === undefined) return undefined;
  const text = monthlyDelta(option.total - current);
  return text === undefined ? undefined : { kind: 'delta', text };
};

/**
 * What a million requests to a function-backed resource cost at a given memory, at 100 ms each: the compute rate
 * scaled by memory plus the request rate. Undefined without the two rates.
 */
export const perMillionRequests = (lines: readonly CostLine[], memoryMb: number): number | undefined => {
  const compute = lines.find((line) => line.name.endsWith('execution-time'))?.rate;
  const requests = lines.find((line) => line.name.endsWith('price-per-request'));
  if (compute === undefined || requests?.rate === undefined) return undefined;
  const requestRate = /^1M/i.test(requests.unit ?? '') ? requests.rate : requests.rate * 1_000_000;
  return 1_000_000 * 0.1 * (memoryMb / 1024) * compute + requestRate;
};

/**
 * What the stack would cost a month at a few traffic levels: the fixed amount plus what that many requests are billed
 * at, for every resource priced per request (a function's compute and requests at 100 ms each, a CDN's requests, an
 * API's requests). Undefined when nothing is billed per request. Data transfer is left out, and the page says so.
 */
export const trafficExamples = (
  price: Price | undefined,
  resources: ReadonlyArray<{ name: string; memoryMb?: number }>,
  levels: readonly number[] = [100_000, 1_000_000, 10_000_000]
): Array<{ requests: number; total: number }> | undefined => {
  if (price?.flatMonthly === undefined) return undefined;
  let perMillion = 0;
  for (const { name, memoryMb } of resources) {
    const lines = price.lines?.[name] ?? [];
    const lambda = perMillionRequests(lines, memoryMb ?? 1024);
    if (lambda !== undefined) perMillion += lambda;
    for (const line of lines) {
      if (line.rate === undefined) continue;
      const unit = (line.unit ?? '').toLowerCase();
      if (/^cloudfront/i.test(line.name))
        perMillion += unit.startsWith('10k') ? line.rate * 100 : line.rate * 1_000_000;
      if (line.name === 'ApiGateway-http-api-requests')
        perMillion += unit.startsWith('1m') ? line.rate : line.rate * 1_000_000;
    }
  }
  if (perMillion === 0) return undefined;
  return levels.map((requests) => ({ requests, total: price.flatMonthly! + (perMillion * requests) / 1_000_000 }));
};

/** "100K", "1M", "10M". */
export const requestCount = (requests: number): string =>
  requests >= 1_000_000 ? `${requests / 1_000_000}M` : `${requests / 1000}K`;
