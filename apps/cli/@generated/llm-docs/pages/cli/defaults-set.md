# defaults set

`stacktape defaults set` saves default values for flags you would otherwise type on every command, such as the region, stage, project and AWS profile. A flag you pass still wins for that one command. Defaults apply to every project on this machine. The command needs no Stacktape account and no AWS credentials.

## Usage

Set one default:

```bash
stacktape defaults set region eu-west-1
```

```bash
stacktape defaults set stage dev-alice
```

After that, `stacktape deploy` with no `--region` deploys to `eu-west-1`, and `--region us-east-1` overrides it for one command. A stage you deploy every day, such as your own dev stage, is the usual default. A default stage still means `stacktape delete` with no `--stage` targets it, so pass `--stage` on destructive commands anyway.

Without arguments, the command asks for every default in turn and shows the current value. Press Enter to keep a value, type a new one to change it, or type a single space to reset it.

```bash
stacktape defaults set
```

The CLI prints the file it saved the defaults to. It is a file in your home directory, local to this machine. [`defaults list`](/cli/defaults-list) shows what is set.

## What you can set

| Key | Used as |
|---|---|
| `region` | `--region` |
| `stage` | `--stage` |
| `project` | `--project` |
| `profile` | `--profile`, the AWS profile (default `default`) |
| `aws-account` | `--aws-account`, a connected AWS account name in the Console |
| `api-key` | The Stacktape API key. [`login`](/cli/login) sets it for you. |
| `executable-python`, `executable-javascript` | The Python and Node.js executables Stacktape runs (default `python` and `node`). Change them only when they are not on your `PATH` under those names. |

An unknown key or an invalid value, such as a stage with capital letters, fails with the list of keys.

## Options


## CLI Options: `stacktape defaults set`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--key (positional 1)` | no | `string` | Default setting to update: region, stage, profile, project, aws-account, api-key, executable-python or executable-javascript. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
| `--value (positional 2)` | no | `string` | New value for the selected default setting. | - |


## Related commands

- [`defaults list`](/cli/defaults-list) prints the saved defaults.
- [`deploy`](/cli/deploy) uses them for region, stage and project.
- [`login`](/cli/login) signs the CLI in to the Console.
