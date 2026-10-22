# help

The `stacktape help` command displays help information for all available Stacktape CLI commands and their options. Run it without arguments to see every command, or pass a command name (`stacktape help deploy`) to get detailed option documentation for that command. No API key or AWS credentials are required.

## Usage

List all available commands with their descriptions:

```bash
stacktape help
```

Show detailed options for a specific command:

```bash
stacktape help deploy
```

The short alias `stp` works in place of `stacktape`:

```bash
stp help dev
```

## Help for one command

When you pass a command name, Stacktape prints the command usage and available options, including each argument's name, whether it is required, and its description. This is the fastest way to check which flags a command accepts without leaving the terminal. `stacktape <command> --help` prints the same output.

```bash
stacktape help delete
```

Without a command name, the output lists every CLI command with its configured description, followed by hints linking to the CLI documentation and the Stacktape docs site.

## Options reference

The `help` command accepts one optional argument. The reference below lists its name, alias, type, and whether it is required.


## CLI Options: `stacktape help`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--command (positional 1)` | no | `string` | Command — This argument has different meanings depending on the command: • With `stacktape help`, it specifies a command to show detailed help for. • With `stacktape container shell`, it specifies a command to run inside the container to start the interactive session. | - |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Examples

Get help for the [dev](/cli/dev) command to see all development mode flags:

```bash
stacktape help dev
```

Check required and optional flags for [logs](/cli/logs):

```bash
stacktape help logs
```

View all commands at a glance:

```bash
stacktape help
```

## Related commands

- [version](/cli/version) — print the installed Stacktape version.
- [init](/cli/init) — scaffold a new Stacktape project with an interactive wizard.
- [defaults set](/cli/defaults-configure) — set system-wide default values for common flags like `region` and `stage`.
