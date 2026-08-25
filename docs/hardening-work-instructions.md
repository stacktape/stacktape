# Import and packaging hardening work

Use this playbook when spare agent capacity should improve the number of real applications Stacktape can import,
package, and deploy correctly. The objective is not to accumulate projects. The objective is to find a customer-relevant
behavior Stacktape does not yet handle, reproduce it faithfully, fix the lowest responsible layer, and leave a durable
qualification case plus a focused regression.

Read `docs/project-qualification.md`, the nearest `AGENTS.md`, and the business documents under
`apps/console/documents/business` before choosing work. Preserve unrelated changes and never use real AWS unless the
live-deployment checklist below is satisfied.

## Start with the existing evidence

1. Run `pnpm qualify:projects -- --list` and inspect recent qualification reports supplied with the task or stored as CI
   artifacts. Do not repeat a project type that is already well represented unless testing a new framework/runtime
   version or reproducing a known failure.
2. Check the product working tree and record the starting commit. Qualification fingerprints include dirty changes, so
   reruns after a fix will not be confused with an earlier pass.
3. Choose a bounded batch. With limited capacity, fix or classify one existing failure. With a moderate unused budget,
   add three to eight meaningfully different cases. With a large unused budget, use ten or more cases or shards, but
   still inspect failures as they appear instead of producing an unreadable pile at the end.

## Operate without asking the user to judge routine choices

When the user delegates a remaining model or subscription budget, the coordinating agent owns the campaign. Do not ask
the user to choose projects, decide whether an observed result is correct, rank fixes, or arbitrate normal merge
conflicts. Ask only when work needs authority that was not granted, especially live AWS mutation, publishing, or access
to a private system.

Treat research and generation agents as fast, untrusted workers. They can search broadly, create applications, run
native builds in isolated scratch directories, and propose patches. They do not decide that their own output is correct.
The coordinating agent reviews the exact files and reports, reproduces important claims, and owns every product change.
For risky or wide product changes, assign a separate reviewer the clean commit hash and require a clear `ACCEPT` or
`BLOCK` verdict with failing fixtures. A review of a moving dirty worktree is not evidence.

Use this control loop until the delegated budget is nearly exhausted or the selected coverage area stops producing new
information:

1. Read the current corpus and latest reports. Name one missing customer behavior before searching.
2. Give research workers different source categories or technology areas so they do not return the same popular lists.
3. Verify the chosen source independently: exact commit, license, subdirectory, native instructions, maintenance state,
   and whether it is really an application rather than a library or desktop/mobile project.
4. Run import first. Inspect the generated topology, commands, dependency wiring, questions, gaps, and claims about
   existing hosting. Add exact expectations only after this inspection.
5. Review the pinned source before executing it. Package it inside the qualification sandbox, or use a disposable
   secret-free VM for an unknown source. Run the documented native build when a packaging failure could be upstream.
6. Classify each failure. Fix Stacktape only when the evidence points to Stacktape, add a focused regression, and rerun
   the original case plus neighboring cases.
7. Give an independent reviewer the clean proposed commit. Resolve every blocker and repeat review on the new commit.
8. Promote the case and retain the small manifest/expectation change. Store the full report as an artifact, not in Git.
9. Select the next missing behavior from the updated coverage, rather than asking another worker for an unconstrained
   list of fashionable repositories.

A worker handoff is incomplete unless it contains all of the following:

- exact Stacktape commit and case source commit;
- project provenance and why a likely Stacktape customer would deploy it;
- native build/test command and result;
- qualification command, JSON report path, and reproduction command;
- generated resource topology and any user-visible questions or gaps reviewed;
- failure classification with concrete evidence;
- files changed, focused regressions, and checks run;
- remaining uncertainty, including source trust or license uncertainty.

This separation saves coordinator tokens without lowering the bar: workers spend time searching and iterating, while the
coordinator spends attention on source selection, evidence, architecture, and the final diff.

## Find a meaningful next project

Select an underserved combination of application shape, language/framework, packaging path, dependency, and previous
deployment platform. The likely Stacktape customer is a small startup or agency team building a full-stack or backend
product without a dedicated infrastructure specialist.

Prefer sources in this order:

1. A maintained real open-source application with a documented deploy or self-host path.
2. An official framework starter or an official Vercel, Railway, Render, Fly, Heroku, SST, Serverless, SAM, CDK, or
   cloud-provider example.
3. A real public project that demonstrates the exact missing behavior.
4. A synthetic application created for the missing combination.

For public projects, record the HTTPS repository URL, a full 40-character commit, subdirectory, source category,
license, and why the project matters. Prefer a recent commit whose documented native build still works. Do not treat a
Procfile, Dockerfile, or platform manifest as proof that an application is live today.

When synthesis is necessary, ask the generating agent for a complete deployable application without mentioning
Stacktape. A useful prompt is:

> Create a small but realistic deployable `<language/framework>` application for a startup team. It must include
> `<missing behavior>` and `<dependency/process types>`, production start and build commands, health behavior, an
> example environment file with no real secrets, a lockfile, migrations where relevant, tests, and a README with exact
> native build/run instructions. Do not create a desktop or mobile application and do not add infrastructure for a
> specific target platform unless requested.

Vary the prompt rather than cloning one template. Useful variations include worker plus scheduler, monorepo plus shared
package, native module, generated ORM client, non-root Docker image, CRLF scripts, several process types, build-time
public variables, queue-driven function, or a release migration.

## Add and run the case

Place complete synthetic projects in the separate qualification-corpus repository described in
`docs/project-qualification.md`. Add the case to its versioned manifest. Public real projects normally need only a
manifest entry and remain in the checkout cache.

Run the import contract first. This reads project files but does not execute the project's dependency or build scripts:

