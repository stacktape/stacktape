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
   */
  runCommandsAtLaunch?: string[];
  /**
   * #### Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch.
   */
  logging?: BastionLoggingConfig;
}

interface BastionLoggingConfig {
  /**
   * #### System messages (`/var/log/messages`) — startup info, kernel messages, service logs.
   *
   * @default retentionDays: 30
   */
  messages?: BastionLogging;
  /**
   * #### Auth logs (`/var/log/secure`) — SSH login attempts, authentication events.
   *
   * @default retentionDays: 180
   */
  secure?: BastionLogging;
  /**
   * #### Audit logs (`/var/log/audit/audit.log`) — detailed security events from the Linux audit system.
   *
   * @default retentionDays: 365
   */
  audit?: BastionLogging;
}

interface BastionLogging extends LogForwardingBase {
  /**
   * #### Disable this log type. Stops sending to CloudWatch.
   * @default false
   */
  disabled?: boolean;
  /**
   * #### Days to keep logs in CloudWatch before automatic deletion.
   */
  retentionDays?: 1 | 3 | 5 | 7 | 14 | 30 | 60 | 90 | 120 | 150 | 180 | 365 | 400 | 545 | 731 | 1827 | 3653;
}

type StpBastion = Bastion['properties'] & {
  name: string;
  type: Bastion['type'];
  configParentResourceType: Bastion['type'];
  nameChain: string[];
};
