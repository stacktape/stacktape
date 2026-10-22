# MiniStack fixture

This package owns the one local AWS emulator the tests use: a pinned `ministackorg/ministack` image started as a
disposable container by `fixture`. Two kinds of consumers rely on it: CLI lanes (the offline deploy loop in
`apps/cli/tests/ministack`, the layer-upload S3 lane and the `cli-process` suite) and the private Console's database
suites. It is a test helper with real consumers, not a general AWS utility area.

- Change the image pin only after qualifying it: the deploy loop and the Console lane that use it must pass, and the
  upgrade notes belong in the handoff, not here.
- Keep the fixture fail-closed. Credentials are synthetic, no profile or shared config is read, only `127.0.0.1`
  endpoints are accepted, and the container's default route is removed before any call so its Lambda workers cannot
  leave the machine.
- One container per run; isolate scenarios inside it with `account()`, which hands out a fresh 12-digit account the
  emulator keys state by. Do not share containers between runs or reuse a name.
- `stop()` removes the container and its volumes and verifies both are gone. A fixture that cannot verify cleanup fails
  the run.
- A run killed before `stop()` (SIGKILL, `timeout`, Ctrl-C) is cleaned up by a detached watchdog that removes the
  containers labelled with the run's ID once the owning process is gone. Keep that label on every container you add.
- The package imports no application code and no AWS SDK at runtime; consumers bring their own clients and pass
  `clientConfig()` to them.
- `emulator/` holds Python the fixture loads into the emulator process for services MiniStack lacks, one file per
  service, opted into per run. Each follows the AWS API reference for the calls Stacktape makes, names its upstream
  issue, and is deleted once a pinned release implements the service.
