# Agentic MCP Feature — Implementation Plan

## Goal

Ship a **local Stacktape MCP server** and redesign `--agent` CLI mode so coding agents (Claude Code, OpenCode, Cursor,
Copilot, etc.) can:

1. Learn Stacktape config/commands quickly (token-efficient docs retrieval).
2. Execute Stacktape workflows reliably (deploy, dev, debug) via MCP tools.

## Key decisions made (with reasoning)

### Local MCP, not remote

- Stacktape CLI already exists on user machines and is on PATH.
- Deploy/dev/debug need local repo + local AWS credentials.
- Local MCP friction is low when binary is pre-installed (just client config).
- Remote MCP would add infra to manage and still can't run local commands.

### Few tools with operation enums (not many tools)

- Coding agents work better with small tool surfaces.
- Operation enums inside tools keep count low while covering many commands.
- Tools are role-separated: docs vs mutating-ops vs dev-lifecycle vs read-only-diagnostics.

### Lexical docs retrieval only (no embeddings/RAG in v1)

- Primary callers are strong LLMs (Claude Opus, GPT-5.3-Codex) that generate precise keyword queries.
- Lexical + heuristics (BM25, synonym expansion, field boosts) handles 90%+ of queries well.
- Avoids embedding infra/cost/complexity.
- Semantic rerank can be added later if real failure rate is high.

### TypeScript-first config reference (not JSON schema)

- LLMs work better with TypeScript definitions than JSON schema.
- Stacktape already has rich JSDoc-documented `.d.ts` files per resource.
- These are the canonical source for config reference docs.

### Clean break on `--agent` mode (no backward compatibility needed)

- Nobody depends on current `--agent` output format yet.
- Redesign as strict machine mode: NDJSON event stream + final result envelope.
- Keep `tty` (human) and `plain` (CI/nonTTY) renderers separate and untouched.

### 5 doc types for AI corpus

- `config-ref`: generated from TypeScript type definitions (primary)
- `recipe`: task-oriented config snippets (semi-generated from curated docs + starters)
- `concept`: mental models like directives, stages, connectTo (manual/curated)
- `troubleshooting`: symptom → diagnosis → fix patterns (manual/curated)
- `getting-started`: orientation prose (manual/curated)
- CLI reference is kept as low-priority supporting corpus (since MCP is primary action path).

### Discoverability via tool descriptions (no separate detect tool)

- MCP tool descriptions explicitly state trigger conditions:
  - user mentions Stacktape
  - user mentions AWS/deploy/infra
  - repo has `stacktape.ts|yml|yaml`
- No custom protocol or dedicated detect tool needed.

## Phases

| Phase | File                     | Summary                                                            |
| ----- | ------------------------ | ------------------------------------------------------------------ |
| 0     | [Phase0.md](./Phase0.md) | Contracts: tool API shapes, NDJSON schema, error codes             |
| 1     | [Phase1.md](./Phase1.md) | AI docs corpus generation + local lexical index                    |
| 2     | [Phase2.md](./Phase2.md) | MCP server: `stacktape_docs` tool                                  |
| 3     | [Phase3.md](./Phase3.md) | CLI `--agent` NDJSON machine output                                |
| 4     | [Phase4.md](./Phase4.md) | MCP server: `stacktape_ops`, `stacktape_dev`, `stacktape_diagnose` |
| 5     | [Phase5.md](./Phase5.md) | Install UX, discoverability, validation                            |

## Acceptance criteria (MVP)

- Agent can answer Stacktape config questions from local docs with citations.
- Agent can run preview/deploy/delete without parsing plain terminal logs.
- Agent can control dev lifecycle end-to-end through MCP tools.
- Tool count remains small and role-separated.
- No remote infra dependency in v1.
