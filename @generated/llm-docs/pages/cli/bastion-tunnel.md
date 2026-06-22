# bastion:tunnel

The `bastion:tunnel` command creates a secure tunnel through a [bastion host](/resources/security/bastion-host) to reach resources inside a private VPC. Use it to connect local tools — database GUIs, Redis CLIs, or HTTP clients — to resources that have no public endpoint. The command establishes the tunnel through AWS SSM Session Manager.

## Usage

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myDatabase
```

The command opens one or more local ports, prints the local-to-remote mapping, and keeps running until you press `Ctrl+C`. Your stack must contain a [bastion](/resources/security/bastion-host) resource.

## Important flags

**`--resourceName`** (required) — the name of the target resource you want to reach through the tunnel, as defined in your Stacktape configuration.

**`--bastionResource`** — selects which bastion resource to tunnel through. Use this when your stack has multiple bastion hosts.

**`--localTunnelingPort`** — sets the local port passed to the tunneling helper. If not specified, Stacktape automatically selects an available port. If the target resolves to multiple tunnel targets, Stacktape opens one port-forwarding session per target and prints the actual local ports.

## Flags reference

<CliCommandsApiReference command="bastion:tunnel" sortedArgs={[
  {
    "name": "region",
    "required": true,
    "alias": "r",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "us-east-2",
      "us-east-1",
      "us-west-1",
      "us-west-2",
      "ap-east-1",
      "ap-south-1",
      "ap-northeast-3",
      "ap-northeast-2",
      "ap-southeast-1",
      "ap-southeast-2",
      "ap-northeast-1",
      "ca-central-1",
      "eu-central-1",
      "eu-west-1",
      "eu-west-2",
      "eu-west-3",
      "eu-north-1",
      "me-south-1",
      "sa-east-1",
      "af-south-1",
      "eu-south-1"
    ],
    "shortDescription": "<p> AWS Region</p>\n",
    "longDescription": "<p>The AWS region for the operation. For a list of available regions, see the <a href=\"https://docs.aws.amazon.com/general/latest/gr/rande.html\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">AWS documentation</a>.</p>\n"
  },
  {
    "name": "resourceName",
    "required": true,
    "alias": "rn",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Resource Name</p>\n",
    "longDescription": "<p>The name of the resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "stage",
    "required": true,
    "alias": "s",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Stage</p>\n",
    "longDescription": "<p>The stage for the operation (e.g., <code>production</code>, <code>staging</code>, <code>dev-john</code>). You can set a default stage using the <code>defaults:configure</code> command. The maximum length is 12 characters.</p>\n"
  },
  {
    "name": "agent",
    "required": false,
    "alias": "ag",
    "allowedTypes": [
      "boolean"
    ],
    "shortDescription": "<p> Agent Mode</p>\n",
    "longDescription": "<p>Optimizes CLI output for programmatic/LLM consumption:</p>\n<ul>\n<li>Uses strict JSONL/NDJSON output (one JSON object per line)</li>\n<li>Disables interactive terminal UI</li>\n<li>Automatically confirms operations (equivalent to --autoConfirmOperation)\nFor dev command: also enables HTTP server for programmatic control.</li>\n</ul>\n"
  },
  {
    "name": "awsAccount",
    "required": false,
    "alias": "aa",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Account</p>\n",
    "longDescription": "<p>The name of the AWS account to use for the operation. The account must first be connected in the <a href=\"https://console.stacktape.com/aws-accounts\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Stacktape console</a>.</p>\n"
  },
  {
    "name": "bastionResource",
    "required": false,
    "alias": "br",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Bastion Resource Name</p>\n",
    "longDescription": "<p>The name of the bastion resource as defined in your Stacktape configuration.</p>\n"
  },
  {
    "name": "configPath",
    "required": false,
    "alias": "cp",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Config File Path</p>\n",
    "longDescription": "<p>The path to your Stacktape configuration file, relative to the current working directory.</p>\n"
  },
  {
    "name": "currentWorkingDirectory",
    "required": false,
    "alias": "cwd",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Current Working Directory</p>\n",
    "longDescription": "<p>The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file.</p>\n"
  },
  {
    "name": "help",
    "required": false,
    "alias": "h",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Show Help</p>\n",
    "longDescription": "<p>If provided, the command will not execute and will instead print help information.</p>\n"
  },
  {
    "name": "localTunnelingPort",
    "required": false,
    "alias": "ltp",
    "allowedTypes": [
      "number"
    ],
    "shortDescription": "<p> Local Tunneling Port</p>\n",
    "longDescription": "<p>Specifies the local port for tunneling when using the <code>bastion:tunnel</code> command. If not specified, Stacktape automatically selects an available port.</p>\n"
  },
  {
    "name": "logLevel",
    "required": false,
    "alias": "ll",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "info",
      "debug",
      "error"
    ],
    "shortDescription": "<p> Log Level</p>\n",
    "longDescription": "<p>The level of logs to print to the console.</p>\n<ul>\n<li><code>info</code>: Basic information about the operation.</li>\n<li><code>error</code>: Only errors.</li>\n<li><code>debug</code>: Detailed information for debugging.</li>\n</ul>\n"
  },
  {
    "name": "outputFormat",
    "required": false,
    "alias": "ofmt",
    "allowedTypes": [
      "string"
    ],
    "allowedValues": [
      "jsonl",
      "plain",
      "tty"
    ],
    "shortDescription": "<p> Output Format</p>\n",
    "longDescription": "<p>Controls the CLI output format:</p>\n<ul>\n<li><code>jsonl</code>: Machine-readable NDJSON (one JSON object per line). Disables interactive UI.</li>\n<li><code>plain</code>: Simple text output without colors or animations. Used automatically in CI or non-TTY environments.</li>\n<li><code>tty</code>: Full interactive terminal UI with colors, spinners, and animations. Used automatically when a TTY is detected.\nIf not specified, the format is auto-detected from the environment. --agent implies --outputFormat jsonl.</li>\n</ul>\n"
  },
  {
    "name": "profile",
    "required": false,
    "alias": "p",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> AWS Profile</p>\n",
    "longDescription": "<p>The AWS profile to use for the command. You can manage profiles using the <code>aws-profile:*</code> commands and set a default profile with <code>defaults:configure</code>.</p>\n"
  },
  {
    "name": "projectName",
    "required": false,
    "alias": "prj",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Project Name</p>\n",
    "longDescription": "<p>The name of the Stacktape project for this operation.</p>\n"
  },
  {
    "name": "templateId",
    "required": false,
    "alias": "ti",
    "allowedTypes": [
      "string"
    ],
    "shortDescription": "<p> Template ID</p>\n",
    "longDescription": "<p>The ID of the template to download. You can find a list of available templates on the <a href=\"https://console.stacktape.com/templates\" style=\"font-weight: bold;\" target=\"_blank\" rel=\"noreferrer\" onclick=\"event.stopPropagation();\">Config Builder page</a>.</p>\n"
  }
]} />

## Supported resource types

Bastion tunneling works with four resource types. Stacktape resolves the tunnel targets for the resource and opens one or more port-forwarding sessions accordingly.

| Resource type | Notes |
|---|---|
| [relational-database](/resources/databases/relational-database) | Tunnels to the database endpoints resolved for the resource. |
| [redis-cluster](/resources/databases/redis) | Tunnels to the Redis endpoints resolved for the resource. |
| [application-load-balancer](/resources/networking/application-load-balancer) | Tunnels to the load balancer's listener ports. |
| [private-service](/resources/compute/private-service) | Tunnels through the private service's nested load balancer. Requires the deployed private service to have a nested load balancer. |

If you target a resource type not listed above, Stacktape fails the command with an unsupported-tunnel-target error.

## Examples

### Tunnel to a relational database

Connect a local database GUI (pgAdmin, DataGrip, DBeaver) to a VPC-only PostgreSQL or MySQL database.

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myDatabase
```

