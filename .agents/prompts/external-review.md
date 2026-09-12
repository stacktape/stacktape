# External review

Use this file only when it is explicitly attached. Use the provider the user names; otherwise choose a model family
different from the one that produced the work. One reviewer is the default.

## Five findings that change the workflow

### 1. Blind the first pass

Do not tell the reviewer that the change is good, broken, suspicious, approved, or expected to contain a particular bug.
Give it the original contract and raw scope, not the producer's conclusion or another reviewer's findings. In a
controlled study of 250 CVE/patch pairs across four models, describing changes as bug-free reduced vulnerability
detection by 16–93% while barely changing false positives. [Study](https://arxiv.org/abs/2603.18740)

Ask neutrally:
`Independently determine whether this change violates the stated contract. Do not assume either correctness or a defect.`

### 2. Use compact, targeted context—not diff-only and not a repository dump

Supply the exact diff or commit range, the original specification/invariants, and neutral test results. Let the reviewer
inspect surrounding files, callers, tests, and history on demand. SWE-PRBench found that all eight tested models
degraded as prompts grew from diff-only to richer full-context packages; a structured 2,000-token diff-plus-summary beat
a 2,500-token enriched full-context prompt across every model. Long-context research independently finds that relevant
evidence is often missed in the middle. [SWE-PRBench](https://arxiv.org/abs/2603.26130) ·
[Lost in the Middle](https://arxiv.org/abs/2307.03172)

### 3. Separate discovery from falsification

Pass 1 should find candidate defects. Pass 2 should try to disprove each candidate using the actual source, control
flow, contracts, and safe executable checks. Surface only candidates that survive. A production reviewer at G-Research
produced two or three false positives among eight findings until recall and precision were split into separate calls;
controlled research likewise found executable fix-guided verification substantially reduced over-correction.
[G-Research](https://www.gresearch.com/news/building-a-code-review-tool-the-llm-patterns-that-actually-work/) ·
[Verification study](https://link.springer.com/article/10.1007/s10515-026-00638-5)

Require every surviving finding to contain: exact location, triggering state/input, expected versus actual behavior,
impact, and evidence or a reproduction. Mark anything that could not be verified as uncertain rather than a finding.

### 4. Parallel reviewers must remain independent

If multiple reviewers are justified, give each the same raw task without the others' answers. Do not let them debate and
do not use majority vote as verification. Controlled homogeneous-agent debate showed majority adoption up to 85.5%,
destabilization of previously correct reasoning up to 70%, and consensus voting discarding correct minority answers with
an oracle gap up to 32.3 percentage points. Synthesize afterward by evidence and reproducibility.
[Study](https://arxiv.org/abs/2605.00914)

### 5. A handoff must preserve force, not merely topic

Do not hand over a transcript summary. Give the objective, current artifacts/state, exact validation evidence, and next
action. For every blocker, permission, or prerequisite, preserve four fields explicitly:

- **Prerequisite:** what must be true before proceeding.
- **Authority:** who or what can satisfy or waive it.
- **Fallback:** what to do if it remains unsatisfied.
- **Consequence:** which action is forbidden until then.

In 1,296 controlled handoff episodes, ordinary compression deactivated every blocker and led to forbidden action in
54.2% of cases. Restoring those four fields produced 100% preservation and 0% forbidden action in the tested setting.
[Study](https://arxiv.org/abs/2608.24569)

## Minimal review request

```text
Independently review <exact diff/commit/artifact> against <original contract/invariants>.
Do not assume it is correct or defective and do not use prior reviewer conclusions.
Use the supplied diff/spec as the compact starting context; inspect additional source
only when needed. First identify candidate defects, then try to falsify each one with
the actual code and safe checks. Return only findings that survive verification, with
location, trigger, expected/actual behavior, impact, evidence, and confidence. Put
unverified concerns in a separate section. If none survive, say so.
```

## Local reviewer commands

Use the strongest listed model and highest supported effort unless the user overrides them. Keep the reviewer read-only:
repository-borne prompt injection is a measured risk, with code comments and agent-rule files among the strongest
carriers in RepoGuardBench. [Research](https://github.com/DaoyuanLi2816/RepoGuardBench)

Model references checked on 2026-09-10. Pin the full model identifier when possible; record both the requested
identifier and any documented provider routing. A missing model, expired login, or an old CLI is a failed attempt, not
permission to silently substitute another model. Update an outdated CLI or use an already installed current binary
before retrying. Model availability still depends on the account.

Set `$reviewRequest` to the completed request above, then run one command from the repository root. For long requests,
prefer stdin or a prompt file; Windows has a process argument-length limit.

```powershell
# Codex: GPT-6 Astra / ultra (requires a current CLI)
$reviewRequest | codex exec -m gpt-6-astra -c 'model_reasoning_effort="ultra"' -s read-only --ephemeral -C $PWD.Path -

# Claude: Fable 5.1 / max
$reviewRequest | claude -p --model claude-fable-5-1 --effort max --permission-mode plan --output-format text --no-session-persistence

# Grok: 4.6 / xhigh (its highest supported effort)
grok -p $reviewRequest --model grok-4.6 --reasoning-effort xhigh --agent explore --permission-mode plan --sandbox read-only --cwd $PWD.Path --output-format plain --no-memory --no-subagents

# Antigravity: Gemini 3.8 Flash / high (agy's highest supported effort)
agy -p $reviewRequest --model gemini-3.8-flash-high --effort high --mode plan --sandbox --output-format text --print-timeout 15m

# DeepSeek Harness: V4.1 Flash / max (the patch pins deepseek-flash)
$env:DSH_PERMISSION_MODE = 'read-only'
dsh --profile headless --patch .agents/prompts/external-review.dsh.yml $reviewRequest

# Z.ai GLM: GLM-5.3 / max
$reviewRequest | glm
```

Provider references: [Fable 5.1](https://platform.claude.com/docs/en/models/fable-5-1/overview),
[Antigravity model identifiers and effort](https://www.antigravity.google/docs/cli/headless/),
[DeepSeek V4.1 Flash release](https://deepseek.com/news/deepseek-v4-1-flash/). The DeepSeek release introduces
`deepseek-flash` and documents temporary routing of the older `deepseek-v4-flash` identifier to V4.1 Flash. “Flash 4.1”
here means DeepSeek, not Gemini. GPT-6 Astra and `ultra` were verified against the installed Codex model catalog; Grok
4.6 and GLM-5.3 remain the listed local choices. Check provider availability again when updating this file.

If the user requests independent alternatives rather than a code review, preserve the same method: give every writer the
original task and a neutral evidence packet, keep first passes independent, then run a separate verification pass.
Preserve each original version and attach corrections or uncertainty notes. Record unavailable providers alongside
completed outputs so a missing version is visible.

### Prose generation with a self-contained packet

Claude's `plan` permission mode can return only a plan and wait for an approval tool that does not exist in a headless
session. For an already authorized prose deliverable, supply the complete evidence packet and disable all tools instead:

```powershell
$reviewRequest | claude -p --model claude-fable-5-1 --effort max `
  --permission-mode dontAsk --tools "" --safe-mode --strict-mcp-config `
  --output-format stream-json --verbose --no-session-persistence
```

This invocation completed a full homepage draft with Fable 5.1 at `max`. It cannot read additional repository files or
edit them. Include the relevant instructions and source evidence in the packet, and require the writer to disclose that
scope. Read the final `result` event's `result` field; progress events and exit code 0 alone do not prove that the
requested artifact was returned. A fresh verification call must receive only that writer's draft, its notes and the
source packet.

The local GLM wrapper also uses Claude's plan mode. For the same prose task, the configured Z.ai coding Chat Completions
endpoint completed with `model: glm-5.3`, `reasoning_effort: max`, enabled thinking and no tools. That recovery changed
the transport, not the model or effort. Use the existing provider credentials without placing their values in prompts or
review artifacts. The resulting verification has packet-only scope unless additional source evidence is supplied.

The CLI output is evidence to investigate, not the final verdict. Verify surviving findings locally before presenting
them as confirmed.
