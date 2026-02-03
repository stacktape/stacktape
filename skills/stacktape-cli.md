# Stacktape CLI for LLMs

Stacktape deploys and manages AWS infrastructure from configuration files. Use `--agent` flag for LLM-optimized output.

## Quick Reference

```bash
# Always use --agent for clean output
stacktape <command> --agent [options]
```

## Core Commands

### Deploy

```bash
stacktape deploy --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --configPath <path>
```

Creates or updates a stack. Outputs resource URLs on success.

### Delete

```bash
stacktape delete --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region>
```

Removes all stack resources. Auto-confirms with `--agent`.

### Preview Changes

```bash
stacktape preview-changes --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --configPath <path>
```

Shows what will change on next deploy without applying.

Output format:

```
SUMMARY: X new, Y removed, Z modified
NEW RESOURCES (X):
  + ResourceName (ResourceType)
MODIFIED RESOURCES (Z):
  ~ ResourceName (ResourceType)
    Changed: property1, property2
```

### Stack Info

```bash
# List all stacks in region
stacktape stack:list --agent --region <region>

# Get stack details (outputs, resources)
stacktape info:stack --agent --stackName <name> --region <region>

# Get specific parameter from resource
stacktape param:get --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <resource> \
  --paramName <param>
```

## Debug Commands

Commands for debugging deployed applications.

### Logs

```bash
# Fetch recent logs
stacktape debug:logs --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <resource> \
  --startTime "1h"

# Using CloudWatch Logs Insights query
stacktape debug:logs --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <resource> \
  --query "fields @timestamp, @message | filter @message like /ERROR/ | limit 50"
```

Output: JSON array of log events with timestamp, message, logStream.

### Alarms

```bash
# Check all alarm states
stacktape debug:alarms --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region>

# Filter by resource or state (OK, ALARM, INSUFFICIENT_DATA)
stacktape debug:alarms --agent ... --resourceName <resource>
stacktape debug:alarms --agent ... --state ALARM
```

Output: JSON with alarm name, state, metric, threshold, reason.

### Metrics

```bash
stacktape debug:metrics --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <resource> \
  --metric <metricName> \
  --startTime "1h" \
  --stat Average
```

Metrics by resource type:

- Lambda: Invocations, Errors, Duration, Throttles
- ECS: CPUUtilization, MemoryUtilization
- RDS: CPUUtilization, DatabaseConnections, FreeStorageSpace

### Container Exec

```bash
# Execute command in running container
stacktape debug:container-exec --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <service> \
  --command "cat /app/config.json"

# Connect to specific task
stacktape debug:container-exec --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <service> \
  --taskArn <task-id> \
  --command "ps aux"

# Specify container for multi-container workloads
stacktape debug:container-exec --agent \
  --projectName <name> \
  --stage <stage> \
  --region <region> \
  --resourceName <service> \
  --container sidecar \
  --command "env"
```

Returns JSON with command output and exit code.

## Secrets Management

Secrets are stored in AWS Secrets Manager and referenced in config via `$Secret('name')`.

```bash
# Create secret from value
stacktape secret:create --agent \
  --region <region> \
  --secretName <name> \
  --secretValue <value>

# Create secret from file
stacktape secret:create --agent \
  --region <region> \
  --secretName <name> \
  --secretFile <path>

# Get secret
stacktape secret:get --agent \
  --region <region> \
  --secretName <name>

# Delete secret
stacktape secret:delete --agent \
  --region <region> \
  --secretName <name>
```

## Project Info

```bash
# Current user and organization
stacktape info:whoami --agent

# List all projects with stages and costs
stacktape info:projects --agent

# Recent operations (deploys, deletes)
stacktape info:operations --agent --limit 10
```

## Dev Mode

See `skills/dev-mode.md` for local development with agent API.

## Common Patterns

### Deploy and get URL

```bash
stacktape deploy --agent --projectName myapp --stage prod --region eu-west-1 --configPath ./stacktape.ts
# Parse output for URLs under "DEPLOYMENT SUCCESSFUL"
```

### Check if stack exists

```bash
stacktape info:stack --agent --stackName myapp-prod --region eu-west-1
# Returns stack info or error if not found
```

### Safe deployment

```bash
# Preview first
stacktape preview-changes --agent ...

# Deploy if changes look good
stacktape deploy --agent ...
```

## Required Arguments

| Command              | Required                             |
| -------------------- | ------------------------------------ |
| deploy               | stage, region, configPath            |
| delete               | stage, region                        |
| preview-changes      | stage, region, configPath            |
| stack:list           | region                               |
| info:stack           | stackName, region                    |
| secret:\*            | region, secretName                   |
| debug:logs           | stage, region, resourceName          |
| debug:alarms         | stage, region                        |
| debug:metrics        | stage, region, resourceName, metric  |
| debug:container-exec | stage, region, resourceName, command |

## Output Format

With `--agent`:

- No colors or animations
- Progress: `X/Y resources (Z%)`
- Success: `[+] MESSAGE`
- Error: `[x] MESSAGE` with hints
- Plain text, parseable

## Error Handling

Errors include:

- Error type (CONFIG, STACK, etc.)
- Message describing the issue
- Hints for resolution

Example:

```
[x] Configuration Error

Invalid resource reference: myDatabase

Hints:
  -> Check that the resource name matches one defined in your config
```
