# Agent-instruction audit

The v4 instructions are a rewrite, not an edit of the legacy files. Old guidance describes the repository before the
monorepo, assumes human-oriented workflows, and in places embeds environment-specific credentials. It must not be
copied into the fresh history.

## Existing public instructions

The public repository currently has a `CLAUDE.md` whose heading calls itself `AGENTS.md`. Useful material includes the
product-specific error model, generated-file ownership, CLI/TUI output conventions, and a few current validation
commands.

Material to retire:

- Bun as the package manager;
- the legacy `src`, `shared`, global-manager, and path-alias map as architectural guidance;
- advice to ignore formatting errors;
- absolute style rules that tooling can enforce more accurately;
- deploy examples as part of a normal validation loop;
- hand-run generation as a prerequisite agents must remember;
- duplicated Claude-specific instruction text.

## Existing private instructions

The private repository's `AGENTS.md` usefully describes the Console as a React UI, tRPC/Fastify API, Prisma database,
background jobs, and Stacktape-deployed AWS application. It also captures Console's current Emotion object-style
convention and the distinction between frontend and backend error reporting.

Material to retire:

- Bun as the package manager;
- sibling-path coupling to `../stacktape`;
- the claim that the project has no tests and that agents should not build the frontend;
- acceptance of pre-existing type/format failures as a permanent workflow;
- commands that can deploy merely as ordinary validation;
- rules tied to the old directory layout rather than owned applications/packages.

`AGENTS_DEV_PLAYBOOK.md` contains useful high-level topology and some read-only diagnostic ideas, but it also contains
personal login material, credential values, production-adjacent endpoints, and commands whose safety depends on
unstated local state. No credential, password, token, user identity, account identifier, or copy-paste authenticated
request from it is copied into v4. Historical cleanup and rotation remain separately deferred; omission from the new
history is mandatory.

## v4 instruction hierarchy

- Public root `AGENTS.md` is authoritative for workspace, architecture, testing, generation, Git/submodule, and safety
  rules.
- Public `CLAUDE.md` contains only `@AGENTS.md`.
- The private repository has a standalone `AGENTS.md` because it must remain usable when cloned by its own CI.
- App/package-local `AGENTS.md` files are added only when a directory has genuinely different commands or invariants.
- Commands live in package scripts and Turbo task descriptions. Instructions explain intent and safety; they do not
  duplicate an ever-growing command catalog.

The target files are in `architecture/v4/templates`. The backbone copies them into their real repository locations and
validates that both public-only and integrated checkouts can follow them exactly.
