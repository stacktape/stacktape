# Bastion host

A bastion host is a small EC2 instance in your stack's VPC that lets you reach private resources from your machine:
[relational databases](/resources/databases/relational-database), [Redis caches](/resources/databases/redis) and other
services that accept VPC connections only. You connect through AWS Systems Manager, so there are no SSH keys and no
open SSH port.

It runs all the time. In us-east-1 the default `t3.micro` costs about $7.60 a month, plus about $3.65 for its public
IPv4 address and a few cents for its disk ([EC2 pricing](https://aws.amazon.com/ec2/pricing/on-demand/)). For a
database that's open to the internet, you don't need one.

## Basic example


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


The deploy starts one Amazon Linux 2023 instance in a public subnet. Nothing on the internet can connect to it; Systems Manager
sessions go out from the instance.

Open a tunnel from your machine to a private database:

```bash
stacktape bastion tunnel mainDatabase --stage production
```

The command prints a `localhost` address for each endpoint of the resource. Point `psql`, DBeaver, TablePlus or your
ORM at it and keep the command running while you work. A Redis cache with a reader endpoint gets two local ports.

## Connecting to private resources

[`bastion tunnel`](/cli/bastion-tunnel) forwards local ports to one resource. It works with
[relational databases](/resources/databases/relational-database), [Redis caches](/resources/databases/redis),
[MongoDB Atlas clusters](/resources/databases/mongodb-atlas),
[application load balancers](/resources/networking/application-load-balancer) and
[private services](/resources/compute/private-service) behind a load balancer.

[`bastion shell`](/cli/bastion-session) opens a shell on the instance itself:

```bash
stacktape bastion shell --stage production
```

With several bastions in one stack, pick one with `--bastion-resource`. For a one-off query, `stacktape query sql` and
`stacktape query redis` take `--bastion-resource` too and need no tunnel.

## Scripts

Two [script](/configuration/hooks-and-scripts) types use a bastion, for example to run migrations from a hook against a
private database:

- **`local-script-with-bastion-tunneling`** runs on your machine and routes its connections through the bastion. The
  `connectTo` variables it gets point at the tunnel, so the script needs no changes.
- **`bastion-script`** runs the commands on the bastion instance and streams the output to your terminal.

Both take `bastionResource` when the stack has more than one bastion.

## Instance size

`instanceSize` is `t3.micro` by default, which is enough for tunnels and admin work. Pick a larger size only if you run
heavy scripts on the bastion.


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


## Startup commands

`runCommandsAtLaunch` runs commands as root when the instance starts, for example to install database clients. The
instance runs Amazon Linux 2023, so use `dnf` or `yum`.


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


> **Warning:** Changing `runCommandsAtLaunch` replaces the instance on the next deploy, and files on the old one are lost. Don't keep
anything on the bastion you can't recreate.


## Logging

The bastion sends three system logs to CloudWatch, each with its own retention:

| Log type | Source | Default retention | Contains |
|---|---|---|---|
| `messages` | `/var/log/messages` | 30 days | Startup, kernel and service messages |
| `secure` | `/var/log/secure` | 180 days | Sign-ins and authentication events |
| `audit` | `/var/log/audit/audit.log` | 365 days | Linux audit events |


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


Keep `secure` and `audit` longer when you need an audit trail, and shorten or turn them off for development stacks.
Each log type also supports [log forwarding](/observability/log-forwarding).

## Configuration reference


### Definition: `BastionProps`

The complete property-level reference is included in `llms-api-reference.txt` and indexed under route `/config-reference/bastion` with definition name `BastionProps`.

| Property | Required | Type | Default |
| --- | --- | --- | --- |
| `instanceSize` | no | `string` | `t3.micro` |
| `logging` | no | `BastionLoggingConfig` | - |
| `runCommandsAtLaunch` | no | `Array<string>` | - |
