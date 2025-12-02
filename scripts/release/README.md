# Release Scripts

This directory contains modular release scripts for Stacktape.

## Scripts

# Flags

All release scripts support these flags:

- `--version X.Y.Z` - Explicitly specify version (e.g., `--version 3.0.0`)
- `--major` - Auto-increment major version (e.g., 1.0.0 → 2.0.0)
- `--minor` - Auto-increment minor version (e.g., 1.0.0 → 1.1.0)
- `--patch` - Auto-increment patch version (e.g., 1.0.0 → 1.0.1)
- `--prerelease` - Create a prerelease version (must end with `-alpha.N`, `-beta.N`, or `-rc.N`)
- `--dev` - Development mode (skips validation, git checks, and publishing)
- `--spc` - Skip project check

If no version flag is provided, you'll be prompted to enter a version manually.

### Prerelease Versions

When using `--prerelease`, the version must follow the format: `X.Y.Z-{alpha|beta|rc}.N`

- GitHub release will be marked as "prerelease" (not recommended for production)
- NPM packages will be published with the appropriate tag (`alpha`, `beta`, or `rc`)
- Users need to explicitly install prerelease versions: `npm install stacktape@alpha`

Examples:

- `2.23.0-alpha.0` - First alpha prerelease
- `2.23.0-beta.1` - Second beta prerelease
- `2.23.0-rc.0` - First release candidate

## Examples

```bash
# Full release with explicit version
bun run release --version 3.0.0

# Full release with patch version bump
bun run release --patch

# Prerelease with explicit version
bun run release --version 2.23.0-alpha.0 --prerelease
```

## Architecture

The release process has been modularized to:

1. **Avoid code duplication** - Shared logic is in `utils/`
2. **Enable selective releases** - Can release CLI or NPM independently
3. **Improve maintainability** - Each concern is in its own module
4. **Support future extensions** - Easy to add new release targets

## Flow

### Full Release (`release.ts`)

1. Get version (flag or prompt)
2. Validate project (ESLint + TypeScript)
3. Build CLI binaries
4. Build platform packages
5. Build main NPM package
6. Create GitHub release
7. Upload binaries to GitHub
8. Publish install scripts
9. Publish platform packages to NPM
10. Publish main package to NPM
11. Update package.json versions
12. Commit changes
13. Publish schemas

### CLI-Only Release (`release-cli.ts`)

1. Get version
2. Validate project
3. Build CLI binaries
4. Create GitHub release
5. Upload binaries to GitHub
6. Publish install scripts
7. Update package.json versions
8. Commit changes

### NPM-Only Release (`release-npm.ts`)

1. Get version
2. Validate project
3. Build CLI binaries (needed for platform packages)
4. Build platform packages
5. Build main NPM package
6. Publish platform packages to NPM
7. Publish main package to NPM
8. Update package.json versions
9. Commit changes
10. Publish schemas
