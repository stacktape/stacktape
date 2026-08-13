# Floci feasibility spike

This is a provider baseline, not a Stacktape end-to-end test and not part of `pnpm check`.

It starts Floci with a private Docker volume and random loopback port, then exercises a two-resource CloudFormation
stack. The clients use explicit dummy credentials and the loopback endpoint. The script never reads the normal AWS
credential chain. It does not mount the Docker socket.

```sh
pnpm --filter @stacktape/cli run test:floci:feasibility
```

Docker pulls the exact multi-platform image
`floci/floci:1.5.34@sha256:b3b3a70a294b8ba8095385b8571ea1e4d44d494950d98de5e812cd9de02f506b`. Version 1.5.34 remains
Floci's latest published release as of the verification date below. The test uses a unique container, volume and stack
name and removes the container and volume even when startup or an assertion fails. Failed-stack deletion is best-effort
and bounded to two seconds; nested cleanup then removes the container and its private volume even if the emulator
request hangs.

## Result, reverified on 2026-08-03

Floci is useful enough to investigate further, but this version is not ready to own Stacktape's CloudFormation lifecycle
tests.

| Capability                                       | Result |
| ------------------------------------------------ | ------ |
| CloudFormation creates real S3 and SQS resources | Pass   |
| Reject stub physical IDs                         | Pass   |
| S3 put/get                                       | Pass   |
| SQS send/receive/delete                          | Pass   |
| Identical update is recognized as a no-op        | Fail   |
| SQS property update reaches the data plane       | Fail   |
| Stack and data survive a persistent-mode restart | Pass   |
| Delete removes the stack record                  | Pass   |
| Delete removes the physical S3 and SQS resources | Fail   |

The command deliberately exits with code `2` while a required capability is missing. Its JSON output is the concise
machine-readable result. [`resource-manifest.json`](./resource-manifest.json) records the two classified resource types
and the complete capability/operation inventory exercised by this baseline. The script records every inventoried
capability and rejects drift between the observed result and its `pass` or `known-failure` classification.

This baseline intentionally uses a small direct CloudFormation template. It isolates emulator behavior before
Stacktape-specific integration and therefore does **not** prove config loading, synthesis, packaging, deployment
artifact upload, Console authorization, CLI orchestration or event rendering. Stacktape `deploy` also performs a
subscription check, and normal artifact upload may select the AWS S3 acceleration endpoint. A future full harness must
deliberately address those paths; merely setting `AWS_ENDPOINT_URL` is not sufficient proof of isolation.

Do not promote Floci to a pull-request gate until at least no-op/update/delete fidelity is fixed and this probe exits
zero. At that point the next spike should deploy a Stacktape-synthesized certified subset and add data-plane assertions
for every resource in its manifest.
