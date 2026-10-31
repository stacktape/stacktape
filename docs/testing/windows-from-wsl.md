# Testing the CLI on Windows from WSL

Use this when a change can behave differently in a native Windows process: paths and drive letters, process trees and
Ctrl+C, consoles and the TUI, the bundled Session Manager plugin, file watching, archives and installers. The helper
builds the CLI from your checkout, copies it to the Windows host and runs it there as `stacktape.exe`. WSL and a native
Windows process are different environments even when they read the same files; a WSL run proves nothing about Windows.

The helper is `apps/cli/scripts/windows-host/windows-host.ts`. Run it from `apps/cli` with `--task <id>`; everything it
creates lives in `C:\stacktape-wsl\<id>` (override with `--root`) and `/tmp/stacktape-windows-host/<id>`.

## Before you start

The host needs PowerShell 7 (`pwsh.exe`), and the AWS CLI for the account check. Containers need Docker Desktop on
Windows; the WSL Docker Engine is a separate daemon that the Windows CLI cannot use. Build the inputs the release build
copies once per worktree:

```sh
pnpm exec turbo run build --filter=@stacktape/init-ui
cd apps/cli
export AWS_PROFILE=stacktape-e2e
bun scripts/windows-host/windows-host.ts doctor --task <id>
```

`doctor` reports the Windows tools, the account of `AWS_PROFILE` as Windows sees it, Docker Desktop, the WSL networking
mode and the task folder. `run`, `exec` and `console` refuse to start unless `AWS_PROFILE` is `stacktape-e2e` (add
`--allow-profile` only for another disposable account), so the Windows CLI never falls back to the default credentials.

## Commands

```sh
bun scripts/windows-host/windows-host.ts build --task <id>                 # about 45 s; --bytecode for the release setting
bun scripts/windows-host/windows-host.ts stage ~/fixtures/app --task <id>  # C:\stacktape-wsl\<id>\projects\app
bun scripts/windows-host/windows-host.ts run --task <id> --cwd app -- deploy --stage <stage> --region eu-north-1
bun scripts/windows-host/windows-host.ts exec --task <id> --cwd app -- npm install
```

- `build` assembles the same folder as the Windows release archive (`buildDistFolder` in `build-dist-package.ts`)
  without zipping it, and copies it to `<task>\cli`. It refuses while a `stacktape.exe` from that folder runs.
- `stage` copies a project with one tar stream. It follows symlinks, because Windows cannot follow symlinks into the WSL
  file system, and leaves out `node_modules`, `.venv` and `__pycache__`: Linux-built dependencies do not run on Windows.
  Install them with `exec` (`--include-node-modules` and `--exclude` change the list).
- `run` starts `stacktape.exe` with piped output and returns its exit code. `exec` runs a Windows command through
  `cmd.exe`. Both pass `AWS_PROFILE`, `AWS_REGION`, `AWS_DEFAULT_REGION`, every `STACKTAPE_*` variable and each
  `--env NAME` through `WSLENV`, and print the names, never the values. `PATH`, `HOME`, `DOCKER_*` and `STP_DEV_MODE`
  are refused: they describe the WSL side.
- Windows programs started from WSL inherit the Windows PATH captured when WSL started, so a tool installed later
  (Docker Desktop on 31 Oct 2026) is missing until `wsl --shutdown`, which stops every agent's session. `run`, `exec`,
  `console` and `doctor` instead give the program the current Machine and User PATH from the registry.
- By default the Windows CLI uses the dev Console with the WSL source CLI's dev login (`pnpm dev:cli login`), passed
  only in its environment. The Windows profile's own login belongs to the owner's production Console, where the test
  account is not connected; `--control-plane user` uses it deliberately.

### A real console

Piped output is not a terminal, so the TUI, prompts and Ctrl+C handling need a console window:

```sh
bun scripts/windows-host/windows-host.ts console --detach --task <id> --cwd app -- dev --stage <stage> --region eu-north-1 --resources all
bun scripts/windows-host/windows-host.ts screen --task <id>      # the window's text
bun scripts/windows-host/windows-host.ts ctrl-c --task <id>      # or: close (the window's X)
bun scripts/windows-host/windows-host.ts wait --task <id>        # exits with the program's exit code
```

