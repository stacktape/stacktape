# Contributing to Stacktape

Thanks for helping. This page explains what we accept and how to get a change merged quickly.

## Before you start

- **Bugs:** open an [issue](https://github.com/stacktape/stacktape/issues/new/choose) with steps to reproduce, or send a
  pull request that fixes it with a test that fails without the fix.
- **Features and larger changes:** start a discussion in
  [Ideas](https://github.com/stacktape/stacktape/discussions/categories/ideas) first. We may already have a plan, or the
  change may not fit the product, and we would rather tell you before you write the code.
- **Questions:** ask on [Discord](https://discord.gg/stacktape) or in
  [Q&A](https://github.com/stacktape/stacktape/discussions/categories/q-a).
- **Security problems:** do not open a public issue. Follow the [security policy](SECURITY.md).

## Setting up

The public repository contains the CLI, documentation, init wizard, website, VS Code extension and reusable packages.
`apps/console` is a private Git submodule; everything public installs, tests and builds without it.

Use Node 24.15 or newer within the Node 24 release line, pnpm 11.17.0 and Bun 1.4.4:

```sh
pnpm install --frozen-lockfile
pnpm check:public
```

[Development](docs/development.md) covers running the CLI from source, and [testing](docs/testing.md) explains which
tests to run for a change. The [maintainer documentation](docs/README.md) indexes the rest.

## Pull requests

- Keep one problem per pull request. Unrelated cleanups go in their own pull request.
- Base the branch on the latest `main` and keep it up to date until it merges.
- Fill in the [pull request template](.github/pull_request_template.md): the problem, the change and how you verified
  it. Include a failing-then-passing test for bug fixes, and screenshots for visual changes.
- Do not edit generated files by hand. [Generated files](docs/generated-files.md) lists each file's source.
- Run `pnpm check:public` before asking for a review. CI runs the same gate.

We squash-merge pull requests, so the title becomes the commit message on `main`. Write it as a plain summary of the
change, for example "Keep custom domains when a stage is redeployed".

Code written with AI assistance is welcome. You are responsible for it the same way as for code you typed: understand
it, test it and be ready to explain it in review.

## License

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
