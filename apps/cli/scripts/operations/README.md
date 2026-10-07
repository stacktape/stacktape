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

Run `pnpm --filter @stacktape/cli test:operations:db` for the explicit Docker query lane. It starts PostgreSQL 15.14,
Redis 7.4.5, DynamoDB Local at a pinned digest, and OpenSearch 2.19.3 sequentially. Each container binds a random
loopback port, has a unique `stacktape-j9-query-*` name, and is removed and checked absent in `finally`. It needs Docker
and `openssl`. Set `J9_QUERY_SERVICES=sql,redis,dynamodb,opensearch` to select services. This lane is separate from the
normal test command; it exercises actual database results and independent data-state checks. SQL uses PostgreSQL TLS;
OpenSearch uses an owned trusted TLS proxy. These scenarios establish local query behavior, not AWS IAM enforcement.

Session scenarios place a compiled substitute plugin in the supported `STACKTAPE_TOOLS_DIR` cache. SDK requests,
resource resolution, CLI input, session lifecycle and subprocess cleanup remain real. The plugin records its input in
the disposable working directory. Session scenarios currently omit Windows, whose plugin is bundled outside this cache
boundary.

Deployment-script tests package a real custom-artifact directory, inspect the uploaded ZIP and execute its handler at an
isolated Lambda HTTP boundary. Installed service-helper metadata is supplied separately; that helper never runs.
Remaining-command tests drive read-only AWS calls, validate exported alarm YAML with the canonical config validator,
select a registry module in a PTY, and verify persisted domain/certificate status. Domain tests redirect only IANA's
RDAP bootstrap and the synthetic RDAP origin to loopback HTTP. Their complete discovery responses avoid WHOIS/DNS
fallback. Registry/domain PTY checks omit Windows. These scenarios establish request construction and local effects;
they do not establish AWS permissions, DNS propagation or certificate issuance.
