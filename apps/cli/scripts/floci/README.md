# Floci feasibility probe

This optional Docker test measures Floci's CloudFormation fidelity; it is not a Stacktape end-to-end test and is not
part of `pnpm check`.

```sh
pnpm --filter @stacktape/cli run test:floci:feasibility
```

The probe uses pinned image bytes, dummy credentials, a random loopback port and a private volume. It creates S3 and SQS
resources, exercises their data planes, restarts the emulator, updates the stack and cleans the container and volume.

`resource-manifest.json` records expected passes and known failures. The command exits `2` while required CloudFormation
no-op, update or delete behavior is missing. Do not promote it to a normal test lane until the manifest has no required
known failures; an emulator stack reaching `CREATE_COMPLETE` is not enough.
