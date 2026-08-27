import type { StpSyntheticTest } from '@domain-services/config-manager/resolved-types/synthetic-tests';
import { configErrors } from '../errors';

/**
 * CloudWatch Synthetics limits (see the AWS::Synthetics::Canary reference): schedules between
 * rate(1 minute) and rate(1 hour) or cron; explicit run timeout 3–840s and never above the
 * interval; memory 960–3008 MB in multiples of 64; artifact retention 1–455 days.
 */
const RATE_EXPRESSION = /^rate\((\d+) (minute|minutes|hour)\)$/;
/** AWS cron expressions have six space-separated fields. */
const CRON_EXPRESSION = /^cron\(\S+ \S+ \S+ \S+ \S+ \S+\)$/;

/** Seconds between runs, when the schedule is a rate; cron schedules return undefined. */
export const getScheduleIntervalSeconds = (scheduleRate: string): number | undefined => {
  const match = scheduleRate.match(RATE_EXPRESSION);
  if (!match) return undefined;
  const amount = Number(match[1]);
  return match[2] === 'hour' ? amount * 3600 : amount * 60;
};

export const validateSyntheticTest = ({ test }: { test: StpSyntheticTest }) => {
  const rateMatch = test.scheduleRate.match(RATE_EXPRESSION);
  if (!rateMatch && !CRON_EXPRESSION.test(test.scheduleRate)) {
    throw configErrors.syntheticTestScheduleInvalid({
      testName: test.name,
      scheduleRate: test.scheduleRate,
      reason: 'expected `rate(1 minute)`, `rate(n minutes)`, `rate(1 hour)` or a six-field `cron(...)` expression'
    });
  }
  if (rateMatch) {
    const amount = Number(rateMatch[1]);
    const unit = rateMatch[2];
    // AWS grammar: singular unit with 1, plural above; frequencies between 1 minute and 1 hour.
    const validRate =
      (unit === 'minute' && amount === 1) ||
      (unit === 'minutes' && amount >= 2 && amount <= 59) ||
      (unit === 'hour' && amount === 1);
    if (!validRate) {
      throw configErrors.syntheticTestScheduleInvalid({
        testName: test.name,
        scheduleRate: test.scheduleRate,
        reason:
          'the rate must be between rate(1 minute) and rate(1 hour), with the unit matching the amount (`rate(1 minute)`, `rate(10 minutes)`, `rate(1 hour)`)'
      });
    }
  }
  const intervalSeconds = getScheduleIntervalSeconds(test.scheduleRate);
  if (!Number.isInteger(test.timeoutSeconds) || test.timeoutSeconds < 3 || test.timeoutSeconds > 840) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'timeoutSeconds',
      reason: `must be an integer between 3 and 840 (got ${test.timeoutSeconds})`
    });
  }
  if (intervalSeconds !== undefined && test.timeoutSeconds > intervalSeconds) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'timeoutSeconds',
      reason: `must not exceed the schedule interval (${intervalSeconds}s for \`${test.scheduleRate}\`)`
    });
  }
  if (!Number.isInteger(test.memory) || test.memory < 960 || test.memory > 3008 || test.memory % 64 !== 0) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'memory',
      reason: `must be a multiple of 64 between 960 and 3008 (got ${test.memory})`
    });
  }
  if (!Number.isInteger(test.retentionDays) || test.retentionDays < 1 || test.retentionDays > 455) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'retentionDays',
      reason: `must be an integer between 1 and 455 (got ${test.retentionDays})`
    });
  }
  // The canary's physical name is `<stackName>-<testName>` lowercased; canary names allow only
  // [0-9a-z_-]. Stack names already conform, so only the test name can smuggle in bad characters.
  if (!/^[0-9a-zA-Z_-]+$/.test(test.name)) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'name',
      reason: 'synthetic test names may contain only letters, digits, `_` and `-`'
    });
  }
  // Canary environment variables become Lambda environment variables, and AWS rejects the whole
  // canary at deploy time for names Lambda reserves or a total size above 4 KB — catch it here.
  const environment = test.environment || [];
  for (const { name } of environment) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(name)) {
      throw configErrors.syntheticTestPropertyInvalid({
        testName: test.name,
        property: 'environment',
        reason: `variable name \`${name}\` is invalid: names must start with a letter and contain only letters, digits and \`_\``
      });
    }
    if (name.startsWith('AWS_') || RESERVED_CANARY_ENVIRONMENT_NAMES.has(name)) {
      throw configErrors.syntheticTestPropertyInvalid({
        testName: test.name,
        property: 'environment',
        reason: `variable name \`${name}\` is reserved by the AWS Lambda runtime the canary runs on`
      });
    }
  }
  const environmentBytes = environment.reduce(
    (total, { name, value }) => total + Buffer.byteLength(`${name}=${String(value)}`, 'utf8'),
    0
  );
  if (environmentBytes > MAX_CANARY_ENVIRONMENT_BYTES) {
    throw configErrors.syntheticTestPropertyInvalid({
      testName: test.name,
      property: 'environment',
      reason: `environment variables total ${environmentBytes} bytes; AWS caps a canary's environment at ${MAX_CANARY_ENVIRONMENT_BYTES} bytes`
    });
  }
};

/** Lambda-reserved names without the `AWS_` prefix (that whole prefix is rejected separately). */
const RESERVED_CANARY_ENVIRONMENT_NAMES = new Set([
  '_HANDLER',
  '_X_AMZN_TRACE_ID',
  'LAMBDA_TASK_ROOT',
  'LAMBDA_RUNTIME_DIR'
]);
const MAX_CANARY_ENVIRONMENT_BYTES = 4 * 1024;

/** Modules the Synthetics runtime provides; the user script imports them without bundling them. */
export const SYNTHETIC_RUNTIME_EXTERNAL_MODULES = [
  '@aws/synthetics-playwright',
  '@aws/synthetics-puppeteer',
  '@aws/synthetics-logger',
  '@aws/synthetics-core',
  '@playwright/test',
  'playwright',
  'playwright-core',
  'puppeteer-core',
  'Synthetics',
  'SyntheticsLogger'
];

/**
 * Runtime versions the two test types run on. AWS deprecates Synthetics runtimes when their
 * components go end-of-life (canaries on deprecated runtimes keep running but cannot be created),
 * so revisit these at release time together with the OTel layer catalogue.
 */
export const SYNTHETIC_RUNTIME_VERSIONS = {
  browser: 'syn-nodejs-playwright-8.0',
  api: 'syn-nodejs-puppeteer-17.0'
} as const;

/**
 * Inline canary scripts live inside the CloudFormation template, and the whole template is capped
 * at 1 MB — so the practical limit is far below the canary Code.Script maximum of 5 MB. 250 KB
 * leaves ample room for the rest of the stack while fitting any sane test script.
 */
export const MAX_SYNTHETIC_SCRIPT_BYTES = 250 * 1024;

/**
 * All scripts of a stack land in that same 1 MB template, so their sum is capped too — 600 KB
 * leaves the rest of the template a comfortable share.
 */
export const MAX_SYNTHETIC_TOTAL_SCRIPT_BYTES = 600 * 1024;
