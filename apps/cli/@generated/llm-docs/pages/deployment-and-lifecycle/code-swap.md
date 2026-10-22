# In-place code swap

Set `codeSwap: true` on a web service to let `stacktape deploy` update eligible code inside its running containers. It is off by default and can be used in any stage, including production, within the task cap. Stacktape still builds and pushes an image for every code change, so image fallback and rollback stay available.

```yaml configExample="complete"
resources:
  api:
    type: web-service
    properties:
      codeSwap: true
      packaging:
        type: js-bundle
        properties:
          entryfilePath: src/server.ts
      resources:
        cpu: 0.25
        memory: 1024
      scaling:
        minInstances: 1
        maxInstances: 2
```

Deploy as usual with `stacktape deploy --stage production --region eu-west-1`. The first deploy installs the supervisor and uses an image rollout. Later code-only changes can swap inside the same tasks. The CLI reports whether it swapped code or used an image deploy, and explains a fallback.

## Supported services

Supports several opted-in web services per stack on x86 Fargate, behind the default HTTP API Gateway. Node.js uses `js-bundle` packaging. Dependencies are bundled or kept in an independent generated install in the image; a change to that installed image uses an image deploy. Python uses the standard `buildpack` path with a complete transitive `requirements.txt` lock: every dependency must use `==` and SHA-256 hashes. Generate it with `uv pip compile requirements.in --generate-hashes --output-file requirements.txt`. The build enforces `--require-hashes`; an incomplete lock falls back to an image deploy with a CLI explanation. Python swap identity includes a hash of the installed virtualenv, interpreter and system libraries, so a changed installed environment requires an image deploy. Python source swaps run without local/URL dependencies, custom build/install commands or custom Railpack configuration. The startup command must directly run `uvicorn`, `gunicorn` or `python`, without shell command chains or an absolute `/app` source path. Other Python dependency managers and packaging paths use images. Python and Node.js with installed dependencies currently require local Docker caching; a registry-cache builder uses images. The app must listen on `PORT`, allow a writable working directory, and keep child processes under its process tree. State that must survive a deploy belongs outside the process and its local release directory.

Configured `internalHealthCheck`, ALB/NLB, blue/green deployments, side containers, tracing sidecars, remote sessions, EC2, arm64, source-dependent dependency installs, custom Dockerfiles, prebuilt images, Bun and Deno use image deploys. Remove the opt-in if you only need image deploys. Unsupported combinations do not inherit the qualified runtime's guarantees.

Each service's autoscaling maximum, scheduled overrides and deployment surge must fit within **10 simultaneous tasks**. Unknown bounds use images. `minimumHealthyPercent` must be 100, and surge must allow at least one replacement. With the default 200% maximum, use `maxInstances: 5` or fewer. A ten-task desired count with no room for a replacement uses images, even before the first swap. No coordinator admits larger fleets. A custom CloudFormation transform that invalidates the protected role or capacity checks is refused before deployment; correct it or remove the opt-in.

Python bundles the source and assets selected by the buildpack, using the same exclusions as its image. The image keeps the interpreter and virtualenv; each activation starts the buildpack's command from the new release directory. Read application files relative to that working directory. An absolute `/app/...` path still reads the image's files. Python projects that install their own source or compile it during a build use images.

A deploy prepares every changed service before switching any. If a changed service cannot swap, all changed services use image deploys. A failure during switching also converges all changed services through images. Unchanged services keep their tasks and serving code during ordinary code deploys. Explicit interrupted-operation recovery can replace every opted-in service to repair the stack. Services switch independently after preparation; there is no atomic switch across their public endpoints. Keep ordinary API compatibility between service versions.

## Memory and request failures

During a switch, **the old and new processes share the task's memory**. A sudden increase in the new code's memory use can kill a candidate after it starts serving, failing some in-flight requests. Memory screening and OOM preferences reduce the risk; they do not isolate the processes or guarantee that the old process survives extreme pressure.

Before starting a candidate, each task reads its kernel lifetime peak and checks:

`2 × 1.25 × peak + 64 MiB ≤ 0.9 × memory limit`

An unknown or unreadable peak, an unsupported memory layout, or a failed screen causes an image deploy. The lifetime peak includes startup, workers, caches and overlap from earlier swaps. A successful swap can therefore raise the peak enough that the next edit uses images. Increase `resources.memory` (for example, from 512 to 1024 MiB), reduce memory use, or continue with image deploys. A larger limit is not a promise that any new code will fit.

## Completion and fallback

A small supervisor owns the HTTP port, starts the candidate, verifies proxy reachability, switches new requests, then waits for the old process to drain and exit. The old process gets up to **65 seconds** to finish requests that were already in flight, the same time an image deploy allows (35 s routing drain plus the 30 s default stop timeout). It receives `SIGTERM` as soon as its last request finishes, so a swap with no open requests does not wait. Requests still open after 65 seconds are closed. The application then has its `stopTimeout` (default 2 s) to exit before it is killed. Without an authored application check, **any complete HTTP response, including 500, counts as reachability**. There is no default application health check and no fixed observation window.

The CLI reports success only after every current task completes, the fleet remains healthy and routable, old process trees exit, and release history is durable. Candidate failure, OOM, task replacement or fleet changes prevent swap success and trigger image convergence. If candidate cleanup cannot be confirmed, the command fails and keeps the operation lock; use the recovery procedure below. A later crash is an ordinary application incident; use your existing monitoring and rollback procedure.

Dependency, environment, runtime, supervisor and base configuration changes use image deploys. `--full` also forces an image rollout. Scaling without a new task revision keeps the committed code; replacement tasks load that code before reporting ready. Opted-in image rollouts and new tasks pay the ECS supervisor-readiness delay. Normal services without the opt-in keep their existing resources and behavior.

## Rollback, disabling and interrupted deploys

Use [`stacktape rollback`](/deployment-and-lifecycle/rollbacks) to deploy a retained release's exact image as a new task revision. Rollback uses images rather than reversing a swap. Deployment artifact retention follows `deploymentConfig.previousVersionsToKeep`; the current committed bundle stays available for task replacement. Successful deploys remove status rows for tasks ECS confirms have stopped. Live task status has no expiry.

Set `codeSwap: false` or remove it, then deploy, to return to image-only operation. [`stacktape delete`](/cli/delete) also removes the runtime table and code bundles.

Deploy, rollback, opt-out and delete share one operation lock once the stack is opted in. If you interrupt the CLI (Ctrl+C, or a cancelled CI job) before it starts changing the stack, it aborts any prepared swap and releases the lock. After it has started changing the stack, and whenever the CLI is killed, the lock stays held. The next command names its holder. Stop that invocation, verify that every AWS change it started has finished, then run the command again with `--recover-operation <invocation-id>` using the local runner. For deploy, add `--runner local` if you normally use an EC2 runner. Recovery repairs an interrupted swap through an image deploy; it never reports the interrupted attempt as a successful swap.

The application has permission to write its own supervisor status. A malicious application can forge its own completion and cause a false success report. It cannot write the release record, lock, or another task's status. Code bundles, images, release records and task status stay in your AWS account; this feature adds no external data service.
