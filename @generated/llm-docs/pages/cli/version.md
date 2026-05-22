# version

The `stacktape version` command prints the currently installed version of Stacktape. It requires no arguments, no configuration file, and no API key. Use it to verify your installation or check whether you need to [upgrade](/cli/upgrade).

## Usage

```bash
stacktape version
```

The command outputs the installed version number and exits. No AWS credentials, project configuration, or login are required.

## Flags reference


## CLI Options: `stacktape version`

No available options.


## Related commands

- [`upgrade`](/cli/upgrade) — upgrade Stacktape to the latest version or a specific version.
- [`help`](/cli/help) — display help information for any Stacktape command.
- [`info:whoami`](/cli/info-whoami) — verify your API key, organization, and connected AWS accounts.

## FAQ

### Does `stacktape version` require an API key or login?

No. The `version` command runs entirely locally and does not contact the Stacktape API. You can run it before logging in or configuring any credentials.

### How do I upgrade to the latest version?

Run [`stacktape upgrade`](/cli/upgrade). You can also install a specific version with `stacktape upgrade --version 3.4.0`. After upgrading, run `stacktape version` to confirm the new version is active.
