# defaults:configure

The `defaults:configure` command sets system-wide default values for common Stacktape CLI arguments like region, stage, and AWS profile. Once configured, you can skip repetitive flags on commands like [`deploy`](/cli/deploy), [`delete`](/cli/delete), and [`debug:logs`](/cli/debug-logs). The command does not require an API key, so you can run it before [`login`](/cli/login).

## Usage

```bash
stacktape defaults:configure
```

The command is fully interactive — it prompts you for each configurable property one at a time. Each prompt shows the current value — either the previously saved value or the property's configured default. If the resolved value is `null`, the prompt displays `<< not-set >>`. Sensitive properties use password-style input and their current values are redacted — values longer than four characters are masked except for the last four characters, while values with four or fewer characters are displayed unchanged.

For each prompt, you have three options:

- **Leave blank** (press Enter) to keep the current value unchanged.
- **Enter a new value** to update it.
- **Enter a space character** to reset the property to its configured default value.

After saving, the command prints the path to the file where defaults are stored.

## Configurable defaults

The command walks through two groups of settings: CLI argument defaults and other defaults.

### CLI argument defaults

These defaults apply automatically when the corresponding CLI flag is not explicitly provided on a command invocation. The command description lists these configurable properties:

| Property | Description |
|---|---|
| `region` | AWS region for deployments and operations |
| `awsProfile` | AWS credentials profile (corresponds to the `--profile` CLI flag) |
| `stage` | Stage name |
| `projectName` | Project name |
| `awsAccount` | AWS Account name |

Setting a default `region` and `stage` is the most common use case. For example, [`deploy`](/cli/deploy) requires both `--region` and `--stage`, so defaults for both let you run `stacktape deploy` without extra flags. [`delete`](/cli/delete) requires `--region`, and [`debug:logs`](/cli/debug-logs) requires `--region`, `--stage`, and `--resourceName` (which is not a configurable default).

### Other defaults

The command also prompts for additional settings that are not CLI flags:

| Property | Description |
|---|---|
| Executable paths | Default executables for resolving Node.js directives and other script invocations |

Sensitive configurable defaults are prompted with password-style input. Their current values are redacted — values longer than four characters are masked except for the last four, while values with four or fewer characters are displayed unchanged.


> **Tip:** Most users only need to configure `region`, `stage`, and optionally `awsProfile`. The executable settings are only relevant if your system uses non-standard installation paths or a version manager that places binaries outside the default `PATH`.


## How defaults interact with CLI flags

Configured defaults fill in values when you do not pass the corresponding CLI flag. If your default region is `eu-west-1`, running the following command deploys to `us-east-1` for that single invocation:

```bash
stacktape deploy --region us-east-1 --stage production
```

The configured default remains unchanged — it still applies to subsequent commands that don't pass `--region` explicitly.

## Where defaults are stored

After saving, Stacktape prints the local persisted-state file path. This file is local to your machine.


> **Warning:** Protect the persisted-state file with standard filesystem permissions if you share the machine with other users.


## Examples

Configure your region and stage so most commands work without extra flags.

```bash
stacktape defaults:configure
```

When the prompts appear, enter `eu-west-1` for region and `production` for stage. Leave other fields blank to skip them. Afterward, commands like `stacktape deploy` use those values automatically.

To check what defaults are currently configured, use [`defaults:list`](/cli/defaults-list).

```bash
stacktape defaults:list
```

To reset a single default to its configured default value, run `defaults:configure` again and enter a space character when prompted for that property.

## Flags reference


## CLI Options: `stacktape defaults:configure`

No available options.


## Related commands

- [`defaults:list`](/cli/defaults-list) — print all currently configured defaults.
- [`login`](/cli/login) — configure your Stacktape API key.
- [`deploy`](/cli/deploy) — deploy a stack, using configured defaults for region, stage, and project name.

## FAQ

### Do explicit CLI flags override configured defaults?

Configured defaults fill in values only when you do not pass the corresponding CLI flag. For example, `--region us-east-1` overrides a default region of `eu-west-1` for that single invocation without changing the stored default. This lets you keep convenient defaults while still targeting a different region or stage when needed.

### How do I clear a single configured default?

Run `stacktape defaults:configure` again. When prompted for the property you want to clear, enter a single space character instead of a value. This resets the property to its configured default value. Other properties remain unchanged — just press Enter to skip them.

### Do I need to be logged in to run defaults:configure?

No. The `defaults:configure` command does not require a Stacktape API key. You can configure region, stage, and profile defaults before running [`login`](/cli/login). This is useful when setting up a new machine — configure your defaults first, then log in when you're ready to deploy.

### Can I set defaults per project instead of globally?

The `defaults:configure` command sets system-wide defaults that apply across all projects on your machine. If you work on multiple projects with different regions or stages, pass the flags explicitly on commands where the defaults don't apply, or use shell aliases for project-specific workflows.

### Should I use defaults:configure or shell aliases?

Use `defaults:configure` when one region, stage, and profile cover most of your work — it's simpler and applies to every Stacktape command automatically. Use shell aliases or wrapper scripts when you regularly switch between multiple configurations (e.g., separate staging and production aliases). The two approaches can coexist: set your most common values as defaults, then override with flags or aliases when needed.

### Are stored defaults secure?

Defaults are saved to a local file on your filesystem. The `defaults:configure` prompt masks sensitive values when displaying their current state. Protect the file with standard filesystem permissions if you share the machine with other users. For API key management, see [`login`](/cli/login).

### How do defaults work in CI/CD pipelines?

Configured defaults are machine-specific and stored locally. In CI/CD environments, you typically do not run `defaults:configure`. Instead, pass all required flags explicitly in your pipeline scripts (e.g., `stacktape deploy --region eu-west-1 --stage production --projectName my-app`). See [Custom CI/CD](/ci-cd-and-gitops/custom-ci-cd) for pipeline integration patterns.

### What happens if I configure a default for a flag that a specific command doesn't accept?

The default is simply ignored for that command. For example, if you set a default `stage`, commands that don't accept `--stage` (like [`help`](/cli/help) or [`version`](/cli/version)) are unaffected. Defaults only apply to commands that accept the corresponding flag.

### Can I see which defaults are active before running a command?

Run [`defaults:list`](/cli/defaults-list) to print all currently configured defaults. This shows both CLI argument defaults (region, stage, profile) and other stored settings. It's a quick way to verify your configuration before deploying or debugging.
