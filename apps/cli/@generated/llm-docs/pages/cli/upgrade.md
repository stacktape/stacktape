# upgrade

`stacktape upgrade` updates the CLI to the latest published version, or to the version you name. It finds out how the CLI was installed and runs the matching update, or prints the command when the CLI is a project dependency. It needs no Stacktape account and no AWS credentials.

## Usage

```bash
stacktape upgrade
```

When you are on the latest version already, the command says so and changes nothing. A preview version upgrades to the newest preview, or to a stable release once one is newer.

Install an exact version, newer or older:

```bash
stacktape upgrade 4.0.1
```

## What it runs

| Installed with | What `upgrade` does |
|---|---|
| The installer script | Downloads the installer for your platform and runs it (PowerShell on Windows, `sh` on macOS and Linux) |
| `npm`, `pnpm` or `bun` globally | Runs `npm install -g stacktape@<version>` or the pnpm or Bun equivalent |
| A project dependency (`node_modules`) | Prints the update command, because it changes your lockfile. Run it in the project. |
| Something else | Prints a command to run yourself |

## Options


## CLI Options: `stacktape upgrade`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--new-version (positional 1)` | no | `string` | New Version — The version of Stacktape to install. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`version`](/cli/version) prints the installed version.
- [`help`](/cli/help) lists the commands of the version you have.
