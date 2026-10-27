# upgrade

The `stacktape upgrade` command upgrades your Stacktape CLI to the latest published version. It detects how Stacktape was installed — native binary, global package, or local project dependency — and either runs the appropriate upgrade command automatically or prints it for you to run. No Stacktape API key is required.

## Usage

```bash
stacktape upgrade
```

The command compares your installed version against the latest published release using semver. If you are already on the latest version, it exits with a success message and takes no action.

## How it works

When an upgrade is available, Stacktape detects your installation type and responds accordingly:

- **Native installation**: Stacktape downloads the installer for your platform and runs it.
- **Global package install**: Stacktape runs `npm install -g stacktape@<version>`, or the pnpm or Bun equivalent.
- **Local project dependency**: Stacktape prints the appropriate update command for you to run yourself, since modifying project dependencies should be an explicit choice.
- **Unknown installation method**: Stacktape prints a command to run manually.

The installer runs as a file: through PowerShell on Windows and through `sh` on macOS and Linux. A preview version upgrades to the newest preview, or to a stable release once one is newer.

## Flags


## CLI Options: `stacktape upgrade`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--new-version (positional 1)` | no | `string` | New Version — The version of Stacktape to install. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


Without a version argument, Stacktape installs the latest published version.

## Examples

Upgrade to the latest Stacktape version:

```bash
stacktape upgrade
```

Install a specific version:

```bash
stacktape upgrade 4.0.1
```


> **Info:** If Stacktape is installed as a local project dependency (in `node_modules`), the command prints the appropriate update command instead of running it. Run the printed command yourself to complete the upgrade.


## Related commands

- [`version`](/cli/version) — print the currently installed Stacktape version.
- [`login`](/cli/login) — configure your API key after upgrading.
- [`help`](/cli/help) — display available commands and options.

## FAQ

### Does `stacktape upgrade` require an API key or AWS credentials?

No Stacktape API key is required. The command has no required arguments — it reads local version metadata, resolves the latest published version, and runs or prints an install command. It does not accept AWS account or region flags.

### What happens if I'm already on the latest version?

Stacktape compares your installed version against the latest published release. If they match, it prints a success message confirming you are up to date and exits without making any changes.

### Why does the command print a command for local installs instead of running it?

Stacktape classifies your install as `native`, `package-global`, `package-local`, or unknown. Native and global package installs are upgraded automatically. For a local project dependency, upgrading modifies `node_modules` and the lockfile and affects your whole project, so Stacktape prints the exact command instead — letting you review and run it in the right project context.

### Can I downgrade or pin a specific Stacktape version?

Pass the version as an argument, for example `stacktape upgrade 4.0.1`. Stacktape installs exactly that version, including an older one. Without it, `upgrade` installs the latest published version.
