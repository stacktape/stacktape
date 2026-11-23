# EFS file system

An EFS file system is shared, persistent file storage on Amazon Elastic File System. Containers and Lambda functions
mount it as a directory and read and write it with normal file calls, several at once. It grows and shrinks with the
data. Use it for apps that need a real directory: CMS uploads, model files shared between containers, state that must
survive container replacement.

In us-east-1, Standard storage costs $0.30 per GB-month, and in the default elastic throughput mode reads cost $0.03 and
writes $0.06 per GB transferred ([EFS pricing](https://aws.amazon.com/efs/pricing/)). Files your code uploads and
downloads through an API belong in an [S3 bucket](/resources/storage/s3-bucket), which stores a GB for about $0.023.

## Basic example

A file system needs no properties:


Example (TypeScript):

```typescript
import { defineConfig, EfsFilesystem } from 'stacktape';
export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({});

  return {
    resources: { sharedStorage }
  };
});
```


It uses elastic throughput. Mount it into a workload with `volumeMounts`:


Example (TypeScript):

```typescript
import {
  defineConfig,
  WorkerService,
  EfsFilesystem,
  JsBundleImagePackaging
} from 'stacktape';

export default defineConfig(() => {
  const sharedData = new EfsFilesystem({});

  const worker = new WorkerService({
    packaging: new JsBundleImagePackaging({ entryfilePath: './src/worker.ts' }),
    resources: { cpu: 0.5, memory: 1024 },
    connectTo: [sharedData],
    volumeMounts: [
      {
        type: 'efs',
        properties: {
          efsFilesystemName: 'sharedData',
          mountPath: '/mnt/shared',
          rootDirectory: '/workers'
        }
      }
    ]
  });

  return { resources: { sharedData, worker } };
});
```


The worker sees the file system at `/mnt/shared`, limited to its `/workers` directory. Every container that mounts it
sees the same files. Web services, private services, multi-container workloads and
[Lambda functions](/resources/compute/lambda-function#storage) (with `joinDefaultVpc: true`) mount it the same way.
`stacktape dev` doesn't mount EFS, so test file access on a deployed stage.

## Throughput modes

`throughputMode` decides how read and write speed scales and what you pay for it:

| Mode | Speed | You pay | Use it for |
|---|---|---|---|
| `elastic` (default) | Scales with demand | Per GB read and written | Most workloads, spiky access |
| `provisioned` | Fixed `provisionedThroughputInMibps` | Per MiB/s provisioned, used or not | Steady heavy throughput |
| `bursting` | 50 KiB/s per GiB stored, plus burst credits | Included in storage | Large file systems with light access |

### Elastic (default)

Throughput follows your workloads up and down, and you pay for the data they move. Keep it unless you measured a need
it can't meet.

### Provisioned

A fixed rate regardless of how much data is stored, for example `provisionedThroughputInMibps: 100` for 100 MiB/s. It
suits video pipelines or analytics that move a lot of data all the time. You pay for the provisioned rate even when
idle. You can change it any time.


Example (TypeScript):

```typescript
import { defineConfig, EfsFilesystem } from 'stacktape';

export default defineConfig(() => {
  const videoStorage = new EfsFilesystem({
    throughputMode: 'provisioned',
    provisionedThroughputInMibps: 100
  });

  return {
    resources: { videoStorage }
  };
});
```


### Bursting

Throughput is 50 KiB/s per GiB stored, with short bursts above that from credits. A small file system runs out of
credits quickly and slows down, so use it only for large file systems with light access.

## Backups

`backupEnabled: true` turns on daily AWS Backup backups kept for 35 days. They are incremental, so you pay for the
changed data. Turn it on for data you can't recreate, such as user uploads. The schedule and retention can't be
changed here.


Example (TypeScript):

```typescript
import { defineConfig, EfsFilesystem } from 'stacktape';

export default defineConfig(() => {
  const sharedStorage = new EfsFilesystem({
    backupEnabled: true
  });

  return {
    resources: { sharedStorage }
  };
});
```


## Configuration reference


### Definition: `EfsFilesystemProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/efs-filesystem` with definition name `EfsFilesystemProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `backupEnabled` | no | `boolean` | - |
| `provisionedThroughputInMibps` | no | `number` | - |
| `throughputMode` | no | `string: "bursting" \| "elastic" \| "provisioned"` | `elastic` |


## Referenceable parameters

EFS filesystems expose the following parameter for use with [`$ResourceParam`](/configuration/referenceable-parameters):

| Parameter | Description | Usage |
|---|---|---|
| `arn` | ARN of the EFS filesystem | `$ResourceParam('myEfs', 'arn')` |

## Next steps

- [Web service](/resources/compute/web-service#efs-storage): mount the file system in a container.
- [Lambda function](/resources/compute/lambda-function#storage): mount it in a function.
- [S3 bucket](/resources/storage/s3-bucket): for files your app reads by key, not as a file system.
