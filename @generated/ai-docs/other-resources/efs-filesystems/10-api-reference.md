# API Reference

TypeScript type definitions for this resource.

```typescript
// From stacktape-config/efs-filesystem.d.ts
/**
 * #### EFS Filesystem
 *
 * ---
 *
 * A fully managed, elastic, and scalable file storage service for use with AWS cloud services.
 */
interface EfsFilesystem {
  type: 'efs-filesystem';
  properties?: EfsFilesystemProps;
  overrides?: ResourceOverrides;
}

interface EfsFilesystemProps {
  /**
   * #### Enables automatic backups for the EFS filesystem.
   *
   * ---
   *
   * - Uses AWS Backup with a default daily backup schedule and a 35-day retention period.
   * - Backups are incremental, meaning only changed, added, or removed files are copied after the initial backup.
   * - Data from all storage classes (Standard, Infrequent Access, and Archive) is backed up without incurring data access charges.
   * - Restored data is always placed in the Standard storage class.
   * - The default backup plan and vault are automatically created and managed by AWS.
   */
  backupEnabled?: boolean;

  /**
   * #### Determines how throughput is managed for the filesystem.
   *
   * ---
   *
   * - **`elastic`** (Recommended): Best for unpredictable or spiky workloads, such as web apps or CI/CD pipelines. It is ideal for workloads that use high throughput for 5% of the time or less, and it automatically scales up and down based on demand.
   *
   * - **`provisioned`**: Best for steady, predictable workloads that require high throughput more than 5% of the time, such as media streaming or production databases. This mode requires setting `provisionedThroughputInMibps`.
   *
   * - **`bursting`**: Scales with storage size, providing a baseline of 50 KiB/s per GiB of storage. This mode is suitable for small development environments and team file shares, but you may hit performance limits if burst credits are depleted.
   *
   * @default elastic
   */
  throughputMode?: 'elastic' | 'provisioned' | 'bursting';

  /**
   * #### The desired throughput in MiB/s when using `provisioned` mode.
   *
   * ---
   *
   * - Required when `throughputMode` is set to `provisioned`.
   * - Must be a value greater than 0.
   * - Additional fees are charged based on the provisioned throughput.
   * - This value can be modified at any time to adjust performance.
   *
   * Example: `100` means 100 MiB/s of guaranteed throughput.
   */
  provisionedThroughputInMibps?: number;
}

type StpEfsFilesystem = EfsFilesystem['properties'] & {
  name: string;
  type: EfsFilesystem['type'];
  configParentResourceType: EfsFilesystem['type'];
  nameChain: string[];
};

type EfsFilesystemReferencableParam = 'arn';
```