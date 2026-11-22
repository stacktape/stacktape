# ai disconnect

The `stacktape ai disconnect` command removes your own sign-in with one AI provider from Stacktape, in the organization of your API key. It asks which provider to disconnect unless you pass it as an argument (`ai disconnect <ai-provider>`). Hosted AI incident runs you request can no longer be funded by that sign-in until you connect it again with [`stacktape ai connect`](/cli/ai-connect). A run already running is not affected; a queued run funded by it fails without starting.

Your own CLI's sign-in on your machine stays as it is.

## Usage

```bash
stacktape ai disconnect
stacktape ai disconnect grok
```

A non-interactive run must pass the provider. The command needs a valid API key for your own user. Removing a sign-in that is not connected succeeds and changes nothing.

## Options


## CLI Options: `stacktape ai disconnect`

| Option | Required | Type | Description | Values |
| --- | --- | --- | --- | --- |
| `--ai-provider (positional 1)` | no | `string` | AI Provider — The AI provider whose subscription to connect for hosted incident runs, and so the coding agent those runs use: `claude` (a Claude subscription for Claude Code, through `claude setup-token`), `codex` (a ChatGPT plan for Codex, from `codex login`), `grok` (a Grok sign-in, from `grok login`) or `opencode` (what OpenCode is signed in to, from `opencode auth login`). When omitted in a terminal, the command asks which provider to use; a non-interactive run must pass it. | `claude`, `codex`, `grok`, `opencode` |
| `-h, --help` | no | `string` | Show Help — If provided, the command will not execute and will instead print help information. | - |
| `--log-level` | no | `string` | Log Level — The level of logs to print to the console. • `info`: Basic information about the operation. • `error`: Only errors. • `debug`: Detailed information for debugging. | `info`, `debug`, `error` |
| `--quiet` | no | `boolean` | Quiet — Hide progress, banners, success messages and hints. Command output, warnings and errors are still printed. | - |
