# Efs Filesystem

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
 *
 * **Example (YAML):**
 *
 * ```yaml
 * resources:
 *   sharedStorage:
 *     type: efs-filesystem
 *     properties:
 *       backupEnabled: true
 *       throughputMode: elastic
 *   apiWorkload:
 *     type: multi-container-workload
 *     properties:
 *       containers:
 *         - name: api-container
 *           packaging:
 *             type: prebuilt-image
 *             properties:
 *               image: my-repo/my-api
 *           volumeMounts:
 *             - type: efs
 *               properties:
 *                 efsFilesystemName: sharedStorage
 *                 mountPath: /data
 *       resources:
 *         cpu: 1
 *         memory: 2048
 * ```
 *
 * **Example (TypeScript):**
 *
 * ```ts
 * import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';
 *
 * export default defineConfig(() => {
 *   const sharedStorage = new EfsFilesystem({
 *     backupEnabled: true,
 *     throughputMode: 'elastic'
 *   });
 *
 *   const apiWorkload = new MultiContainerWorkload({
 *     containers: [
 *       {
 *         name: 'api-container',
 *         packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/my-api' } },
 *         volumeMounts: [
 *           { type: 'efs', properties: { efsFilesystemName: 'sharedStorage', mountPath: '/data' } }
 *         ]
 *       }
 *     ],
 *     resources: { cpu: 1, memory: 2048 }
 *   });
 *
 *   return { resources: { sharedStorage, apiWorkload } };
 * });
 * ```
 */
interface EfsFilesystem {
  type: 'efs-filesystem';
  properties?: EfsFilesystemProps;
  overrides?: ResourceOverrides;
}

interface EfsFilesystemProps {
  /**
   * #### Enable daily automatic backups with 35-day retention. Incremental (only changes are copied).
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   mediaStorage:
   *     type: efs-filesystem
   *     properties:
   *       backupEnabled: true
   *       throughputMode: elastic
   *   cmsWorkload:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: cms
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: my-repo/cms
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: mediaStorage
   *                 mountPath: /var/www/uploads
   *       resources:
   *         cpu: 0.5
   *         memory: 1024
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const mediaStorage = new EfsFilesystem({
   *     backupEnabled: true,
   *     throughputMode: 'elastic'
   *   });
   *
   *   const cmsWorkload = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'cms',
   *         packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/cms' } },
   *         volumeMounts: [
   *           { type: 'efs', properties: { efsFilesystemName: 'mediaStorage', mountPath: '/var/www/uploads' } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 0.5, memory: 1024 }
   *   });
   *
   *   return { resources: { mediaStorage, cmsWorkload } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   modelStorage:
   *     type: efs-filesystem
   *     properties:
   *       backupEnabled: false
   *       throughputMode: provisioned
   *       provisionedThroughputInMibps: 100
   *   inferenceWorkload:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: inference
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: my-repo/ml-inference
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: modelStorage
   *                 mountPath: /models
   *       resources:
   *         cpu: 2
   *         memory: 4096
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const modelStorage = new EfsFilesystem({
   *     backupEnabled: false,
   *     throughputMode: 'provisioned',
   *     provisionedThroughputInMibps: 100
   *   });
   *
   *   const inferenceWorkload = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'inference',
   *         packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/ml-inference' } },
   *         volumeMounts: [
   *           { type: 'efs', properties: { efsFilesystemName: 'modelStorage', mountPath: '/models' } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 2, memory: 4096 }
   *   });
   *
   *   return { resources: { modelStorage, inferenceWorkload } };
   * });
   * ```
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
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   highThroughputStorage:
   *     type: efs-filesystem
   *     properties:
   *       throughputMode: provisioned
   *       provisionedThroughputInMibps: 256
   *   dataWorkload:
   *     type: multi-container-workload
   *     properties:
   *       containers:
   *         - name: processor
   *           packaging:
   *             type: prebuilt-image
   *             properties:
   *               image: my-repo/data-processor
   *           volumeMounts:
   *             - type: efs
   *               properties:
   *                 efsFilesystemName: highThroughputStorage
   *                 mountPath: /shared
   *       resources:
   *         cpu: 4
   *         memory: 8192
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { EfsFilesystem, MultiContainerWorkload, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const highThroughputStorage = new EfsFilesystem({
   *     throughputMode: 'provisioned',
   *     provisionedThroughputInMibps: 256
   *   });
   *
   *   const dataWorkload = new MultiContainerWorkload({
   *     containers: [
   *       {
   *         name: 'processor',
   *         packaging: { type: 'prebuilt-image', properties: { image: 'my-repo/data-processor' } },
   *         volumeMounts: [
   *           { type: 'efs', properties: { efsFilesystemName: 'highThroughputStorage', mountPath: '/shared' } }
   *         ]
   *       }
   *     ],
   *     resources: { cpu: 4, memory: 8192 }
   *   });
   *
   *   return { resources: { highThroughputStorage, dataWorkload } };
   * });
   * ```
   */
  provisionedThroughputInMibps?: number;
}

type EfsFilesystemReferencableParam = 'arn';
```
