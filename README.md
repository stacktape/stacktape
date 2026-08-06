# Stacktape v4

This branch is the integrated Stacktape v4 monorepo. The public CLI and private Console have been migrated, and the
config, naming, Console API contract, design-token, and packaging capabilities now have concrete package boundaries.
The docs and website are intentionally still small Astro shells. Release publishing and default-branch cutover remain
disabled until their release-readiness gates are complete.

Prerequisites: Node.js 24+, pnpm 11.17.0, and Bun 1.3.14 — the CLI builds, generates and tests with Bun, and
`apps/cli/AGENTS.md` records where that matters.

Public contributors clone and work normally:

```sh
git clone --branch v4/integration https://github.com/stacktape/stacktape.git
cd stacktape
pnpm install --frozen-lockfile
pnpm check:public
```

The explicit branch is temporary while the repository default still points at v3; remove it after the v4 cutover.

Maintainers initialize the optional private Console submodule:

```sh
git submodule update --init apps/console
pnpm install --frozen-lockfile
pnpm check:integrated
```

The public checkout is a first-class supported state. Read the current `AGENTS.md` and the nearest package guidance
before changing package boundaries or migration behavior.

Parallel Codex and Claude Code sessions use their harness-managed worktrees. For work spanning the private Console,
push the reviewed private branch before recording its commit in the public repository:

```sh
git -C apps/console push -u origin HEAD
pnpm console:pointer:verify
```

The verification fails if the private commit exists only inside a disposable harness worktree. Codex or Claude Code
then owns worktree handoff and cleanup.
