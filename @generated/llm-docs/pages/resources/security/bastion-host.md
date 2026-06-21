# Bastion Host

A Stacktape bastion host is a lightweight EC2 instance that gives you secure, keyless access to private resources in your VPC — [relational databases](/resources/databases/relational-database), [Redis clusters](/resources/databases/redis), and [OpenSearch domains](/resources/databases/opensearch). It uses AWS Systems Manager instead of SSH keys, so there are no keys to generate, distribute, or rotate.

**Pricing:** ~$4/month with the default `t3.micro` instance (varies by AWS region).

## When to use

Add a bastion host when your stack has private VPC resources and you need interactive or ad-hoc access from your local machine. Common scenarios:

- **Connecting database GUI tools** — use port-forwarding tunnels so pgAdmin, DBeaver, or TablePlus can reach a private database as if it were on `localhost`.
- **Running ad-hoc queries** — use [`bastion:tunnel`](/cli/bastion-tunnel) to connect local database tools, or [`debug:sql`](/cli/debug-sql) for quick command-line queries against private databases.
- **Debugging connectivity** — verify that VPC networking, security groups, and DNS resolution work as expected from inside the VPC.
- **Running maintenance scripts** — execute migration or data-fix scripts that need direct VPC network access.

Most stacks with a private [relational database](/resources/databases/relational-database) or [Redis cluster](/resources/databases/redis) benefit from a bastion. It costs very little and saves significant time when you need to inspect or debug a private resource.

## When NOT to use

- **No private resources.** If you do not need interactive access to private VPC resources, skip the bastion. For public-only stacks, deployment scripts or direct client access are usually simpler. Private databases are still recommended for production.
- **Automated-only access.** If you only need to run migrations during deploys and your target is publicly reachable, use [deployment scripts](/resources/advanced/deployment-scripts) or [lifecycle hooks](/configuration/hooks-and-scripts) with `connectTo` — they inject connection details automatically without a persistent EC2 instance. For private VPC targets, the `local-script-with-bastion-tunneling` and `bastion-script` script types route through a bastion; use `bastionResource` to select which one.
- **High-bandwidth data transfer.** A bastion routes traffic through a single small instance. For bulk data movement (large database imports/exports, continuous replication), consider AWS Direct Connect or a VPN instead.

## Basic example