```sh
pnpm qualify:projects -- --manifest=<manifest.json> --case=<id> --lanes=import --keep-workdirs
```

Treat newly downloaded project code as untrusted. Packaging can execute lifecycle scripts, framework builds,
Dockerfiles, and arbitrary commands. A lesser-capability worker must not add `--allow-host-project-code` itself. It may
run import-only inspection locally because that lane does not execute project code. Package unknown code on a disposable
cloud VM or hosted runner with no secrets. After an orchestrator reviews a reputable source pinned to an exact commit,
it may use the local qualification sandbox (`pnpm qualify:projects:sandboxed`), which avoids host bind mounts and the
host Docker socket but still relies on privileged DinD. Use `--allow-host-project-code` only after separately accepting
that exact source on the host. Available credentials do not count as acceptance.

Review the generated `stacktape.yml`; do not judge success only by exit code. Check the inferred services, process
types, commands, environment wiring, dependencies, gaps, and resource safety defaults. After the discovery result is
understood, add exact `expect` counts and required/forbidden configuration or gap patterns to the manifest.

An uncontracted case is reported as `discovery`, never as `passed`. The harness deliberately skips packaging and will
not reuse that result until a human or coordinating agent has reviewed the intended application and encoded `expect`.
The command still writes all review artifacts but exits with code 2. Do not bypass this boundary with a vague
expectation merely to reach the package lane.

If a reviewed/reputable batch is large, use deterministic shards and the qualification sandbox. Cases in one run share
its disposable cache; separate sandbox workers do not share a host cache:

```sh
pnpm qualify:projects:sandboxed -- --manifest=<manifest.json> --lanes=import,package --shard=1/8
```

For reviewed pinned projects running directly on the host:

```sh
pnpm qualify:projects -- --manifest=<manifest.json> --lanes=import,package --cache-root=.stacktape/project-cache --shard=1/8 --allow-host-project-code
```

Run `--lanes=runtime` when the change reaches a packaging implementation or target runtime. A project-specific package
pass does not replace the runtime lane; the former proves source-to-artifact/template behavior, while the latter
executes stable artifacts in controlled runtimes.

## Classify a failure before fixing it

Use the report, retained worktree, native project instructions, and focused Stacktape tests to classify the failure:

- **Importer:** facts, topology, questions, gaps, or generated config are wrong.
- **Packaging:** dependency installation, code generation, buildpack, Docker, bundling, archiving, or framework build is
  wrong.
- **Core synthesis:** directives, resource resolution, template construction, IAM, names, or artifact identity are
  wrong.
- **Harness:** the runner made a false assumption, blocked an allowed read, lost diagnostics, or failed to clean up.
- **Upstream project:** the pinned project no longer passes its own documented build because of unsupported
  dependencies, missing files, or application code errors.
- **Environment:** a required tool/runtime is absent or unhealthy.

When practical, run the project's documented native build in the retained isolated copy. Do not weaken an exact
expectation, allow arbitrary network calls, inject real secrets, or add a broad fake AWS response just to turn a row
green. If the upstream project itself is broken, record that evidence and replace it in fast/release qualification with
a maintained commit or another project; retain it as importer-only evidence when it still covers a valuable format.

## Fix and leave durable evidence

Fix the lowest layer that owns the behavior. Examples: a probe should understand the source evidence; composition should
map correct facts to resources; packaging should honor the project's supported toolchain; core validation should match
the framework's real contract. Avoid a case-ID special case.

For every product bug:

1. Add a small focused regression that fails for the cause, not a giant snapshot.
2. Rerun that focused test and typecheck the affected package.
3. Rerun the failing qualification case from a fresh isolated copy.
4. Run one or more neighboring cases that could regress.
5. Run the runtime lane if packaging or runtime behavior changed.
6. Update exact expectations only when the corrected behavior is intentional and explain why.

The project case catches integration drift; the focused regression makes the behavior fast and maintainable in normal
CI. Keep both.

## Decide whether live AWS adds new evidence

Do not deploy a public project merely because it packaged. Choose an existing AWS archetype when it covers the same
runtime, packaging mode, stateful resource, network topology, and init-specific behavior. Add a new canary fixture only
when at least one important dimension is not represented.

Routine candidates should be quick to provision, easy to health-check, and deterministic to delete. Databases, NAT or
VPC-heavy paths, migrations, search, Kafka, and other slow stateful resources belong in periodic or release-depth runs.
Never infer permission from available credentials.

Before a live run, require all of the following:

- the user explicitly authorized AWS mutation for this task;
- an exact disposable AWS account, region, profile/credential mode, unique owner, and expected 12-digit account ID;
- the independent opt-in and disposable-account phrase required by the canary;
- a masked Stacktape API key configured outside chat;
- an unused safe project/stack name and, for init, an absolute state-file path;
- a reviewed cleanup path and enough time to run it even if deployment fails.

Run the explicit scenario through `pnpm qualify:projects -- --lanes=aws --aws-scenario=<id>`. Preserve the state file on
interruption. Verify cleanup, including owned log groups, buckets/versions or multipart uploads, and generated secrets,
before calling the run complete.

## Finish the work session

Return or store:

- the JSON and Markdown report paths;
- projects added, their source commits, and the customer behavior each represents;
- failures classified as Stacktape, harness, upstream, or environment;
- product behavior changed and focused regressions added;
- exact checks and qualification reruns that passed;
- AWS scenarios run, account/region identifiers without credentials, health evidence, and cleanup result;
- remaining coverage gaps or uncertain classifications.

Do not commit caches, generated configs/templates, reports, retained workdirs, credentials, or cloud state files. Stop a
live-deployment session if cleanup identity is uncertain. Stop an exploratory session when new cases repeat already
known behavior without revealing a new contract; spend the remaining capacity fixing and distilling what was found.