`console` opens one classic `conhost.exe` window (never a Windows Terminal tab) and records the program's PID and exit
code in `<task>\logs\console.json`. It refuses to open a second window for the task while the first program runs; the
owner may be using the machine, so close what you open. Use it for commands that keep running: a program that exits
within a few hundred milliseconds may finish before its PID is recorded.

`ctrl-c` attaches to the program's console and raises Ctrl+C there, exactly as a key press would: every process in that
console receives it and no other console does. It also works for a `run` process, which has its own hidden console.
`close` asks the window to close, which Windows delivers as `CTRL_CLOSE_EVENT` and follows with termination after 5
seconds. Without `--pid`, both target the recorded console program, or the only running CLI of the task.

### Processes and cleanup

```sh
bun scripts/windows-host/windows-host.ts ps --task <id>        # everything started from the task folder, with descendants
bun scripts/windows-host/windows-host.ts kill --task <id>      # taskkill /t /f per tree, then verifies none remain
bun scripts/windows-host/windows-host.ts cleanup --task <id>   # kill, delete both folders, verify
```

A forced kill is a crash: Stacktape cleans up nothing, and AWS keeps the SSM session open until its idle timeout. The
next `stacktape dev` of the stage replaces it. After a test that ends with `kill`, list the sessions with
`aws ssm describe-sessions --state Active` and terminate the ones your run opened. Delete stacks and the dev network
with the Windows CLI, then verify them in AWS as [Live AWS testing](live-aws.md) requires.

## A dev-mode check

The order below covers what Windows changes in dev mode. Without Docker on Windows, a function with
`joinDefaultVpc: true` still uses the dev network, the dev box and the SSM session; local databases need Docker Desktop.

1. `STACKTAPE_DEV_NETWORK_SUFFIX=<id>` isolates the dev network.
   `run ... -- dev --agent --stage <stage> --region eu-north-1 --resources all --watch` returns once the agent is ready
   (about 4 minutes when it creates the network, 7 seconds afterwards).
2. Invoke the function from WSL with the AWS CLI. Edit the source in the Windows copy (`/mnt/c/...`): the Windows file
   watcher sees edits made from WSL, and the next invocation runs the new code within seconds.
3. Query status through `stacktape mcp` on Windows: start it with `run --cwd <project> -- mcp` and write JSON-RPC to its
   standard input.
4. `run ... -- dev stop --stage <stage>`, then `ps` shows no process and `aws ssm describe-sessions --state Active` no
   session of the run. Repeat in a `console` with `ctrl-c` and with `close`.

## Pitfalls

- **Working directory.** A Windows program started from a Linux directory gets a `\\wsl.localhost\...` working
  directory; `cmd.exe` refuses it and falls back to `C:\Windows`. The helper starts Windows programs from `/mnt/c`.
- **Parent `package.json`.** `C:\Temp\package.json` on this machine declares `"type": "module"`, which changes how
  Windows Node loads every `.js` file below it. Keep fixtures where no parent folder has a `package.json` or a Git
  repository; `doctor` checks the default root.
- **Localhost.** With the current NAT networking, Windows reaches services listening on WSL's localhost, but WSL cannot
  reach services bound to Windows' `127.0.0.1`. The dev agent API, local frontends and OAuth callbacks of the Windows
  CLI must be called from Windows (`exec -- curl.exe ...`), and browser checks of them run on Windows. Mirrored
  networking would remove this; it changes `.wslconfig` for every agent, so ask the owner first.
- **Arguments.** WSL quotes the arguments of a directly started `.exe` correctly (spaces, quotes, trailing backslashes,
  `%` and `&` arrive unchanged). `cmd.exe /c` parses its command line again, so `exec` suits ordinary commands, not
  arguments with quotes.
- **Signals.** `kill -INT` on the WSL side terminates the Windows process without running its handlers; use `ctrl-c`. Do
  not `child.kill()` a Windows child from code under test either: it can raise Ctrl+C for the whole console.
- **Defender.** Real-time monitoring is off on this host. Even so, never put a download-and-run command
  (`iwr ... | iex`) on a `powershell.exe` command line; run installer scripts from a file.
- **Speed.** Build on Linux and copy once: the release folder copies in about 5 seconds as one tar stream. Running a
  Linux build tool against `/mnt/c` is many times slower than either side on its own disk.
