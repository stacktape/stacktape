# CLI operations process tests

Run `pnpm --filter @stacktape/cli test:operations`. PTY checks need Bun's POSIX terminal support and are omitted on
Windows. The lane builds the current CLI entrypoint once per test file, then runs real commands with fresh working
directories and HOME directories. It needs no Console checkout, credentials or Docker. It is part of the CLI's default
test command.

The child preload installs the existing offline network guard and synthetic AWS credentials. AWS SDK calls and Console
tRPC requests reach scripted loopback endpoints on random ports; unexpected operations fail the scenario. These
responses prove our request construction and output handling, not the external services' behavior. Commands that do not
execute helper Lambdas receive an empty startup artifact inventory.

Fixtures terminate their own CLI processes and tracked scripts, close sockets, and remove temporary files after failure
as well as success. The source bundle lives in an owned temporary directory under this worktree's `node_modules` so its
native OpenTUI modules resolve from the installed dependencies.
