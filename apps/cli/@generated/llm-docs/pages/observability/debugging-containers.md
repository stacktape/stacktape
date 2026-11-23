# Debugging deployed containers

Two CLI commands get you inside a running container of a deployed stage:
[`container shell`](/cli/container-shell) opens an interactive shell, and [`container exec`](/cli/container-exec)
runs one command and prints its output as JSON. They work for [web services](/resources/compute/web-service),
[private services](/resources/compute/private-service), [worker services](/resources/compute/worker-service) and
[multi-container workloads](/resources/compute/multi-container-workload). For functions, see
[Debugging Lambda functions](/local-development/debugging-lambda-functions).

## Turn on remote sessions first

Both commands connect through ECS Exec, which is off by default. Turn it on for the workload and deploy:

```yaml
resources:
  api:
    type: web-service
    properties:
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 512
      enableRemoteSessions: true
```

This adds a small SSM agent to each task. A workload with remote sessions doesn't get in-place code swaps, so its code
deploys take a full container rollout.

The commands also need:

- at least one running task of the workload;
- AWS credentials that may call `ecs:ExecuteCommand` and `ssm:StartSession`, or a CLI signed in to the Console.

No SSH, open ports or keys are involved. The CLI downloads the AWS Session Manager plugin the first time it needs it.

## Open a shell

```bash
stacktape container shell api --stage production --region eu-west-1
```

The shell is `/bin/sh` unless you pass another program with `--command "/bin/bash"`. When the service runs several
tasks, the CLI asks which one, labeled by task ID and start time.

Use it to check files, environment variables and mounted volumes, test connections with `curl` or `nc`, or look at
running processes. Whatever you run happens in a live container, so be careful in production.

## Run one command

```bash
stacktape container exec api "cat /app/version.txt" --stage staging --region eu-west-1
```

It prints JSON with the resource, container, task, command, output and exit code:

```json
{
  "resourceName": "api",
  "containerName": "api",
  "taskArn": "arn:aws:ecs:eu-west-1:123456789012:task/cluster/abc123",
  "command": "cat /app/version.txt",
  "output": "1.42.0\n",
  "exitCode": 0
}
```

Without `--task-arn`, it uses the first running task. Pass `--task-arn` with the full ARN or the task ID to pick one.
Because the output is JSON, it suits scripts and coding agents.

## Workloads with several containers

Name the container with `--container`:

```bash
stacktape container shell api --stage production --region eu-west-1 --container nginx
```

Without it, a workload with one container uses that one, and a workload with several fails with the list of names.

For log output, use [`stacktape logs`](/cli/logs) instead of reading log files inside the container. Dev mode runs
containers on your machine, so debug those with your usual local tools.

## Troubleshooting

### "Resource is not a valid container based resource"

The `--resource-name` doesn't match a deployed container workload. Check the name in your config (it is
case-sensitive), the stage and the region.

### "No running tasks found for this resource"

The service has no running task. The container may be crash-looping (check [`stacktape logs`](/cli/logs)), a deploy
may be replacing the tasks, or the service scaled to zero.

### The session fails to start or ECS refuses the command

Remote sessions are probably off for the workload, or its tasks started before you turned them on. Set
`enableRemoteSessions: true` and deploy, so new tasks start with the agent.

### The shell opens and closes right away

The image may have no `/bin/sh`. Pass a program it has with `--command`, or use a base image with a shell. If that
doesn't help, the container may be stopping because of a failed health check or too little memory.
