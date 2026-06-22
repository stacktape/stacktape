/**
 * #### Secure jump box for accessing private resources (databases, Redis, OpenSearch) in your VPC.
 *
 * ---
 *
 * Uses keyless SSH via AWS Systems Manager — no SSH keys to manage. Connect with `stacktape bastion:ssh`
 * or create port-forwarding tunnels with `stacktape bastion:tunnel`. Costs ~$4/month (t3.micro).
 */
interface Bastion {
  type: 'bastion';
  properties?: BastionProps;
  overrides?: ResourceOverrides;
}

interface BastionProps {
  /**
   * #### EC2 instance type. `t3.micro` is sufficient for SSH tunneling and basic admin tasks.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('database.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.4'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       accessibility:
   *         accessibilityMode: vpc
   *   bastion:
   *     type: bastion
   *     properties:
   *       # stp-focus
   *       instanceSize: t3.small
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserName: 'admin', masterUserPassword: $Secret('database.password') },
   *     engine: { type: 'postgres', properties: { version: '16.4', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
   *     accessibility: { accessibilityMode: 'vpc' }
   *   });
   *   const bastion = new Bastion({
   *     // stp-focus
   *     instanceSize: 't3.small'
   *     // stp-end-focus
   *   });
   *   return { resources: { database, bastion } };
   * });
   * ```
   *
   * @default t3.micro
   */
  instanceSize?: string;
  /**
   * #### Shell commands to run when the instance starts (as root — no `sudo` needed).
   *
   * ---
   *
   * Use to install CLI tools, database clients, or other dependencies.
   * **Warning:** changing this list after creation replaces the instance — any data on the old instance is lost.
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   database:
   *     type: relational-database
   *     properties:
   *       credentials:
   *         masterUserName: admin
   *         masterUserPassword: $Secret('database.password')
   *       engine:
   *         type: postgres
   *         properties:
   *           version: '16.4'
   *           primaryInstance:
   *             instanceSize: db.t4g.micro
   *       accessibility:
   *         accessibilityMode: vpc
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       # stp-focus
   *       runCommandsAtLaunch:
   *         - yum install -y postgresql15
   *         - yum install -y redis6
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, RelationalDatabase, defineConfig, $Secret } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const database = new RelationalDatabase({
   *     credentials: { masterUserName: 'admin', masterUserPassword: $Secret('database.password') },
   *     engine: { type: 'postgres', properties: { version: '16.4', primaryInstance: { instanceSize: 'db.t4g.micro' } } },
   *     accessibility: { accessibilityMode: 'vpc' }
   *   });
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     // stp-focus
   *     runCommandsAtLaunch: ['yum install -y postgresql15', 'yum install -y redis6']
   *     // stp-end-focus
   *   });
   *   return { resources: { database, bastion } };
   * });
   * ```
   */
  runCommandsAtLaunch?: string[];
  /**
   * #### Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       # stp-focus
   *       logging:
   *         messages:
   *           retentionDays: 30
   *         secure:
   *           retentionDays: 180
   *         audit:
   *           retentionDays: 365
   *       # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     // stp-focus
   *     logging: {
   *       messages: { retentionDays: 30 },
   *       secure: { retentionDays: 180 },
   *       audit: { retentionDays: 365 }
   *     }
   *     // stp-end-focus
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   */
  logging?: BastionLoggingConfig;
}

interface BastionLoggingConfig {
  /**
   * #### System messages (`/var/log/messages`) — startup info, kernel messages, service logs.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       logging:
   *         # stp-focus
   *         messages:
   *           retentionDays: 14
   *         # stp-end-focus
   *         secure:
   *           retentionDays: 180
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     logging: {
   *       // stp-focus
   *       messages: { retentionDays: 14 },
   *       // stp-end-focus
   *       secure: { retentionDays: 180 }
   *     }
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   *
   * @default retentionDays: 30
   */
  messages?: BastionLogging;
  /**
   * #### Auth logs (`/var/log/secure`) — SSH login attempts, authentication events.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       logging:
   *         # stp-focus
   *         secure:
   *           retentionDays: 365
   *         # stp-end-focus
   *         messages:
   *           retentionDays: 30
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     logging: {
   *       // stp-focus
   *       secure: { retentionDays: 365 },
   *       // stp-end-focus
   *       messages: { retentionDays: 30 }
   *     }
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   *
   * @default retentionDays: 180
   */
  secure?: BastionLogging;
  /**
   * #### Audit logs (`/var/log/audit/audit.log`) — detailed security events from the Linux audit system.
   *
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       logging:
   *         # stp-focus
   *         audit:
   *           retentionDays: 731
   *         # stp-end-focus
   *         secure:
   *           retentionDays: 180
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     logging: {
   *       // stp-focus
   *       audit: { retentionDays: 731 },
   *       // stp-end-focus
   *       secure: { retentionDays: 180 }
   *     }
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   *
   * @default retentionDays: 365
   */
  audit?: BastionLogging;
}

interface BastionLogging extends LogForwardingBase {
  /**
   * #### Disable this log type. Stops sending to CloudWatch.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       logging:
   *         secure:
   *           retentionDays: 180
   *         audit:
   *           # stp-focus
   *           disabled: true
   *           # stp-end-focus
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     logging: {
   *       secure: { retentionDays: 180 },
   *       audit: {
   *         // stp-focus
   *         disabled: true
   *         // stp-end-focus
   *       }
   *     }
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   *
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   *
   * ---
   *
   * **Example (YAML):**
   *
   * ```yaml
   * resources:
   *   bastion:
   *     type: bastion
   *     properties:
   *       instanceSize: t3.micro
   *       logging:
   *         messages:
   *           # stp-focus
   *           retentionDays: 90
   *           # stp-end-focus
   *         secure:
   *           retentionDays: 180
   * ```
   *
   * **Example (TypeScript):**
   *
   * ```ts
   * import { Bastion, defineConfig } from 'stacktape';
   *
   * export default defineConfig(() => {
   *   const bastion = new Bastion({
   *     instanceSize: 't3.micro',
   *     logging: {
   *       messages: {
   *         // stp-focus
   *         retentionDays: 90
   *         // stp-end-focus
   *       },
   *       secure: { retentionDays: 180 }
   *     }
   *   });
   *   return { resources: { bastion } };
   * });
   * ```
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type StpBastion = Bastion['properties'] & {
  name: string;
  type: Bastion['type'];
  configParentResourceType: Bastion['type'];
  nameChain: string[];
};
