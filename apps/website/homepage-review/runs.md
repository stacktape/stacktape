# Independent writing runs

Run date: 10 September 2026. All six providers completed a full page and a separate verification pass. Each provider
received the same original homepage, business documents and neutral evidence packet. No writer received another writer's
answer. Model output was preserved; local corrections are separate from the drafts. The two primary revisions and
captured original are additional review options. These external runs belong to the first round; they were not rerun for
the user's requested second revision.

| Provider  | Model / effort                   | Transport                                              | Result and verification                                                                                                                                                   |
| --------- | -------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OpenAI    | `gpt-6-astra` / `ultra`          | Bundled Codex CLI 0.153.4 in WSL                       | [Page](versions/codex.md), [writer notes](versions/codex-notes.md), [verification](versions/codex-verification.md), [local checks](versions/codex-checks.md).             |
| Anthropic | `claude-fable-5-1` / `max`       | Claude Code, with tools disabled for the writing retry | [Page](versions/fable.md), [writer notes](versions/fable-notes.md), [verification](versions/fable-verification.md), [local checks](versions/fable-checks.md).             |
| xAI       | `grok-4.6` / `xhigh`             | Grok CLI, explore agent and read-only sandbox          | [Page](versions/grok.md), [writer notes](versions/grok-notes.md), [verification](versions/grok-verification.md), [local checks](versions/grok-checks.md).                 |
| Google    | `gemini-3.8-flash-high` / `high` | Antigravity CLI, plan mode and sandbox                 | [Page](versions/gemini.md), [writer notes](versions/gemini-notes.md), [verification](versions/gemini-verification.md), [local checks](versions/gemini-checks.md).         |
| DeepSeek  | V4.1 Flash / `max`               | DeepSeek Harness, read-only mode                       | [Page](versions/deepseek.md), [writer notes](versions/deepseek-notes.md), [verification](versions/deepseek-verification.md), [local checks](versions/deepseek-checks.md). |
| Z.ai      | `glm-5.3` / `max`                | Z.ai coding API, with no tools                         | [Page](versions/glm.md), [writer notes](versions/glm-notes.md), [verification](versions/glm-verification.md), [local checks](versions/glm-checks.md).                     |

The DeepSeek writing call requested `deepseek-v4-flash`. The provider's
[10 September release notice](https://deepseek.com/news/deepseek-v4-1-flash/) explicitly routes that older identifier to
V4.1 Flash. Its separate verification call requested the new `deepseek-flash` identifier directly. Both calls recorded
`max` effort.

## What verification established

Each completed draft received a fresh verification call with only its own page and notes, the original source packet,
and two source corrections concerning incident CLI availability and the security phase for scanning Git history.
Verification was a separate attempt to disprove candidate problems, not a vote between writers.

- **Codex:** the local sandbox could not start file-reading commands. Writing used the full packet. Verification checked
  packet consistency and publicly accessible testimonials/pricing; private implementation and roadmap sources remained
  unavailable. The verification file states that limit.
- **Fable:** the completed writing call used the full packet with all tools disabled and no plan-approval step. Its main
  response reported `claude-fable-5-1` and completed successfully. Its completed verification used only that draft,
  packet and the orchestrator's primary-source corrections.
- **Grok:** writing included repository reads. The first verification stopped after a file-tool error and returned no
  verdict despite exit code 0. A fresh retry reviewed the packet and its own draft; it read only its own prompt file
  because the CLI had stored the long input there. Product-source claims were not rechecked in that retry.
- **Gemini:** writing used the packet. The first verification produced no verdict when a command required an interactive
  permission. A fresh retry used only the packet and its own draft, with no tools, and stated that scope.
- **DeepSeek:** writing and verification used read-only repository access. Its verification includes disputed findings;
  the local checks explain which conclusions survive comparison with primary sources.
- **GLM:** the completed writing call used the self-contained source packet, with no file or execution tools. The coding
  endpoint returned `glm-5.3` and a normal completion. Its completed verification used the packet, its own draft and the
  orchestrator's primary-source corrections.

Provider findings are evidence to inspect. The local checks distinguish confirmed claims, visual ambiguities and
unsupported reviewer conclusions. No draft was tested against a deployed environment, and future-launch copy is not
evidence that its planned capabilities have shipped.

## Initial attempts and recovery

- The older npm Codex CLI 0.147.0 rejected GPT-6 Astra because it required a newer CLI. The installed bundled 0.153.4
  binary completed the same task without changing the model or effort.
- Grok and Antigravity model-list commands reported missing authentication, but their actual writing calls succeeded.
  Neither account was reauthenticated or changed.
- Claude plan mode caused both Fable and GLM to produce plans and request an unavailable approval step instead of the
  authorized prose. Those responses are not counted as completed page versions. Fable's retry disables all tools and
  plan approval; GLM's retry uses the same model and effort through the configured coding API without tools.
- No fallback substituted another model or lowered the requested effort. No credentials or hidden reasoning are included
  in this review package.

Product-source reads by the external CLIs used the Windows checkout at `C:\Projects\stacktape`. The main recommendation
and final local checks use the active workspace. The evidence packet and separate local checks are therefore the shared
reference where checkout state differs.
