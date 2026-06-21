# defaults:list

The `defaults:list` command prints all system-wide Stacktape defaults configured on your machine. Stacktape uses these defaults as fallback values for commands that accept the corresponding arguments, so you don't need to pass common flags like `--region` or `--stage` each time.

## Usage

```bash
stacktape defaults:list
```

This command takes no arguments. It reads stored defaults and prints each configured key-value pair. If no defaults are set, it suggests running [`defaults:configure`](/cli/defaults-configure).

## Command reference


## CLI Options: `stacktape defaults:list`

No available options.


## What gets displayed

The output shows all defaults you've previously set with [`defaults:configure`](/cli/defaults-configure). Configurable defaults include:

- `region` — AWS region used for deployments
- `stage` — default stage name
- `awsProfile` — AWS credentials profile
- `projectName` — default project name
- `awsAccount` — AWS account identifier

`defaults:list` also prints other stored defaults, such as default executables for resolving Node.js directives, when configured.

Each default appears as a `key: value` pair. Stacktape uses these values as fallback arguments for commands that accept the corresponding options.


> **Info:** This command does not require a Stacktape API key. You can run it without being logged in.


## Related commands

- [`defaults:configure`](/cli/defaults-configure) — set or update system-wide defaults
- [`info:whoami`](/cli/info-whoami) — verify your current user, organization, and connected accounts
- [`login`](/cli/login) — configure your Stacktape API key
