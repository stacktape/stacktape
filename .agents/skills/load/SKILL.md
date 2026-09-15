---
name: load
description: >-
  Load context from an earlier Claude Code or Codex session, selected by conversation name or recency. Explicit
  invocation only: `/load` in Claude Code, `$load` in Codex. Never trigger this from ordinary wording such as "load" or
  "continue".
disable-model-invocation: true
---

# Load context from earlier sessions

Both tools keep every conversation on disk: Claude Code as `~/.claude/projects/<project>/<id>.jsonl`, Codex as
`~/.codex/sessions/**/rollout-*.jsonl` indexed by `~/.codex/state_5.sqlite`. The script in this skill reads both,
including the other OS side of a WSL setup, and writes an extraction to a file that you then read.

## Invocation

The user invokes this skill explicitly, with everything after the command as arguments. In Claude Code they arrive as
`$ARGUMENTS`; in Codex they are the rest of the message after `$load`.

```text
/load <selector>[, <selector>...] [tactic] [--query TEXT]
```

Arguments for this invocation: `$ARGUMENTS`

- `/load Security navigation section` loads the session whose title contains that name.
- `/load codex:0` loads the newest Codex thread; `/load -1` the second-newest session from either tool.
- `/load Security navigation section, codex:0` loads two sessions into one file.
- `/load website redesign actions` uses the `actions` tactic; a trailing word that names a tactic is the tactic,
  everything before it is the selector. `/load website redesign search --query trivy` searches.
- `/load` with no arguments: run `list`, show the newest ten sessions, and ask which one to load.

Treat the arguments as a conversation name unless they are an index, a `tool:` prefixed selector, a session id, or a
path. Do not run this skill when it was not invoked by name.

Run every command from the repository root with Bun:

```sh
bun .agents/skills/load/scripts/load-context.ts list [--tool claude|codex|all] [--limit N] [--all-projects]
bun .agents/skills/load/scripts/load-context.ts extract SELECTOR... [--tactic TACTIC] [options]
```

## Selectors

`[claude:|codex:]<index | title substring | session id | transcript path>`

- `0` is the newest session, `-1` the one before, and so on. A bare index counts across both tools; `claude:0` or
  `codex:-1` counts within one tool. The current session is excluded when the tool exposes its id.
- A name matches a title case-insensitively, first as a substring, then as a set of words in any order. Claude titles
  are the session name or AI title; Codex titles are the thread name or the first prompt. An ambiguous name prints the
  candidates; pick one by index.
- Sessions are filtered to the current project directory name. Pass `--all-projects` to widen.

## Tactics

| Tactic     | What it loads                                          | Use when                                                       |
| ---------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| `messages` | User and assistant text only (default)                 | Design and decision conversations; the dialogue is the content |
| `actions`  | Messages plus one line per tool call (files, commands) | Continuing coding work; combine with `git diff`                |
| `full`     | Messages, tool calls, and truncated tool results       | Debugging sessions where evidence in outputs matters           |
| `summary`  | The tool's own compaction summaries                    | Free and fast, only exists if the session compacted            |
| `search`   | Snippets around `--query` hits across all text         | You need one fact from a large session                         |
| `handoff`  | Asks the old session to write a handoff (runs its CLI) | Best quality per token; costs one full pass of the old session |

Useful options: `--last-turns N` keeps only the last N user turns. `--max-result-chars N` bounds each result in `full`.
`--query TEXT` is a substring or regex for `search`. `--prompt TEXT` replaces the handoff prompt. `--stdout` prints
instead of writing a file.

## Procedure

1. If the user named a session loosely, run `list` first and confirm the match by index.
2. Run `extract`. It prints the output path and the size in characters and approximate tokens.
3. Read the file. For a large file, read it in parts and stop when you have what the task needs.
4. Tell the user in a few lines which session and tactic you loaded and the size. Do not paste the file back.
5. Continue the user's task with that context.

Pick the tactic from the session type when the user does not choose one: `messages` for discussions, `actions` for
coding sessions, `search` when the user wants a specific fact. Suggest `handoff` for a very large session and say that
it reprocesses the whole session once through the tool's CLI, which costs money and takes minutes. Codex handoff runs
with a read-only sandbox; Claude handoff runs with tools disabled.

## Caveats

- Transcript formats are internal to both tools and change between releases. If the script prints a parse warning or an
  empty extraction, say so instead of guessing.
- Codex stores compaction summaries encrypted. The `summary` tactic shows only the plain messages Codex kept.
- Codex cannot resume some older threads (`list_turns is not supported yet`, Codex issue #37754). The script reports it;
  fall back to `messages`, `actions` or `full` for those threads.
- The handoff turn is appended to the old session's transcript, so it is visible when that session is resumed.
- Transcripts can contain secrets from tool output. Extractions go to the temp directory; never commit them or paste raw
  tool output into a shared place.
- Numbers from `list` are transcript size divided by four and overstate what a tactic loads.
