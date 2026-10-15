# ai:disconnect

The `stacktape ai:disconnect` command removes your own sign-in with one AI provider from Stacktape, in the organization of your API key. It asks which provider to disconnect unless you pass `--aiProvider`. Hosted AI incident runs you request can no longer be funded by that sign-in until you connect it again with [`stacktape ai:connect`](/cli/ai-connect). A run already running is not affected; a queued run funded by it fails without starting.

Your own CLI's sign-in on your machine stays as it is.

## Usage

```bash
stacktape ai:disconnect
stacktape ai:disconnect --aiProvider grok
```

This command needs a valid API key for your own user. Removing a sign-in that is not connected succeeds and changes nothing.

## Flags reference

| Flag | Description |
|---|---|
| `--aiProvider` | The provider whose sign-in to disconnect: `claude`, `codex`, `grok` or `opencode`. When omitted in a terminal, the command asks; a non-interactive run must pass it. |
| `--outputFormat` | `jsonl`, `plain` or `tty`. Auto-detected when omitted. |
| `--logLevel` | Log verbosity. |
