# Runtime acceptance and diagnosis

Use the sections relevant to the changed boundary. These are lessons from Console, provider and EC2 acceptance, not an
additional test suite to run for every change. Follow [the testing policy](../../../../docs/testing.md) for permissions,
reservation and live-resource ownership. Read provider setup details through
[console-development](../../console-development/SKILL.md) instead of inferring registration settings from source.

## Establish what actually ran

Record the checkout or uncommitted revision, local/deployed API target, and relevant artifact or AMI identity. For
process/runtime failures, include the host environment and tool versions that affect the result; WSL execution and a
native Windows process are different environments even when they access the same checkout.

- **Browser:** observe the actual request origin and effective authentication identifiers before supplying test
  credentials. A localhost string in a bundle does not prove the browser uses localhost: Console's `STP_INJECTED_ENV`
  can override bundled `import.meta.env` values. Check the loaded runtime configuration and network request before
  changing a build or its environment files. Use the documented
  [agent browser access](../../../../apps/console/e2e/README.md#agent-browser-access) before handing Console clicks to
  the owner. Match the fixture role to the scenario; a restricted Developer cannot qualify Admin actions. Console and
  external-provider sessions are separate. After changing browser projects, run the real failure privacy qualifier; a
  project selected by array position can silently inherit another project's artifact settings.
- **Hosted app UI:** serve the built artifact beneath the provider's resource path and verify JavaScript, CSS and an
  interactive action in a browser. A root-mounted preview can hide broken absolute asset URLs; Forge Custom UI requires
  relative URLs. A substituted host bridge can qualify asset loading and local UI behavior, but the installed provider
  page and real pairing still need separate acceptance. Inspect the visible page or failed requests before attributing
  every blank page to the same packaging defect.
- **Provider callback:** trace the start origin, provider redirect destination and API handling the return. Installation
  setup URLs and OAuth callback URLs are distinct provider settings; changing one may not fix the other. Verify the
  non-secret registration settings against current provider documentation. Use the existing sign-in helpers and
  credential source; ask the owner for approval clicks when needed, never callback URLs containing codes.
- **Lambda or container:** when packaging, layers or startup configuration changed, run the assembled artifact in its
  target runtime. Inspect deployed configuration if AWS-specific composition matters. A Console worker deployed with
  only a custom Git layer once failed to import its shared chunks because a raw `Layers` override replaced the generated
  layer list. Local imports and the repository gate could not detect that deployed configuration error.
- **Gateway request format:** inspect the effective integration payload version and exercise that event shape through
  the handler. HTTP API payload 1.0 uses `path`; payload 2.0 uses `rawPath`. A fabricated V2 fixture once hid a deployed
  Bitbucket handler returning 404 after successful authentication. A missing-auth probe cannot qualify routing because
  it exits before that code. Check the response status and intended side effect even when Lambda reports no errors.

For credential storage and refresh, check each worker's runtime environment, parameter map and IAM access. Include
non-secret selectors such as `STAGE`: it determines the credential namespace and Console origin. Pass the
infrastructure's environment into a real consumer in a fresh process; independently setting `STAGE=dev` in a mocked test
can hide its absence from the deployed Lambda. A successful OAuth callback or API refresh does not prove the maintenance
worker receives the same client configuration. Exercise missing/incorrect app credentials separately from a revoked user
grant; an HTTP 400 or 401 alone cannot distinguish them. A dev maintenance worker once disabled a valid GitLab
connection because its OAuth client secret was omitted.

A startup probe can narrow a failure before an expensive journey. For example, an empty SQS batch is safe only after
checking that the handler treats it as a no-op; some worker invocations trigger reconciliation. Successful startup does
not prove a real job, its side effects, or cancellation.

Before manually invoking a scheduled handler, inspect all of its effects. Console's daily maintenance also changes
subscriptions and sends email/Slack messages. Test its credential service independently when those other actions are
outside the task's authorization, and state which deployed-handler boundary remains unqualified.

If a previously healthy browser session starts failing on database reads, check the owned database tunnel before
changing authentication or provider code. An SSM idle timeout can close the tunnel while a wrapper process remains
alive. Qualify tunnel supervision by closing only the recorded task-owned session and verifying the local API, UI,
container and listeners stop; server-start success alone does not prove this lifetime behavior.

A running local API can still contain the previous build. After editing API code, confirm that a rebuild/restart
completed before attributing a failed acceptance check to the new code. Restart full local mode when its reload status
is uncertain; the request origin alone identifies the server, not its loaded revision.

Wait for the dev CloudFormation update to finish before starting full local mode. The launcher rejects
`UPDATE_IN_PROGRESS` even after packaging and artifact uploads have finished.

For agent startup failures, distinguish the original credential error from a later fallback error. Check the actual
instance-profile ID, not only its name or ARN; a replacement can reuse the name. IAM global CloudTrail events may need
to be queried in `us-east-1` even when the instance runs elsewhere. Check the agent's applicable retry behavior:
access-denied backoff can differ substantially from ordinary transient-error backoff. An EC2 reboot request does not
prove that reboot has finished, and SSM can briefly retain an old `Online` status. Qualify the power transition and a
fresh heartbeat before treating recovery as complete. A failed discovery API request is not evidence that an instance is
unhealthy and should be replaced. When inspecting logs from a baked AMI, separate image-build and earlier-boot entries
from the current failure.

Controlled failures can still cross a real boundary. For a generated script, execute the complete script with real Bash,
user changes, permissions and cleanup traps while substituting external AWS/workload executables. For a provider
adapter, use the real SDK against loopback HTTP with realistic error responses. Name the substituted dependencies; these
tests prove process/error handling, while actual SSM/IAM or provider authorization still need live evidence when
affected. For Console EC2 work, reuse the
[runner qualification lanes](../../../../apps/console/e2e/README.md#ec2-runner-qualification) and their documented
coverage before creating another harness.

## Follow the same operation through every boundary

For credential-backed connections, include access after the short-lived credential expires. Exercise discovery as well
as the refresh helper: filtering an expired connection out of a repository query can prevent refresh from running at
all. When approval and account selection are separate steps, check cancellation and retry after a lost response, and
verify that cleanup of the pending approval preserves credentials transferred to the completed connection.

For a migration that retires an integration, seed both obsolete and current records with dependent project bindings. Run
the actual migration and assert the surviving identities, detached links and removed fields. A schema-only test cannot
establish which customer data the migration preserves. Exercise adoption separately when migration history may be
missing; replay predicates cannot use columns that have already been dropped.

Identify the intended organization, connection, repository and event by stable IDs as well as readable labels. Existing
connections can coexist with a new one. Do not let a test pass against the first matching row or an older installation.
After connecting, reload through the real API and check repository access through the newly verified connection.

For an asynchronous provider journey, collect the evidence relevant to the operation:

| Boundary           | Useful evidence                                                                                                                                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider delivery  | Exact delivery ID, event/action, intended installation/repository, delivery time and response status. Preserve large provider IDs as strings or BigInts; do not round them through JavaScript numbers.                      |
| Ingress and worker | Correlate that delivery with the accepted request and worker execution. HTTP 202 proves acceptance, not worker completion; HTTP 207 may contain a failed tRPC procedure.                                                    |
| Durable outcome    | Read the delivery/job record and the expected application result through the API/database. A processed event that schedules no work proves delivery handling, not a deployment.                                             |
| Duplicate or retry | Replay only an identified, task-authorized event. Verify the repeat reached the consumer, then assert one durable result and no repeated side effects; an unchanged database row alone could mean the repeat never arrived. |

Prefer the provider's real redelivery mechanism when testing provider retries. Confirm the event's identity and effect
before replaying it; do not replay the latest event across a shared App indiscriminately. Replaying an event after
fixing a worker does not remove earlier failed messages from the queue. Account for visibility timeouts and automatic
retries when checking the result and deciding what can be cleaned up.

Log and event APIs can return an empty page with a continuation token. Follow pagination before concluding that an
operation or marker is missing. Keep branch names intact when correlating events; `feature/fix` is one branch name.

Also allow for visibility delay after a successful write. For CloudWatch ingestion, an immediately empty read is not
proof of lost logs. Poll within a recorded deadline, follow pagination, and assert the complete expected event set. When
testing log batching, include UTF-8 byte size and backwards wall-clock adjustments, not just event count. Keep clock
injection local to the fixture; never change the machine clock.

For a changed lifecycle, observe the actual state transition promised to the user. A cancellation API accepting the
request is not proof the workload stopped. Terminating the instance afterward proves termination cleanup, not timely
cancellation or release of the database lease. Likewise, Docker responding to `info` does not prove container
networking, and a CLI version check does not prove deployment behavior.

If cancellation intentionally retires the runner, observe the backend's termination and ownership release within the
acceptance deadline. Distinguish that result from an instance terminated by the test's final cleanup. For CLI
monitoring, check the actual stdout logs and final result as well as the backend status; start observers before
dispatch.

## Diagnose the failed boundary before changing code

Separate product defects, missing provider configuration, stale deployed revisions and test-harness mistakes. State an
unconfirmed cause as a hypothesis, then run the smallest check that distinguishes it from the alternatives.

Compare provider validation failures with the actual delivered payload and current provider documentation. Privacy
settings can change optional metadata: GitLab sends `[REDACTED]` for a private email, which once caused an otherwise
valid push to fail validation. Add a sanitized regression for the observed shape; do not copy raw authenticated delivery
data into committed fixtures. Continue validating the repository, action and commit that determine what work is
authorized.

Check the product-specific delivery shape separately from a provider's general remote-invocation examples. Bitbucket
Forge delivered a product event directly at the request root, while a general Forge Remote retry example showed a
`payload` wrapper. A test copied from that example rejected every real push. For rejected events, record schema paths
and the presence of known envelope fields without their values, then add a sanitized regression for the observed
request. Exercise the serialized request through ingress as well as the normalizer, including workspace mismatch and
stable identity when retry metadata changes.

Follow provider identities all the way to execution. Bitbucket pull-request events and REST responses can abbreviate
commit hashes even when the runner requires a full immutable SHA. Resolve the commit through the authenticated provider
API and test that the full identity reaches the queued operation; do not relax the runner's validation to make a fixture
pass. Exercise a different source repository, missing source identity and a stale event as denial cases before allowing
preview code to use project credentials. Preserve cleanup for previously created previews when the source is deleted.

For browser failures, use user-visible assertions for outcomes. If a helper intentionally uses a hidden readiness
marker, check DOM attachment rather than visibility. For shell/SSM failures, verify the working directory, execution
user, environment and exit status: an inaccessible SSM working directory can fail a CLI smoke probe before it tests the
CLI. Fix the harness and rerun the assertion; do not weaken the intended success condition or change production code to
accommodate a test mistake.

Record the first useful error and the operation identity without dumping credentials, callback query strings,
authenticated SDK request objects or private artifact download URLs. Reuse existing helpers where possible. A short
ad-hoc probe is useful for diagnosis; recurring acceptance checks belong in the existing scenario runner with its
ownership, timeout and cleanup handling, rather than a collection of copied shell sessions.

## Verify cleanup separately from success

Keep exact IDs for task-created instances, disks, containers, processes, temporary tokens and event payloads. Verify
their removal or revocation where applicable, including after a failed attempt. A stopped launcher does not prove its UI
child, container or tunnel exited; check the owned processes and listeners. Never kill an unidentified process just
because it occupies the expected port.

Inspect process IDs and executable names without dumping command arguments or environment variables, for example
`ps -p <owned-pids> -o pid,ppid,comm`. The SSM session-manager plugin receives its temporary session token in an
argument, so broad `ps ... args` output can expose credentials even when application logs are sanitized. Verify tunnel
closure through its owned listener and AWS session status without printing the session response.

A processed or deduplicated event can still leave a payload behind. Lifecycle expiration is deferred cleanup, not
evidence of immediate deletion. Remove only identified test-owned payloads through an appropriate cleanup path; retain
anything required by an in-flight operation or queued retry. Preserve reusable fixtures and unrelated connections. Hold
the reservation until outstanding live operations and owned cleanup finish, then record its release. If cleanup is
incomplete, leave exact recovery information and mark that boundary unqualified.
