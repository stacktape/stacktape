# AWS read-only operations

This package owns the reviewed read-only AWS operation catalog (`operations`) and the executor that sends one catalog
operation by name (`executor`). Two consumers rely on it as their only guard: the CLI's `aws:call` (and the dev agent's
`/aws/sdk` endpoint), which may sign with a person's own AWS credentials, and the Console's hosted incident runs, whose
agent calls `aws_call` and gets it executed with the organization's connected-account role. An operation outside the
catalog must never reach AWS, whoever asks.

- Keep the catalog default-deny: add an operation only after reviewing that it returns information and changes nothing
  an observer would notice. Record why in `operations.ts` when a read-looking name is left out.
- Refusals use `describeAwsCallRefusal`, so the CLI and the hosted agent say the same thing.
- Keep explicit subpath exports; do not add a barrel. The package imports no application code.
- `fixtures/loopback-aws-endpoint` is a loopback AWS endpoint for tests that send real SDK requests through the
  executor; only test files import it.
- The executor loads a service's SDK client only when that service is called.
