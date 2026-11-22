# connect

`stacktape connect` adds the AWS account you deploy to with the CLI to the [Stacktape Console](/stacktape-console/console-overview). It signs you in if needed, connects the account of your current AWS credentials to your organization, and finds the Stacktape stacks already in that account. Nothing is redeployed: your stacks keep their names, resources and URLs.

Use it after you deployed [without an account](/getting-started/open-source-cli) and want the Console: logs, alarms, costs, Git deployments and team access. The Console is free up to $200 a month of AWS spend it manages. See [Billing and subscription](/stacktape-console/billing-and-subscription).

## Usage

```bash
stacktape connect
```

To connect a different account, pick its AWS profile:

```bash
stacktape connect --profile production
```

## What happens

1. **Sign-in.** When this machine is not signed in, the CLI opens the same browser sign-in as [`stacktape login`](/cli/login). Pass `--no-browser` to only print the address, for example over SSH.
2. **The AWS account.** The CLI reads the account of your local AWS credentials: `--profile`, `AWS_PROFILE` or the standard AWS credential chain.
3. **The connection.** When the account is not connected yet, the CLI creates the connection stack in it with your credentials. The stack creates an IAM role that the Console uses to read and deploy your stacks. It is a CloudFormation stack in `eu-west-1`, whatever region you deploy to. When the account is already connected, the CLI says so and skips this step.
4. **Your stacks.** The Console looks for the Stacktape stacks in the account. They appear as projects and stages, and the CLI prints how many it found.
5. **The Console address.** The CLI prints `Nothing was redeployed or changed.` and the address of your projects in the Console.

If creating the connection stack with your credentials fails, for example because they lack IAM permissions, the CLI opens the AWS CloudFormation console instead. Create the stack there and return to the terminal. [Connecting your AWS account](/stacktape-console/connecting-your-aws-account) describes the Console side, including the `PENDING` and `BLOCKED` states.

## Who can connect an account

Owners and Admins can connect accounts. A Developer or Viewer reaches only the AWS accounts chosen for them, so the command stops with `Your role in <organization> cannot connect AWS accounts.` Ask an Owner or Admin to run `stacktape connect` with credentials for the account. See [Team and access control](/stacktape-console/team-and-access-control).

## In scripts and coding agents

With `--agent` the command never prompts and never opens a browser. It needs a sign-in first: run [`stacktape login`](/cli/login) or set `STACKTAPE_API_KEY`. When creating the connection stack fails, the command stops with an error instead of opening the browser.

## When some stacks are missing

When the CLI cannot read stacks in a region, it names the region, and stacks there are not listed yet. When the search fails, the account stays connected. In both cases an Owner or Admin can run **Find existing stacks** on the AWS accounts page of the Console.

## Undo it

To make the CLI work without the Console again, run [`stacktape logout`](/cli/logout). Nothing deployed changes. To also remove the Console's access to the account, delete the connection on the AWS accounts page of the Console and delete the connection stack in the AWS CloudFormation console. See [Revoking access](/stacktape-console/connecting-your-aws-account#revoking-access).

## Options


## CLI Options: `stacktape connect`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--no-browser` | no | `boolean` | No Browser — If `true`, prints the address instead of opening a browser: `init` still starts the wizard, and `login` still waits for you to approve the sign-in. Use this when the browser you want is not this machine's default, on another device, or behind a forwarded port. | - |
| `-p, --profile` | no | `string` | AWS Profile — The AWS profile to use for the command. You can manage profiles using the `aws-profile:*` commands and set a default profile with `defaults set`. For commands that use a connected AWS account, `--profile` (or `AWS_PROFILE`) selects the connected account the profile belongs to, unless `--aws-account` is set. The command fails if that account is not connected. | - |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |


## Related commands

- [`login`](/cli/login) signs this machine in to Stacktape without connecting an AWS account.
- [`logout`](/cli/logout) returns the CLI to working without an account.
- [`whoami`](/cli/info-whoami) shows your organization and its connected AWS accounts.
