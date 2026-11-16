import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { ALARM_DELIVERY_MARKER_PREFIX } from 'src/config/constants';

/**
 * How long a claim protects a send in progress. A claim older than this belongs to an invocation that stopped before it
 * recorded the outcome, so a retry may send again. Every provider call is bounded well below this (under a minute with
 * its retries), and Lambda retries a failed event about one and three minutes after the first attempt.
 */
const CLAIM_LEASE_MS = 2 * 60 * 1000;

// Extra attempts: a marker that cannot be written after a send leaves the notification to be sent again.
const s3Client = new S3Client({ maxAttempts: 6 });

const getBucketName = () => {
  const hash = process.env.GLOBALLY_UNIQUE_STACK_HASH;
  if (!hash) throw new Error('Alarm notification delivery is missing the GLOBALLY_UNIQUE_STACK_HASH environment.');
  return awsResourceNames.deploymentBucket(hash);
};

type Marker = { status: 'sending' | 'sent' | 'failed'; at: number };

const errorName = (error: unknown) => (error as { name?: string })?.name;
const isConditionFailure = (error: unknown) =>
  ['PreconditionFailed', 'ConditionalRequestConflict'].includes(errorName(error) ?? '');

/**
 * Writes a marker only if the key is absent (`ifAbsent`) or still holds the version this invocation read or wrote
 * (`ifMatch`), so two invocations can never both take the same notification. Returns the new version's ETag.
 */
const putMarker = async (key: string, marker: Marker, condition: { ifAbsent: true } | { ifMatch: string }) => {
  const response = await s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: JSON.stringify(marker),
      ContentType: 'application/json',
      ...('ifAbsent' in condition ? { IfNoneMatch: '*' } : { IfMatch: condition.ifMatch })
    })
  );
  return response.ETag!;
};

const readMarker = async (key: string): Promise<{ marker: Marker; etag: string } | null> => {
  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
    return { marker: JSON.parse(await response.Body!.transformToString()) as Marker, etag: response.ETag! };
  } catch (error) {
    // Without s3:ListBucket a missing key reads as AccessDenied.
    if (['NoSuchKey', 'AccessDenied', 'NotFound'].includes(errorName(error) ?? '')) return null;
    throw error;
  }
};

const inProgress = () => {
  const error = new Error('Another invocation is delivering this notification; retrying later.');
  error.name = 'NotificationDeliveryInProgress';
  return error;
};

/** Takes the send of one notification. Returns the claim's ETag, or null when the notification was already sent. */
const claim = async (key: string): Promise<string | null> => {
  try {
    return await putMarker(key, { status: 'sending', at: Date.now() }, { ifAbsent: true });
  } catch (error) {
    if (!isConditionFailure(error)) throw error;
  }
  const current = await readMarker(key);
  if (!current) throw inProgress();
  if (current.marker.status === 'sent') return null;
  const abandoned = current.marker.status === 'failed' || Date.now() - current.marker.at > CLAIM_LEASE_MS;
  // Another invocation of the same event is sending it now. Failing makes Lambda retry this one later, when the
  // marker says whether that send went through.
  if (!abandoned) throw inProgress();
  try {
    return await putMarker(key, { status: 'sending', at: Date.now() }, { ifMatch: current.etag });
  } catch (error) {
    // Another invocation took over the same abandoned claim first.
    if (isConditionFailure(error)) throw inProgress();
    throw error;
  }
};

/**
 * Sends one notification of one alarm event once, across EventBridge and Lambda retries and concurrent duplicate
 * invocations. A failed send gives its claim up, so a retry sends it again. Delivery is at least once: when a provider
 * accepted a notification but the `sent` marker could not be written even after retries, a later retry sends it again.
 */
export const deliverOnce = async ({ key, send }: { key: string; send: () => Promise<unknown> }) => {
  const markerKey = `${ALARM_DELIVERY_MARKER_PREFIX}${key}`;
  const claimed = await claim(markerKey);
  if (!claimed) return 'already-sent' as const;
  try {
    await send();
  } catch (error) {
    await putMarker(markerKey, { status: 'failed', at: Date.now() }, { ifMatch: claimed }).catch(() => {});
    throw error;
  }
  await putMarker(markerKey, { status: 'sent', at: Date.now() }, { ifMatch: claimed });
  return 'sent' as const;
};
