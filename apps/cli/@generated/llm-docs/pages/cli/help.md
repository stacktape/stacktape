# help

`stacktape help` lists the CLI's commands, or shows the options of one command. It needs no Stacktape account and no AWS credentials.

## Usage

List every command with its description:

```bash
stacktape help
```

Show the usage and options of one command, with which ones are required:

```bash
stacktape help deploy
```

`stacktape deploy --help` prints the same. The short alias `stp` works in place of `stacktape`, for example `stp help dev`.

## Options


## CLI Options: `stacktape help`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (positional 1)` | no | `string` | Command — This argument has different meanings depending on the command: • With `stacktape help`, it specifies a command to show detailed help for. • With `stacktape container shell`, it specifies a command to run inside the container to start the interactive session. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`version`](/cli/version) prints the installed CLI version.
- [`init`](/cli/init) adds Stacktape to an existing app, or creates a project from a starter.
- [Command index](/cli) lists every command by task, with links to their pages.
