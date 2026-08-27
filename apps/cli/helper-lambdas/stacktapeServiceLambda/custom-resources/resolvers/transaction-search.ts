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
/** Applied only when Stacktape itself enables Transaction Search; an external setup is never touched. */
const SPANS_RETENTION_DAYS = 90;
/** AWS documents activation taking up to ~10 minutes; functions deploy after this resource completes. */
const ACTIVATION_WAIT_MS = 8 * 60_000;
const ACTIVATION_POLL_INTERVAL_MS = 15_000;

const getPartition = (region: string | undefined) =>
  region?.startsWith('cn-') ? 'aws-cn' : region?.startsWith('us-gov-') ? 'aws-us-gov' : 'aws';

/**
 * The `aws/` log-group prefix is reserved — only X-Ray itself can create `aws/spans`, which it does
 * as part of enabling the destination. Retention is therefore applied after the fact, and only when
 * the group has no retention yet, so an externally chosen retention is never overwritten.
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

const waitUntilActive = async ({ boundRetention }: { boundRetention: boolean }) => {
  const deadline = Date.now() + ACTIVATION_WAIT_MS;
  let retentionHandled = !boundRetention;
  while (Date.now() < deadline) {
    if (!retentionHandled) {
      retentionHandled = await applyRetentionIfUnset().catch(() => false);
    }
    const { Status } = await xrayApi.getTraceSegmentDestination({});
    if (Status === 'ACTIVE') {
      console.info('Transaction Search is ACTIVE.');
      if (!retentionHandled) {
        retentionHandled = await applyRetentionIfUnset().catch(() => false);
        if (!retentionHandled) {
          console.info(
            `The ${SPANS_LOG_GROUP} log group does not exist yet; its retention stays unmanaged until set manually.`
          );
        }
      }
      return;
    }
    console.info(`Transaction Search status: ${Status}; waiting...`);
    await new Promise((resolve) => setTimeout(resolve, ACTIVATION_POLL_INTERVAL_MS));
  }
  // The destination is set and will finish activating on its own; failing the whole deployment
  // over the tail of the activation window would hurt more than a few early untraced invocations.
  console.info('Transaction Search did not reach ACTIVE within the wait window; continuing.');
};

/**
 * Enables X-Ray Transaction Search for the account+region so OTel spans land in the `aws/spans`
 * log group. This is an account-level setting with three states:
 *
 * - already sending spans to CloudWatch Logs (enabled by us earlier, or externally): nothing to do —
 *   an external enablement is adopted as-is and never reconfigured (including its retention);
 * - classic segment mode: grant X-Ray the log-group write policy and switch the destination; X-Ray
 *   then creates `aws/spans` itself, and its retention is bounded afterwards (CloudWatch's default
 *   is keep-forever) unless one was already chosen;
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
    console.info(`Transaction Search already active (status: ${destination.Status}); leaving it untouched.`);
    if (destination.Status !== 'ACTIVE') {
      await waitUntilActive({ boundRetention: false });
    }
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
  // X-Ray creates `aws/spans` itself (the aws/ prefix is reserved); the activation wait bounds its
  // retention once the group appears, and only when no retention was chosen before.
  await waitUntilActive({ boundRetention: true });
  console.info('Enabling X-Ray Transaction Search - SUCCESS');
  return { data: {} };
};
