/**
 * One example app, `acme-shop`, as the Console shows it on 25 Nov 2026 at 13:06 UTC. The screens, and the
 * structure B steps that reuse this data, tell one story: release "Show order totals in the cart" went out at 10:12,
 * order totals threw a TypeError for empty carts from 10:16, the API error-rate incident opened at 10:17, the
 * api-health check was down from 10:18 to 10:23, and the fix a41c9e2 deployed at 11:04. Now one incident is open: the
 * homepage's TLS certificate expires on 9 December. Every figure below agrees with the others. Relative times are
 * counted from 13:06 and rounded to the nearest unit, as the structure B steps count them: 10:17 is "3h ago".
 */

export const ORG = 'Acme';
export const USER = 'MC';
export const PROJECT = 'acme-shop';
export const REPO = 'acme/acme-shop';
export const ACCOUNT = 'acme-production · us-east-1';
/** Five stages: the four shown as tabs and one more. */
export const STAGES = ['production', 'staging', 'pr-218', 'dev-maya'];
export const MORE_STAGES = 1;

/** The resources: their Stacktape types, labelled as `@stacktape/config` labels them. */
export const RESOURCES = {
  web: { type: 'hosting-bucket', label: 'Website' },
  api: { type: 'web-service', label: 'Web service' },
  worker: { type: 'worker-service', label: 'Worker service' },
  jobQueue: { type: 'sqs-queue', label: 'SQS queue' },
  database: { type: 'relational-database', label: 'SQL database' },
  cache: { type: 'redis', label: 'Redis' }
} as const;

export type ResourceName = keyof typeof RESOURCES;

/**
 * Stage overview, last 24 hours. The two public entry points: the website (CloudFront reports requests only) and the
 * API, whose 56 failed requests of 186K are the 0.03 % failed. Resources that need attention come first, the rest by
 * name, as the Console sorts a short list.
 */
export const TRAFFIC = { requests: '598K', failed: '0.03%', latency: '92 ms' };
export const OVERVIEW = [
  {
    name: 'web',
    note: 'open incident',
    target: 'acme-shop.com',
    requests: '412K',
    failed: '—',
    latency: '—',
    cost: '$11.30'
  },
  {
    name: 'api',
    note: '',
    target: 'api.acme-shop.com',
    requests: '186K',
    failed: '56',
    latency: '92 ms',
    cost: '$92.10'
  },
  { name: 'cache', note: '', target: 'Available', requests: '—', failed: '—', latency: '—', cost: '$24.80' },
  { name: 'database', note: '', target: 'Available', requests: '—', failed: '—', latency: '—', cost: '$71.40' },
  {
    name: 'jobQueue',
    note: '',
    target: '14 messages waiting',
    requests: '—',
    failed: '—',
    latency: '—',
    cost: '$0.90'
  },
  { name: 'worker', note: '', target: '2 of 2 running', requests: '—', failed: '—', latency: '—', cost: '$38.60' }
] as const;

/**
 * November so far: $286.40 in total, $47.30 of it not tied to one resource. The report was refreshed at 12:00 UTC,
 * 24.5 days into the month, so the pace is $286.40 / 24.5 × 30 = $350.69, 6 % more than October's $331.95.
 */
export const MONTH = { total: '$286.40', pace: '$350.69', change: '6% more', october: '$331.95' };
export const COSTS = [
  { name: 'api', share: 32, october: '$108.40', november: '$92.10' },
  { name: 'database', share: 25, october: '$85.20', november: '$71.40' },
  { name: null, share: 17, october: '$50.55', november: '$47.30' },
  { name: 'worker', share: 13, october: '$44.10', november: '$38.60' },
  { name: 'cache', share: 9, october: '$29.75', november: '$24.80' },
  { name: 'web', share: 4, october: '$12.90', november: '$11.30' },
  { name: 'jobQueue', share: 0, october: '$1.05', november: '$0.90' }
] as const;

/**
 * The 11:04 deploy, 158 seconds from start to finish. `from` and `to` are seconds into the deploy. The new API image
 * updates two CloudFormation resources: the task definition and the service.
 */
export const DEPLOY_STEPS = [
  { name: 'Initialize', note: '', from: 0, to: 2, took: '2 s' },
  { name: 'Build & package', note: '', from: 2, to: 40, took: '38 s' },
  { name: 'Upload artifacts', note: '', from: 40, to: 46, took: '6 s' },
  { name: 'Deploy', note: '2 of 2 resources', from: 46, to: 155, took: '1 min 49 s' },
  { name: 'Finalize', note: '', from: 155, to: 158, took: '3 s' }
] as const;

export const DEPLOY_TOTAL = 158;

export const DEPLOY_FACTS = [
  { label: 'Commit', value: 'a41c9e2', kind: 'commit' },
  { label: 'Started by', value: 'Push to main · Maya Chen', kind: '' },
  { label: 'Started', value: 'Nov 25, 2026, 11:04', kind: '' },
  { label: 'Took', value: '2 min', kind: '' },
  { label: 'Configuration', value: 'api changed', kind: 'link' },
  { label: 'Region', value: 'us-east-1', kind: '' }
] as const;

