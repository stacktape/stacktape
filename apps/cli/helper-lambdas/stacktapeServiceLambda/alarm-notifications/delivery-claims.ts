import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { ALARM_DELIVERY_MARKER_PREFIX } from 'src/config/constants';

/**
 * How long a claim protects a send in progress. A claim older than this belongs to an invocation that stopped before it
 * recorded the outcome, so a retry may send again. Every provider request times out well before this.
 */
const CLAIM_LEASE_MS = 2 * 60 * 1000;

const s3Client = new S3Client({});

const getBucketName = () => {
  const hash = process.env.GLOBALLY_UNIQUE_STACK_HASH;
  if (!hash) throw new Error('Alarm notification delivery is missing the GLOBALLY_UNIQUE_STACK_HASH environment.');
  return awsResourceNames.deploymentBucket(hash);
};

type Marker = { status: 'sending' | 'sent'; at: number };

const errorName = (error: unknown) =>
  (error as { name?: string; Code?: string })?.name || (error as { Code?: string })?.Code;

const putMarker = (key: string, marker: Marker, onlyIfAbsent: boolean) =>
  s3Client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: JSON.stringify(marker),
      ContentType: 'application/json',
      ...(onlyIfAbsent ? { IfNoneMatch: '*' } : {})
    })
  );

const readMarker = async (key: string): Promise<Marker | null> => {
  try {
    const response = await s3Client.send(new GetObjectCommand({ Bucket: getBucketName(), Key: key }));
    return JSON.parse(await response.Body!.transformToString()) as Marker;
  } catch (error) {
    // Without s3:ListBucket a missing key reads as AccessDenied: the claim was released in between.
    if (['NoSuchKey', 'AccessDenied', 'NotFound'].includes(errorName(error))) return null;
    throw error;
  }
};

const deleteMarker = (key: string) => s3Client.send(new DeleteObjectCommand({ Bucket: getBucketName(), Key: key }));

/** Takes the send of one notification. Returns false when it was already sent. */
const claim = async (key: string, attempt = 0): Promise<boolean> => {
  try {
    await putMarker(key, { status: 'sending', at: Date.now() }, true);
    return true;
  } catch (error) {
    if (errorName(error) !== 'PreconditionFailed' && errorName(error) !== 'ConditionalRequestConflict') throw error;
  }
  const marker = await readMarker(key);
  if (marker?.status === 'sent') return false;
  const stale = !marker || Date.now() - marker.at > CLAIM_LEASE_MS;
  if (stale && attempt === 0) {
    if (marker) await deleteMarker(key);
    return claim(key, attempt + 1);
  }
  // Another invocation of the same event is sending it now. Failing makes Lambda retry this one later, when the
  // marker says whether that send went through.
  const inProgress = new Error('Another invocation is delivering this notification; retrying later.');
  inProgress.name = 'NotificationDeliveryInProgress';
  throw inProgress;
};

/**
 * Sends one notification of one alarm event at most once per successful send, across EventBridge and Lambda retries
 * and concurrent duplicate invocations. A failed send releases its claim, so the retry sends it again.
 */
export const deliverOnce = async ({ key, send }: { key: string; send: () => Promise<unknown> }) => {
  const markerKey = `${ALARM_DELIVERY_MARKER_PREFIX}${key}`;
  if (!(await claim(markerKey))) return 'already-sent' as const;
  try {
    await send();
  } catch (error) {
    await deleteMarker(markerKey).catch(() => {});
    throw error;
  }
  await putMarker(markerKey, { status: 'sent', at: Date.now() }, false);
  return 'sent' as const;
};
