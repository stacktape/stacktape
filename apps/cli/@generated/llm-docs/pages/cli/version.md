# version

The `stacktape version` command prints the currently installed version of Stacktape. It requires no arguments, no configuration file, and no API key. Use it to verify your installation or check whether you need to [upgrade](/cli/upgrade).

## Usage

```bash
stacktape version
```

The command outputs the installed version number and exits. No AWS credentials, project configuration, or login are required.

`stacktape --version` and `stacktape -v` print the same output.

## Flags reference


## CLI Options: `stacktape version`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`upgrade`](/cli/upgrade) — upgrade Stacktape to the latest version or a specific version.
- [`help`](/cli/help) — display help information for any Stacktape command.
- [`whoami`](/cli/info-whoami) — verify your API key, organization, and connected AWS accounts.

## FAQ

### Does `stacktape version` require an API key or login?

No. The `version` command runs entirely locally and does not contact the Stacktape API. You can run it before logging in or configuring any credentials.

### How do I check if my Stacktape version is out of date?

Run `stacktape version` to see what you have installed, then run [`stacktape upgrade`](/cli/upgrade) to move to the latest release (or `stacktape upgrade 4.0.1` for a specific version). Re-run `stacktape version` afterward to confirm the new version is active.
