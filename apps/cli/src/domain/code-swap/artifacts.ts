import { z } from 'zod';
import { GetObjectCommand, ListObjectsV2Command, DeleteObjectsCommand, type S3Client } from '@aws-sdk/client-s3';
import { DescribeServicesCommand, ListTasksCommand, DescribeTasksCommand, type ECSClient } from '@aws-sdk/client-ecs';
import { obsoleteCodeSwapKeys } from './release-record';

// Called only after successful release history finalization, under the operation lock.
export const pruneCodeSwapArtifacts = async ({
  s3,
  bucket,
  currentRevision,
  currentAttemptId,
  service = 'api',
  optOut = false,
  protectedRevisions = [],
  protectedBundleKeys = []
}: {
  s3: Pick<S3Client, 'send'>;
  bucket: string;
  currentRevision: string;
  currentAttemptId?: string;
  service?: string;
  optOut?: boolean;
  protectedRevisions?: string[];
  protectedBundleKeys?: string[];
}) => {
  const keys: string[] = [];
  let token: string | undefined;
  do {
    const page = await s3.send(new ListObjectsV2Command({ Bucket: bucket, ContinuationToken: token }));
    keys.push(...(page.Contents ?? []).flatMap((item) => (item.Key ? [item.Key] : [])));
    token = page.NextContinuationToken;
  } while (token);
  const swapKeys = keys.filter((key) => key.startsWith(`code-swap/${service}/`));
  let obsolete = swapKeys;
  if (!optOut) {
    const retained = new Set([
      ...protectedRevisions,
      ...keys.flatMap((key) => /^cf-template\/(v\d{6})\.yml$/.exec(key)?.[1] ?? [])
    ]);
    const bundles = [...protectedBundleKeys];
    // Rollback can copy an older bundle's identity into a newer release record.
    const records = swapKeys.filter(
      (key) =>
        key === `code-swap/${service}/head.json` ||
        (key.startsWith(`code-swap/${service}/releases/`) && retained.has(key.split('/').at(-1)!.slice(0, -5)))
    );
    for (const key of records) {
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const saved = z
        .object({ key: z.string(), revision: z.string() })
        .parse(JSON.parse(await response.Body!.transformToString()));
      bundles.push(saved.key);
      if (key === `code-swap/${service}/head.json`) retained.add(saved.revision);
    }
    obsolete = obsoleteCodeSwapKeys(swapKeys, [...retained], bundles, currentRevision, currentAttemptId, service);
  }
  for (let start = 0; start < obsolete.length; start += 1000) {
    const response = await s3.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: obsolete.slice(start, start + 1000).map((Key) => ({ Key })) }
      })
    );
    if (response.Errors?.length) throw new Error('Could not remove obsolete code-swap artifacts.');
  }
};

// CFN/ECS convergence may precede the last old task exiting. Its bootstrap artifacts must survive until then.
export const waitForRetiredCodeSwapTasks = async (ecs: Pick<ECSClient, 'send'>, service: string) => {
  const cluster = service.split('/')[1];
  const deadline = Date.now() + 180000;
  for (;;) {
    const state = await ecs.send(new DescribeServicesCommand({ cluster, services: [service] }));
    const currentDefinition = state.services?.[0]?.taskDefinition;
    let retired = false;
    for (const desiredStatus of ['RUNNING', 'STOPPED'] as const) {
      let nextToken: string | undefined;
      do {
        const page = await ecs.send(
          new ListTasksCommand({
            cluster,
            serviceName: service.split('/').at(-1),
            desiredStatus,
            nextToken
          })
        );
        for (let start = 0; start < (page.taskArns?.length ?? 0); start += 100) {
          const described = await ecs.send(
            new DescribeTasksCommand({
              cluster,
              tasks: page.taskArns!.slice(start, start + 100)
            })
          );
          if (described.failures?.length || described.tasks?.length !== page.taskArns!.slice(start, start + 100).length)
            throw new Error('Could not confirm old code-swap tasks have stopped.');
          retired ||= described.tasks.some(
            (task) => task.lastStatus !== 'STOPPED' && task.taskDefinitionArn !== currentDefinition
          );
        }
        nextToken = page.nextToken;
      } while (nextToken);
    }
    if (!retired) return;
    if (Date.now() >= deadline) throw new Error('Old code-swap tasks have not stopped; keeping their artifacts.');
    await Bun.sleep(1000);
  }
};