The output prints each local-to-remote mapping. When tunnel metadata includes an additional string, Stacktape prints it with the remote host and port replaced by the local tunnel address.

### Tunnel on a specific local port

Pin the local port so bookmarked database connections stay stable across sessions.

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myDatabase --localTunnelingPort 5433
```

Stacktape starts one port-forwarding session for each resolved target and prints the local port for each tunnel.

### Tunnel to a Redis cluster

Access a VPC-only [Redis cluster](/resources/databases/redis) from a local `redis-cli` or Redis GUI.

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myRedis
```

### Tunnel to a private service

Reach a [private service](/resources/compute/private-service) through its load balancer.

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myPrivateApi
```

### Specify which bastion to use

When a stack has multiple bastion hosts, pass the bastion name explicitly with `--bastionResource`.

```bash
stacktape bastion:tunnel --stage prod --region eu-west-1 --resourceName myDatabase --bastionResource devBastion
```

## How tunneling works

When you run `bastion:tunnel`, Stacktape performs the following steps:

1. Initializes services for working with the deployed stack.
2. Looks up the target resource by `--resourceName` in the deployed stack. If the resource does not exist, the command fails with an error.
3. Validates that the target is a supported resource type. For `private-service`, it also checks that the resource has a nested load balancer.
4. Resolves the tunnel targets for the resource (hosts, ports, and optional connection string metadata) using the target resource name and the bastion resource name.
5. Passes `--localTunnelingPort` as the starting port to the port-forwarding session helper, which opens one SSM session per resolved target.
6. Prints the local-to-remote mappings, including substituted connection strings when available.
7. Registers cleanup hooks to close all tunnel sessions on exit.
8. Keeps the process alive until you press `Ctrl+C`.


> **Info:** The tunnel uses AWS SSM Session Manager under the hood. Because the tunnel uses SSM port forwarding, AWS may require the local [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html) depending on your AWS CLI setup.


## FAQ

### Do I need SSH keys to use bastion:tunnel?

No. The `bastion:tunnel` command uses AWS SSM Session Manager for port forwarding, not SSH, so there are no SSH keys to manage. Depending on your AWS CLI setup, AWS may require the local [Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html), and your stack must include a [bastion](/resources/security/bastion-host) resource.

### How do I connect a database GUI through the tunnel?

Run `bastion:tunnel` and note the local address printed in the output (e.g. `127.0.0.1:5433`). In your database GUI, set the host to `127.0.0.1` and the port to the printed local port. Use the same database credentials you normally use for the deployed resource; `bastion:tunnel` only changes the host and port to the printed local address.

### Why does my private service tunnel fail?

Tunneling to a [private service](/resources/compute/private-service) requires the deployed service to have a nested load balancer. If your private service does not have one, the command fails with an error. The other supported targets are `relational-database`, `redis-cluster`, and `application-load-balancer`; any other resource type fails with an unsupported-tunnel-target error.

### Can I run multiple tunnels at the same time?

Yes. Each `bastion:tunnel` invocation keeps running while its port-forwarding sessions are open, so run another invocation in a separate terminal for a second tunnel. Pass a different `--localTunnelingPort` to each one to avoid local port collisions.

### Can I tunnel to a publicly accessible database?

You can, but there is no reason to. If a database has a public endpoint, connect to it directly. Bastion tunneling is designed for resources deployed in a private VPC with no public endpoint.

## Related commands

- [`bastion:session`](/cli/bastion-session) — start an interactive shell session on the bastion host itself.
- [`query:sql`](/cli/query-sql) — run read-only SQL queries against a deployed database. Supports `--bastionResource` for VPC-only databases.
- [`query:redis`](/cli/query-redis) — query a deployed Redis cluster. Supports `--bastionResource` for VPC-only clusters.
