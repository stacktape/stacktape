# Using the CLI

## Basic usage

Every command should have the following form:

```bash
stacktape <<command>> --option1 <<option1>> --option2 <<option2>> ...more options...
```

## Aliases

For convenience, you can use aliases for stacktape binary itself and for CLI options.

For example the following command:

```bash
stacktape deploy --stage production --region eu-west-1 --configPath path/to/my/config.yml --preserveTempFiles
```

Can be shortened into:

```bash
stp deploy --s production --r eu-west-1 --cp path/to/my/config.yml --ptf
```

## Completions

For more convenient usage, Stacktape CLI supports completions for

- bash
- zsh
- powershell.

If stacktape installer detects that you are using one of these shells it will automatically install completions for you.

It will allow you to autocomplete supported commands and their allowed options. If using zsh you will also see short
description for each command and option.

## Log level

Stacktape prints information about what it's doing to the console. You can customize what's being printed.

You can set log level using:

```bash
stacktape <<command>> --logLevel << info | error | debug >>
```

| Value            | Description                                                                                                  |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| info _(default)_ | Prints basic information about everything that's happening.                                                  |
| error            | Prints only errors.                                                                                          |
| debug            | Prints detailed information about everything that's happening. Prints every remote call to the AWS services. |

## Log format

Adjusts the way logs are printed to the console.

You can set log format using:

```bash
stacktape <<command>> --logFormat << fancy | normal | json | basic >>
```

| Value             | Description                                         |
| ----------------- | --------------------------------------------------- |
| fancy _(default)_ | Logs are colorized and dynamically re-rendered.     |
| normal            | Logs are colorized but not dynamically re-rendered. |
| basic             | Simple text only                                    |
| json              | Logs are printed as JSON objects                    |