/**
 * Uptime: 24 hourly bars, oldest first, one per clock hour; the last is the current hour, so 10:00 is bar 20. The config gives every stage api-health and homepage
 * checks (every 5 min outside production) and production a checkout-page check, all three every minute. api-health
 * on production was down from 10:18 to 10:23: 5 failed probes of 1,440. Three one-minute and eight five-minute checks
 * make 6,624 probes a day, so 5 failures leave 99.92 % available. The certificate expires on 9 December, 13 full days
 * from now. The list shows the first eight checks.
 */
export const UPTIME = { checks: 11, available: '99.92%' };
const check = (name: string, stage: string, url: string, latency: string, checked: string, every = 'every 5 min') => ({
  name,
  stage,
  url,
  down: [] as number[],
  availability: '100%',
  latency,
  checked,
  every,
  warning: ''
});
export const CHECKS = [
  {
    ...check('api-health', 'production', 'api.acme-shop.com/health', '92 ms', '41s ago', 'every 1 min'),
    down: [20],
    availability: '99.65%'
  },
  {
    ...check('homepage', 'production', 'acme-shop.com', '64 ms', '12s ago', 'every 1 min'),
    warning: 'TLS certificate expires in 13d'
  },
  check('checkout-page', 'production', 'acme-shop.com/checkout', '71 ms', '33s ago', 'every 1 min'),
  check('api-health', 'staging', 'api.staging.acme-shop.com/health', '88 ms', '2m ago'),
  check('homepage', 'staging', 'staging.acme-shop.com', '69 ms', '4m ago'),
  check('api-health', 'pr-218', 'api.pr-218.acme-shop.com/health', '95 ms', '1m ago'),
  check('homepage', 'pr-218', 'pr-218.acme-shop.com', '72 ms', '3m ago'),
  check('api-health', 'dev-maya', 'api.dev-maya.acme-shop.com/health', '90 ms', '2m ago')
];

/** Resolution reasons as the Console's list words them: recovered signals, or a person who resolved it. */
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
    by: 'recovered on its own',
    opened: '3h ago'
  },
  {
    severity: 'Error',
    title: 'Worker restarted 4 times in 10 min',
    where: 'staging',
    detail: '1 failing signal · Error: connect ECONNREFUSED',
    status: 'Resolved',
    by: 'manually by Maya Chen',
    opened: '1d ago'
  },
  {
    severity: 'Warning',
    title: 'Database CPU above 80% for 15 min',
    where: 'production',
    detail: 'Alarm · database',
    status: 'Resolved',
    by: 'recovered on its own',
    opened: '2d ago'
  },
  {
    severity: 'Warning',
    title: 'Messages waiting in jobQueue above 1,000',
    where: 'production',
    detail: 'Alarm · jobQueue',
    status: 'Resolved',
    by: 'recovered on its own',
    opened: '4d ago'
  },
  {
    severity: 'Error',
    title: 'API p95 latency above 1 s for 5 min',
    where: 'production',
    detail: 'Alarm · api',
    status: 'Resolved',
    by: 'recovered on its own',
    opened: '5d ago'
  },
  {
    severity: 'Warning',
    title: 'Redis memory above 80%',
    where: 'production',
    detail: 'Alarm · cache',
    status: 'Resolved',
    by: 'manually by Maya Chen',
    opened: '6d ago'
  },
  {
    severity: 'Error',
    title: 'Deploy of pr-218 left the worker unhealthy',
    where: 'pr-218',
    detail: '1 failing signal · Error: Cannot find module "./jobs/export"',
    status: 'Resolved',
    by: 'manually by Maya Chen',
    opened: '7d ago'
  }
] as const;

/** The list's tabs: open incidents, resolved ones, all. */
export const INCIDENT_TABS = { active: 1, resolved: 7, all: 8 };

/**
 * The findings of step 05 (structures/b/ui/Secures.astro), with the Console's rules (packages/console-api security.ts):
 * a plain secret is critical in every stage; deletion protection is checked in production only. Score: 100 − 25 per
 * critical, 10 per high, 3 per medium, 1 per low, averaged over scanned stacks: production 76, staging 74, so 75.
 */
export const FINDINGS = [
  {
    severity: 'Critical',
    title: 'Secret stored as a plain environment variable',
    fix: 'Move it to a secret and replace the credential',
    stage: 'staging',
    where: 'worker · Worker service',
    seen: '1d ago'
  },
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
    title: 'Production database without deletion protection',
    fix: 'Turn on deletion protection',
    stage: 'production',
    where: 'database · SQL database',
    seen: '2h ago'
  },
  {
    severity: 'Low',
    title: 'Database reachable from the internet',
    fix: 'Restrict database access to the services that need it',
    stage: 'staging',
    where: 'database · SQL database',
    seen: '1d ago'
  },
  {
    severity: 'Low',
    title: 'Queue without a dead-letter queue',
    fix: 'Add a dead-letter queue',
    stage: 'production',
    where: 'jobQueue · SQS queue',
    seen: '2h ago'
  }
] as const;

/** The navigation's counts: open incidents, open errors (step 04's five), security findings to fix now. */
export const COUNTS = { incidents: 1, errors: 5, security: 3 };