A bastion host requires no configuration — all properties are optional. The default instance size is `t3.micro`. The `logging` property lets you configure CloudWatch retention for three log streams — `messages`, `secure`, and `audit`. See the [Logging](#logging) section for retention defaults and options.


Example (TypeScript):

```typescript
import { defineConfig, Bastion } from 'stacktape';
export default defineConfig(() => {
  const bastion = new Bastion({});

  return {
    resources: { bastion }
  };
});
```


After deploying, use [`bastion:ssh`](/cli/bastion-session) to open an interactive shell or [`bastion:tunnel`](/cli/bastion-tunnel) to create port-forwarding tunnels to private resources.

## Connecting to private resources

The primary purpose of a bastion host is reaching private or VPC-protected resources — including relational databases, Redis clusters, MongoDB Atlas clusters, application load balancers, and private services. Stacktape provides two CLI commands for this: an interactive shell session and port-forwarding tunnels.

### Interactive shell

The [`bastion:ssh`](/cli/bastion-session) command opens an interactive shell on the bastion instance. Stacktape uses keyless SSH via AWS Systems Manager, so there are no SSH keys to manage.

```bash
stacktape bastion:ssh --stage production --region eu-west-1
```

Once connected, you can run commands on the bastion instance. Install the tools you need (database clients, network utilities) via [`runCommandsAtLaunch`](#startup-commands) so they're available every time you connect. See the [`bastion:ssh` CLI reference](/cli/bastion-session) for the full set of options.

### Tunnels

The [`bastion:tunnel`](/cli/bastion-tunnel) command creates a port-forwarding tunnel from your local machine to a private resource. The remote endpoint is mapped to a local port, so your local tools connect to `localhost` as if the resource were running on your machine.

```bash
stacktape bastion:tunnel --stage production --region eu-west-1
```

See the [`bastion:tunnel` CLI reference](/cli/bastion-tunnel) for the full set of options including how to specify the tunnel target. Supported tunnel targets:

| Resource type | Example use case |
|---|---|
| [Relational database](/resources/databases/relational-database) | Connect pgAdmin, DBeaver, or `psql` to a private RDS instance |
| [Redis cluster](/resources/databases/redis) | Connect RedisInsight or `redis-cli` to a private ElastiCache cluster |
| [MongoDB Atlas cluster](/resources/databases/mongodb-atlas) | Connect local MongoDB tools to a private MongoDB Atlas cluster |
| [Application load balancer](/resources/networking/application-load-balancer) | Access internal APIs or admin panels behind a private ALB |
| [Private service](/resources/compute/private-service) | Reach a private service fronted by an application load balancer |

If the target resource has multiple endpoints (for example, a Redis cluster with separate writer and reader endpoints), all endpoints are tunneled automatically. See the [`bastion:tunnel` CLI reference](/cli/bastion-tunnel) for details.

## Scripts

Beyond interactive access, Stacktape supports two script types that use a bastion for automated tasks. Both are configured in the [`scripts`](/configuration/hooks-and-scripts) section of your config and can be attached to lifecycle hooks including `beforeDeploy`, `afterDeploy`, `beforeDelete`, `afterDelete`, `beforeBucketSync`, `afterBucketSync`, `beforeDev`, and `afterDev`.

**Bastion scripts** (`bastion-script`) execute commands directly on the bastion instance inside your VPC. Output streams to your terminal in real time. Use this when your script needs direct VPC network access and you want a consistent execution environment — for example, running a database migration tool installed on the bastion.

**Local scripts with bastion tunneling** (`local-script-with-bastion-tunneling`) run on your local machine but route connections to VPC resources through the bastion. Environment variables injected by `connectTo` are automatically adjusted to use the tunneled endpoints. Use this when you want to run local tooling (Node.js scripts, Python migration runners) against private resources without modifying connection strings.

Both script types accept an optional `bastionResource` property to specify which bastion to use when your stack has more than one. For configuration details, see [hooks and scripts](/configuration/hooks-and-scripts).

## Instance size

The `instanceSize` property sets the EC2 instance type for the bastion. The default is `t3.micro`, which is sufficient for SSH tunneling and basic admin tasks. Use any valid EC2 instance type string for the AWS region you deploy to. Increase the size only if you run compute-intensive scripts directly on the bastion (data processing, heavy compilation).


Example (TypeScript):

```typescript
import { defineConfig, Bastion } from 'stacktape';
export default defineConfig(() => {
  const bastion = new Bastion({
    instanceSize: 't3.small'
  });

  return {
    resources: { bastion }
  };
});
```


`instanceSize` is a string for the EC2 instance type. For most teams, start with the default `t3.micro`; increase it only if commands run on the bastion need more CPU or memory.

## Startup commands

Use `runCommandsAtLaunch` to install CLI tools, database clients, or other software when the bastion instance first boots. Commands run as root, so `sudo` is not needed.


Example (TypeScript):

```typescript
import { defineConfig, Bastion } from 'stacktape';
export default defineConfig(() => {
  const bastion = new Bastion({
    runCommandsAtLaunch: ['yum install -y postgresql15', 'yum install -y redis6']
  });

  return {
    resources: { bastion }
  };
});
```


`runCommandsAtLaunch` accepts any shell commands valid for the bastion instance. The `yum` commands above are illustrative — choose commands that are valid for the image Stacktape uses for the bastion. Common tools to install include PostgreSQL clients (`psql`), Redis clients (`redis-cli`), MySQL clients, and JSON processors like `jq`.


> **Warning:** Changing `runCommandsAtLaunch` after the initial deployment replaces the underlying EC2 instance. Any data stored on the old instance is permanently lost. Treat the bastion as a disposable access point — don't store important files on it.


## Logging

Bastion logging exposes three log streams for CloudWatch, each with an independent retention period. When a log type is configured, `disabled` defaults to `false`.

| Log type | Source path | Default retention | What it captures |
|---|---|---|---|
| `messages` | `/var/log/messages` | 30 days | Startup info, kernel messages, service logs |
| `secure` | `/var/log/secure` | 180 days | Login attempts, authentication events |
| `audit` | `/var/log/audit/audit.log` | 365 days | Detailed security events from the Linux audit system |

You can customize retention per log type or disable individual streams. Bastion log types extend the shared log forwarding base type; see [log forwarding](/observability/log-forwarding) for supported forwarding options. Allowed `retentionDays` values: 1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, or 3653.


Example (TypeScript):

```typescript
import { defineConfig, Bastion } from 'stacktape';
export default defineConfig(() => {
  const bastion = new Bastion({
    logging: {
      messages: { retentionDays: 14 },
      secure: { retentionDays: 365 },
      audit: { disabled: true }
    }
  });

  return {
    resources: { bastion }
  };
});
```


For compliance-sensitive environments, keep `secure` and `audit` logs at longer retention periods. For development stacks where cost matters more than audit trails, reduce retention or disable log types you don't need.

## API Reference


## API Reference: `BastionProps`
```typescript
import type { BastionLoggingConfig } from 'stacktape';

type BastionProps = {
  /** EC2 instance type. t3.micro is sufficient for SSH tunneling and basic admin tasks. */
  instanceSize?: string;
  /** Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch. */
  logging?: BastionLoggingConfig;
  /** Shell commands to run when the instance starts (as root — no sudo needed). */
  runCommandsAtLaunch?: Array<string>;
};
```

| Property | Required | Type | Description | Default |
| --- | --- | --- | --- | --- |
| `instanceSize` | no | `string` | EC2 instance type. `t3.micro` is sufficient for SSH tunneling and basic admin tasks. | `t3.micro` |
| `logging` | no | `BastionLoggingConfig` | Log retention settings for system, security, and audit logs. Logs are sent to CloudWatch. | - |
| `runCommandsAtLaunch` | no | `Array<string>` | Shell commands to run when the instance starts (as root — no `sudo` needed). Use to install CLI tools, database clients, or other dependencies.
**Warning:** changing this list after creation replaces the instance — any data on the old instance is lost. | - |


## FAQ

### How much does a bastion host cost?

A bastion runs a single EC2 instance. With the default `t3.micro`, the cost is approximately $4/month (varies by AWS region). Tunnel traffic may also incur standard AWS data transfer charges; for typical interactive database access this is usually much smaller than the instance cost. You can reduce cost further by deleting the bastion from development stacks you don't use frequently.

### Do I need SSH keys to connect?

No. Stacktape bastion hosts use AWS Systems Manager for keyless access — there are no SSH keys to generate, distribute, or rotate. This eliminates a common source of security risk and operational overhead.

### Can I connect a database GUI to a private database?

Yes. Use [`bastion:tunnel`](/cli/bastion-tunnel) to create a port-forwarding tunnel from your local machine to the private database. The tunnel maps the remote database endpoint to a local port, so your GUI tool (pgAdmin, DBeaver, TablePlus, DataGrip) connects to `localhost` as if the database were running locally.

### What happens if I change the startup commands?

Changing `runCommandsAtLaunch` replaces the underlying EC2 instance on the next deployment. Any files or data on the old instance are permanently lost. This is by design — the bastion should be treated as ephemeral infrastructure, not a persistent server.

### Can I run database migrations through a bastion?

Yes, in two ways. A `bastion-script` runs migration commands directly on the bastion instance inside the VPC. Alternatively, `local-script-with-bastion-tunneling` runs locally while tunneling connections to private VPC resources through the bastion; `connectTo` ensures injected connection details use the tunneled endpoints. Both are configured in the [scripts](/configuration/hooks-and-scripts) section of your config and can be attached to lifecycle hooks.

### What's the difference between bastion:ssh and bastion:tunnel?

[`bastion:ssh`](/cli/bastion-session) opens an interactive shell on the bastion instance — you type commands and see output, similar to SSH. [`bastion:tunnel`](/cli/bastion-tunnel) creates a port-forwarding tunnel that maps a remote resource endpoint to a local port, letting local tools connect to the private resource. Use `bastion:ssh` for ad-hoc commands on the bastion itself; use `bastion:tunnel` for connecting local applications to private resources.

### Do I need a bastion for every stack?

No. Only add a bastion to stacks that contain private resources you want to access interactively. If a stack only has [Lambda functions](/resources/compute/lambda-function) and public APIs, a bastion adds no value. For stacks with private databases or Redis clusters, add a bastion when you need interactive access for debugging, maintenance, or local development workflows.

### What resources can I tunnel to?

The [`bastion:tunnel`](/cli/bastion-tunnel) command supports [relational databases](/resources/databases/relational-database), [Redis clusters](/resources/databases/redis), [MongoDB Atlas clusters](/resources/databases/mongodb-atlas), [application load balancers](/resources/networking/application-load-balancer), and [private services](/resources/compute/private-service) fronted by an application load balancer. If the target has multiple endpoints (for example, a Redis cluster with writer and reader nodes), all endpoints are tunneled automatically.

### Is the bastion always running?

A Stacktape bastion is an EC2 instance, so plan for ongoing instance cost while the resource exists in your stack. Unlike serverless resources, there is no scale-to-zero — the instance runs continuously to be ready when you need it. For development stacks you don't use daily, consider removing the bastion resource and re-adding it when needed.

### Bastion host vs VPN — which should I use?

A Stacktape bastion host is the simplest way to get ad-hoc access to private VPC resources. It uses AWS Systems Manager, so Stacktape does not require SSH keys. It costs ~$4/month. A VPN (AWS Client VPN, OpenVPN, WireGuard) gives full network-level access to the VPC, which is better when multiple team members need persistent, always-on access or when you need to route arbitrary traffic into the VPC. For most Stacktape users, a bastion is sufficient and far simpler to set up.
