---
docType: config-ref
title: Efs Filesystem
resourceType: efs-filesystem
tags:
  - efs-filesystem
  - efs
  - filesystem
  - persistent-storage
source: types/stacktape-config/efs-filesystem.d.ts
priority: 1
---

# Efs Filesystem

Shared file storage that multiple containers can read/write simultaneously.

Persistent, elastic (grows/shrinks automatically), and accessible from any container in your stack
via `volumeMounts`. Use for shared uploads, CMS media, ML model files, or anything that needs to
survive container restarts. Pay only for storage used (~$0.30/GB/month for standard access).

Resource type: `efs-filesystem`

## TypeScript Definition

```typescript
/**
 * #### Shared file storage that multiple containers can read/write simultaneously.
 *
 * ---
 *
 * Persistent, elastic (grows/shrinks automatically), and accessible from any container in your stack
 * via `volumeMounts`. Use for shared uploads, CMS media, ML model files, or anything that needs to
 * survive container restarts. Pay only for storage used (~$0.30/GB/month for standard access).
 */
interface EfsFilesystem {
  type: 'efs-filesystem';
  properties?: EfsFilesystemProps;
  overrides?: ResourceOverrides;
}

interface EfsFilesystemProps {
  /**
   * #### Enable daily automatic backups with 35-day retention. Incremental (only changes are copied).
   */
  backupEnabled?: boolean;

  /**
   * #### How throughput scales with your workload.
   *
   * ---
   *
   * - **`elastic`** (recommended): Auto-scales throughput. Best for spiky workloads (web apps, CI/CD).
   * - **`provisioned`**: Fixed throughput you set via `provisionedThroughputInMibps`. Best for steady high-throughput workloads.
   * - **`bursting`**: Throughput scales with storage size (50 KiB/s per GiB). Can run out of burst credits.
   *
   * @default elastic
   */
  throughputMode?: 'elastic' | 'provisioned' | 'bursting';

  /**
   * #### Guaranteed throughput in MiB/s. Required when `throughputMode` is `provisioned`.
   *
   * ---
   *
   * E.g., `100` = 100 MiB/s. Additional fees apply based on the provisioned amount. Can be changed anytime.
   */
  provisionedThroughputInMibps?: number;
}

type EfsFilesystemReferencableParam = 'arn';
```
