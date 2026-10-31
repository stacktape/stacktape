# dev stop

The `dev stop` command gracefully stops a running dev agent that was started with [`stacktape dev --agent`](/cli/dev). Dev agents expose a local HTTP status endpoint, and `dev stop` uses the selected port to stop the matching agent. It can also clean up orphaned Docker containers left behind by crashed dev sessions.

## Usage

```bash
stacktape dev stop
```

Running `stacktape dev stop` without flags stops the dev agent of the project in the current directory. It finds the agent through the lock files in the project directory, or, when they are gone, by asking each of your running agents for its project directory. It never stops an agent of another directory: when no agent of this project runs, it stops nothing and lists the agents of other directories.

When several stages of the project run, `dev stop` stops none of them and fails (`ok: false`, code `CLI_DEV_STOP_AMBIGUOUS`) with the list. Choose one with `--stage`.

The agent accepts only requests that carry its session token. `dev stop` reads it from `~/.stacktape/dev-agent-tokens/{port}.token`, so `--agent-port` works from any directory.

## Important flags

The `dev stop` command accepts flags that control which agent to stop and whether to clean up leftover containers.

### --stage and --cwd

`--stage` stops the agent of that stage. `--cwd` stops the agent of another project directory, for example a second Git worktree.

```bash
stacktape dev stop --cwd ../my-app-worktree --stage dev
```

### --agent-port

Pass `--agent-port` with the port number to stop the agent on that port, wherever it was started.

```bash
stacktape dev stop --agent-port 7332
```

### --cleanup-containers

A dev session removes its database containers when it stops; their data stays in `.stacktape/dev-data/{stage}/`. A session that crashed or was killed leaves its containers behind. The `--cleanup-containers` flag removes the containers that dev sessions of this project directory left behind: stopped ones, and running ones whose session has ended. With `--stage`, it removes only that stage's. Containers of other projects and Git worktrees stay; add `--all` to remove those of every project on the machine. The result lists the removed containers in `removedContainers`. After cleanup, the command checks for running agents via lock files — if none are found, it exits; if agents are found, normal agent-stop behavior continues (stopping the project's agent, or failing with the list when several stages run).

```bash
stacktape dev stop --cleanup-containers
stacktape dev stop --cleanup-containers --all
```

You can combine `--cleanup-containers` with `--agent-port` to both clean up containers and stop a specific agent in one command.

```bash
stacktape dev stop --cleanup-containers --agent-port 7332
```

## Flags reference

All flags accepted by `stacktape dev stop`. None are required — the command discovers and stops agents automatically when possible.


## CLI Options: `stacktape dev stop`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--agent-port` | no | `number` | Agent Port — Stops the dev agent on this port, wherever it was started. | - |
| `--all` | no | `boolean` | All — With `--cleanup-containers`, removes the left-behind Stacktape dev containers of every project on this machine, not only of this project directory. | - |
| `--aws-account` | no | `string` | AWS Account — The name of the AWS account to use for the operation. The account must first be connected in the [Stacktape Console](https://console.stacktape.com/aws-accounts). Without it, the account is chosen by `--profile`, `AWS_PROFILE` or AWS credentials in environment variables, then by your saved default, then by your organization's only connected account. `--aws-account` takes precedence over all of them, but AWS credentials in environment variables must then belong to that account. | - |
| `--cleanup-containers` | no | `boolean` | Cleanup Containers — Removes the Docker containers that dev sessions of this project directory left behind: stopped ones, and running ones whose session has ended. With `--stage`, only that stage's. Use this after a crash or improper shutdown. Containers of other projects stay unless you add `--all`. | - |
| `-c, --config` | no | `string` | Config File Path — The path to your Stacktape configuration file, relative to the current working directory. | - |
| `--cwd` | no | `string` | Current Working Directory — The working directory for the operation. All file paths in your configuration will be resolved relative to this directory. By default, this is the directory containing the configuration file. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `-s, --stage` | no | `string` | Stage — The stage for the operation (e.g., `production`, `staging`, `dev-john`). You can set a default stage using the `defaults set` command. Stage names use lowercase letters, numbers and dashes, with at least 2 characters and no fixed maximum. Stacktape shortens an AWS resource name that would be too long and adds a hash. | - |


## Related commands

- [`dev`](/cli/dev) — Start a dev agent for local development and debugging.
- [`deploy`](/cli/deploy) — Deploy your stack to AWS when you're done iterating locally.
