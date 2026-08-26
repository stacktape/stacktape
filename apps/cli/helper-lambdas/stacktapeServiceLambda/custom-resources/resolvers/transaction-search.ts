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

const waitUntilActive = async () => {
  const deadline = Date.now() + ACTIVATION_WAIT_MS;
  while (Date.now() < deadline) {
    const { Status } = await xrayApi.getTraceSegmentDestination({});
    if (Status === 'ACTIVE') {
      console.info('Transaction Search is ACTIVE.');
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
 * - classic segment mode: grant X-Ray the log-group write policy, pre-create `aws/spans` with a
 *   bounded retention (CloudWatch's default is keep-forever), and switch the destination;
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
      await waitUntilActive();
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
  // Pre-create the span log group so its retention is bounded from the first span. Without this,
  // X-Ray creates it with CloudWatch's keep-forever default and span storage grows unbounded. A
  // pre-existing log group keeps whatever retention its owner chose.
  const logGroupCreated = await logsApi
    .createLogGroup({ logGroupName: SPANS_LOG_GROUP })
    .then(() => true)
    .catch((err: { name?: string }) => {
      if (err?.name !== 'ResourceAlreadyExistsException') {
        throw err;
      }
      return false;
    });
  if (logGroupCreated) {
    await logsApi.putRetentionPolicy({ logGroupName: SPANS_LOG_GROUP, retentionInDays: SPANS_RETENTION_DAYS });
  }
  await xrayApi.updateTraceSegmentDestination({ Destination: 'CloudWatchLogs' });
  await waitUntilActive();
  console.info('Enabling X-Ray Transaction Search - SUCCESS');
  return { data: {} };
};
