# ai:connect

The `stacktape ai:connect` command connects your own AI subscription to Stacktape for the hosted AI incident runs you request ([Investigate with AI and Fix with AI](/observability/incident-ai)). It first asks which provider to connect (unless you pass `--aiProvider`) and explains what will happen, then waits for your confirmation. For Claude, it runs `claude setup-token` for you, which signs you in to Claude in your browser and prints a long-lived token, and stores that token with Stacktape under your user and the organization of your API key. The token is never printed by Stacktape. Only runs you request use it.

## Usage

```bash
stacktape ai:connect
```

This command needs a valid API key for your own user (run [`stacktape login`](/cli/login) first), an interactive terminal, and the [Claude Code CLI](https://code.claude.com/docs/en/setup) on your `PATH`. Without the Claude Code CLI it stops and tells you how to install it.

On Linux and macOS the sign-in runs inside a recorded pseudo-terminal, so the token is captured for you. On Windows the sign-in runs on your terminal and you paste the token it printed when asked.

## What it connects

- **Your subscription, for your runs.** A run you fund with **Your Claude subscription** on an incident page uses this token. One member's token never funds another member's run, and Stacktape never switches a run to the organization's Anthropic API key.
- **Your organization only.** The token is stored for the organization of the API key you are logged in with. Run the command again after switching organizations to connect it there too.
- **Replaceable.** Running the command again replaces the token. Remove it with [`stacktape ai:disconnect`](/cli/ai-disconnect).

The subscription is your own arrangement with Anthropic, under Anthropic's terms. Stacktape does not check the plan or promise that its limits cover a run; a run whose token is expired or out of quota fails and says so.

You can also connect the token on an incident page in the Stacktape Console, in the dialog that starts a run. An Admin or Owner can instead connect the organization's Anthropic API key there, for the whole organization.

## Flags reference

| Flag | Description |
|---|---|
| `--aiProvider` | The provider whose subscription to connect. Currently `claude`. When omitted in a terminal, the command asks; a non-interactive run must pass it. |
| `--outputFormat` | `jsonl`, `plain` or `tty`. Auto-detected when omitted. |
| `--logLevel` | Log verbosity. |
