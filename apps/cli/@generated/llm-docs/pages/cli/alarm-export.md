# alarm export

`stacktape alarm export` prints the alarm rules created in the Stacktape Console as entries for the `alarms` list of a resource in your configuration. The Console no longer creates or edits alarm rules. The old ones are listed under **Legacy alarm rules** on the Console's Alarms page and keep applying to matching deployments until the stack defines its alarms in configuration.

The command needs a Console sign-in ([`stacktape login`](/cli/login)) and changes nothing. It only prints.

## Usage

```bash
stacktape alarm export
```

The output starts with how many rules it found. Each rule follows as a YAML list entry, with a comment that names the rule and the projects and stages it applies to:

```yaml
# alarm "api-error-rate"
# applies to projects: all · stages: production
- trigger:
    type: lambda-error-rate
    properties:
      thresholdPercent: 5
  notificationChannels:
    - type: console-channel
      properties:
        channelName: production-alerts
```

The Console channels a rule sent to become `console-channel` entries. When the organization has no Console rules, the command prints `This organization has no Console-defined alarms. Nothing to export.`

## Moving the rules into your configuration

1. Run `stacktape alarm export`.
2. Add each entry to the `alarms` list of every resource it should watch. Where a rule applies only to some stages, use [stage-based configuration](/configuration/stages-and-environments).
3. Deploy each affected stage. Once a stack deploys with the alarm in its configuration, the Console rule stops applying to that stack.
4. Check the alarms on the Console's Alarms page or with [`stacktape alarm list`](/cli/alarms), then delete the legacy rule in the Console.

[Alarms](/observability/alarms#migrating-legacy-console-alarm-rules) explains the alarm settings and how `disabledGlobalAlarms` excludes a legacy rule from a resource while you migrate.

## Options


## CLI Options: `stacktape alarm export`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`alarm list`](/cli/alarms) shows the state of the alarms of a deployed stack.
- [`deploy`](/cli/deploy) creates the alarms you added to the configuration.
