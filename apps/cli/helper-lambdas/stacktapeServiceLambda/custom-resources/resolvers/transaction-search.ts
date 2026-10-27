import type {
  ServiceLambdaResolver,
  StpServiceCustomResourceProperties
} from '@helper-lambdas/stacktapeServiceLambda/custom-resource-types';
import { CloudWatchLogs } from '@aws-sdk/client-cloudwatch-logs';
import { XRay } from '@aws-sdk/client-xray';

const xrayApi = new XRay({});
const logsApi = new CloudWatchLogs({});

const RESOURCE_POLICY_NAME = 'StacktapeTransactionSearchXRayAccess';
const SPANS_LOG_GROUP = 'aws/spans';
/**
 * X-Ray creates `aws/spans` with this retention, and Stacktape keeps it: span storage is billed for every workload in
 * the account, not only Stacktape's. The same value is set only when the group has no retention (CloudWatch's default
 * keeps logs forever), and only when Stacktape itself enables Transaction Search; an external setup is never touched.
 */
const SPANS_RETENTION_DAYS = 30;
/** X-Ray creates `aws/spans` within seconds of the switch, long before activation finishes. */
const LOG_GROUP_WAIT_MS = 2 * 60_000;
const LOG_GROUP_POLL_INTERVAL_MS = 5_000;

const getPartition = (region: string | undefined) =>
  region?.startsWith('cn-') ? 'aws-cn' : region?.startsWith('us-gov-') ? 'aws-us-gov' : 'aws';

/**
 * The `aws/` log-group prefix is reserved — only X-Ray itself can create `aws/spans`, which it does
 * as part of enabling the destination. Retention is therefore applied after the fact, and only when
 * the group has no retention yet, so X-Ray's or an externally chosen retention is never overwritten.
 */
const applyRetentionIfUnset = async (): Promise<boolean> => {
  const { logGroups } = await logsApi.describeLogGroups({ logGroupNamePrefix: SPANS_LOG_GROUP, limit: 5 });
  const spansGroup = (logGroups || []).find(({ logGroupName }) => logGroupName === SPANS_LOG_GROUP);
  if (!spansGroup) {
    return false;
  }
  if (spansGroup.retentionInDays === undefined) {
    await logsApi.putRetentionPolicy({ logGroupName: SPANS_LOG_GROUP, retentionInDays: SPANS_RETENTION_DAYS });
    console.info(`Capped ${SPANS_LOG_GROUP} retention at ${SPANS_RETENTION_DAYS} days.`);
  }
  return true;
};

const boundRetentionOnceGroupExists = async () => {
  const deadline = Date.now() + LOG_GROUP_WAIT_MS;
  while (Date.now() < deadline) {
    if (await applyRetentionIfUnset().catch(() => false)) return;
    await new Promise((resolve) => setTimeout(resolve, LOG_GROUP_POLL_INTERVAL_MS));
  }
  console.info(
    `The ${SPANS_LOG_GROUP} log group does not exist yet; its retention stays unmanaged until set manually.`
  );
};

/**
 * Enables X-Ray Transaction Search for the account+region so OTel spans land in the `aws/spans`
 * log group. This is an account-level setting with three states:
 *
 * - already sending spans to CloudWatch Logs (enabled by us earlier, or externally, possibly still
 *   activating): nothing to do — an external enablement is adopted as-is and never reconfigured
 *   (including its retention);
 * - classic segment mode: grant X-Ray the log-group write policy and switch the destination; X-Ray
 *   then creates `aws/spans` itself with a 30-day retention; a group without retention (CloudWatch's
 *   default is keep-forever) gets the same 30 days;
 * - Delete: deliberately a no-op. Other stacks (or non-Stacktape workloads) may rely on it, and
 *   disabling would silently change how the whole account's X-Ray traffic is stored.
 */
export const transactionSearch: ServiceLambdaResolver<StpServiceCustomResourceProperties['transactionSearch']> = async (
  _currentProps,
  _previousProps,
  operation,
  _physicalResourceId,
  lambdaContext
) => {
  if (operation === 'Delete') {
    return { data: {} };
  }
  const accountId = lambdaContext?.invokedFunctionArn?.split(':')[4] || process.env.AWS_ACCOUNT_ID;
  const region = process.env.AWS_REGION;
  const partition = getPartition(region);

  const destination = await xrayApi.getTraceSegmentDestination({});
  if (destination.Destination === 'CloudWatchLogs') {
    console.info(`Transaction Search already enabled (status: ${destination.Status}); leaving it untouched.`);
    return { data: {} };
  }

  console.info('Enabling X-Ray Transaction Search (span destination: CloudWatch Logs)...');
  await logsApi.putResourcePolicy({
    policyName: RESOURCE_POLICY_NAME,
    policyDocument: JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'TransactionSearchXRayAccess',
          Effect: 'Allow',
          Principal: { Service: 'xray.amazonaws.com' },
          Action: 'logs:PutLogEvents',
          Resource: [
            `arn:${partition}:logs:${region}:${accountId}:log-group:${SPANS_LOG_GROUP}:*`,
            `arn:${partition}:logs:${region}:${accountId}:log-group:/aws/application-signals/data:*`
          ],
          Condition: {
            ArnLike: { 'aws:SourceArn': `arn:${partition}:xray:${region}:${accountId}:*` },
            StringEquals: { 'aws:SourceAccount': accountId }
          }
        }
      ]
    })
  });
  await xrayApi.updateTraceSegmentDestination({ Destination: 'CloudWatchLogs' });
  // X-Ray creates `aws/spans` itself (the aws/ prefix is reserved); its retention is bounded once the
  // group appears, and only when no retention was chosen before.
  await boundRetentionOnceGroupExists();
  // Activation then takes several more minutes (AWS documents up to ~10). Nothing waits for it: spans exported
  // meanwhile are lost, which costs less than holding the first traced deploy of the account and region.
  console.info('Enabling X-Ray Transaction Search - SUCCESS (activation continues in the background)');
  return { data: {} };
};
