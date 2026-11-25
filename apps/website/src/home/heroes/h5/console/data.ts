/**
 * One example app, `acme-shop`, as the Console shows it on 25 Nov 2026 around 13:00. The six screens tell one
 * consistent story: a deploy at 10:12 broke order totals, the API error rate went above 5 %, uptime caught a
 * five-minute outage, and the fix was deployed at 11:04. Every figure below agrees with the others.
 */

export const ORG = 'Acme';
export const USER = 'MC';
export const PROJECT = 'acme-shop';
export const REPO = 'acme/acme-shop';
export const ACCOUNT = 'acme-production · us-east-1';
export const STAGES = ['production', 'staging', 'pr-218', 'dev-maya'];

/**
 * The resources, labelled as `@stacktape/config` labels their types (hosting-bucket, web-service, worker-service,
 * sqs-queue, relational-database, redis), with the icon `@stacktape/ui-react` gives each type.
 */
export const RESOURCES = {
  web: { icon: 'cloudfront', label: 'Website' },
  api: { icon: 'fargate', label: 'Web service' },
  worker: { icon: 'fargate', label: 'Worker service' },
  jobQueue: { icon: 'sqs', label: 'SQS queue' },
  database: { icon: 'rds', label: 'SQL database' },
  cache: { icon: 'elasticache', label: 'Redis' }
} as const;

export type ResourceName = keyof typeof RESOURCES;

/** Stage overview: traffic from the last 24 hours and cost this month. Failed: 56 of 186K API requests. */
export const OVERVIEW = [
  { name: 'web', target: 'acme-shop.com', requests: '412K', failed: '0', latency: '18 ms', cost: '$11.30' },
  { name: 'api', target: 'api.acme-shop.com', requests: '186K', failed: '56', latency: '92 ms', cost: '$92.10' },
  { name: 'worker', target: '2 of 2 running', requests: '—', failed: '—', latency: '—', cost: '$38.60' },
  { name: 'jobQueue', target: '14 messages waiting', requests: '—', failed: '—', latency: '—', cost: '$0.90' },
  { name: 'database', target: 'Postgres 16 · available', requests: '—', failed: '—', latency: '—', cost: '$71.40' },
  { name: 'cache', target: 'Available', requests: '—', failed: '—', latency: '—', cost: '$24.80' }
] as const;

/** November so far: $286.40 in total, $47.30 of it not tied to one resource. */
export const COSTS = [
  { name: 'api', share: 32, october: '$108.40', november: '$92.10' },
  { name: 'database', share: 25, october: '$85.20', november: '$71.40' },
  { name: null, share: 17, october: '$50.55', november: '$47.30' },
  { name: 'worker', share: 13, october: '$44.10', november: '$38.60' },
  { name: 'cache', share: 9, october: '$29.75', november: '$24.80' },
  { name: 'web', share: 4, october: '$12.90', november: '$11.30' },
  { name: 'jobQueue', share: 0, october: '$1.05', november: '$0.90' }
] as const;

/** The 11:04 deploy, 158 seconds from start to finish. `from` and `to` are seconds into the deploy. */
export const DEPLOY_STEPS = [
  { name: 'Initialize', note: '', from: 0, to: 2, took: '2 s' },
  { name: 'Build & package', note: '', from: 2, to: 40, took: '38 s' },
  { name: 'Upload artifacts', note: '', from: 40, to: 46, took: '6 s' },
  { name: 'Deploy', note: '1 of 6 resources', from: 46, to: 155, took: '1 min 49 s' },
  { name: 'Finalize', note: '', from: 155, to: 158, took: '3 s' }
] as const;

export const DEPLOY_TOTAL = 158;

export const DEPLOY_FACTS = [
  { label: 'Commit', value: 'a41c9e2', code: true },
  { label: 'Started by', value: 'Push to main · Maya Chen' },
  { label: 'Started', value: 'Nov 25, 2026, 11:04' },
  { label: 'Took', value: '2 min 38 s' },
  { label: 'Configuration', value: 'No changes' },
  { label: 'Region', value: 'us-east-1' }
] as const;

/** Uptime: 24 hourly bars, oldest first. The API was down for five minutes three hours ago. */
export const CHECKS = [
  {
    name: 'api-health',
    stage: 'production',
    url: 'api.acme-shop.com/health',
    down: [20],
    availability: '99.65%',
    latency: '92 ms',
    every: 'every 1 min',
    warning: ''
  },
  {
    name: 'homepage',
    stage: 'production',
    url: 'acme-shop.com',
    down: [],
    availability: '100%',
    latency: '64 ms',
    every: 'every 1 min',
    warning: 'TLS certificate expires in 14d'
  },
  {
    name: 'checkout',
    stage: 'production',
    url: 'api.acme-shop.com/checkout/health',
    down: [],
    availability: '100%',
    latency: '118 ms',
    every: 'every 1 min',
    warning: ''
  },
  {
    name: 'api-health',
    stage: 'staging',
    url: 'api.staging.acme-shop.com/health',
    down: [],
    availability: '100%',
    latency: '88 ms',
    every: 'every 5 min',
    warning: ''
  }
] as const;

export const INCIDENTS = [
  {
    severity: 'Warning',
    title: 'TLS certificate for "homepage" expires 2026-12-09',
    where: 'production',
    detail: 'Certificate',
    status: 'Open',
    by: '',
    opened: '6h ago'
  },
  {
    severity: 'Critical',
    title: 'API error rate above 5%',
    where: 'production',
    detail: "3 failing signals · TypeError: Cannot read properties of undefined (reading 'total')",
    status: 'Resolved',
    by: 'by the 11:04 deploy',
    opened: '3h ago'
  },
  {
    severity: 'Error',
    title: 'Worker restarted 4 times in 10 min',
    where: 'staging',
    detail: '1 failing signal · Error: connect ECONNREFUSED',
    status: 'Resolved',
    by: 'by Maya Chen',
    opened: '1d ago'
  },
  {
    severity: 'Warning',
    title: 'Database CPU above 80% for 15 min',
    where: 'production',
    detail: 'Alarm · database',
    status: 'Resolved',
    by: 'after 22 min',
    opened: '2d ago'
  }
] as const;

export const FINDINGS = [
  {
    severity: 'High',
    title: 'Possible SSRF and credential leakage via absolute URL',
    fix: 'Upgrade axios to 1.8.2',
    stage: 'production',
    where: 'axios · npm',
    seen: '2h ago'
  },
  {
    severity: 'High',
    title: 'Regular expression denial of service',
    fix: 'Upgrade cross-spawn to 7.0.5',
    stage: 'production',
    where: 'cross-spawn · npm',
    seen: '2h ago'
  },
  {
    severity: 'Medium',
    title: 'Secret stored as a plain environment variable',
    fix: 'Move it to a secret and replace the credential',
    stage: 'staging',
    where: 'worker · Worker service',
    seen: '1d ago'
  },
  {
    severity: 'Low',
    title: 'Deletion protection is off for the database',
    fix: 'Turn on deletion protection',
    stage: 'staging',
    where: 'database · SQL database',
    seen: '1d ago'
  }
] as const;
