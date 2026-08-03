# Release implementation

The root `pnpm release <version>` and `pnpm release:preview <version>` commands call `trigger-release.ts`, a local dispatcher for
`.github/workflows/release.yml`. The workflow owns all builds and publication. `preview` and `stable` use identical
candidate bytes; channel-specific jobs change the npm tag, GitHub release classification, and installer endpoint.
See the root [`RELEASING.md`](../../../../RELEASING.md) for the operator contract.

Current release primitives:

- `build-cli-sources.ts` compiles the CLI binary and assembles shipped platform assets.
- `checksums.ts` writes and verifies the exact `SHA256SUMS` archive manifest.
- `args.ts` parses versions/platform flags for the build scripts.
- `validate-release-input.ts` requires `x.y.z-preview.N` for preview and plain `x.y.z` for stable.
- `verify-candidate-assets.ts` rejects missing or unexpected platform archives.
- `verify-published-release.ts` downloads every GitHub asset, verifies its checksum, and exercises the npm launcher's
  exact version before npm publication.
- `trigger-release.ts` dispatches an explicit channel/version/ref and never publishes locally.

Installer publication lives in `../publish-install-scripts.ts` because it owns the canonical installer sources. Its
separate workflow job uses a narrow AWS OIDC identity after npm/GitHub publication succeeds, so failed installer
publication can be retried without attempting to overwrite an immutable npm version.

`stacktape.ts` remains only for the currently separate schema and generated AI-documentation publishers. Do not use
it from `release.yml` or reintroduce `STACKTAPE_API_KEY` for npm/binary releases.
