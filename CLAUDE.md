# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What is Stacktape?

Stacktape is a PaaS 2.0 platform that simplifies AWS deployment. It enables developers to deploy containers, Lambdas, databases, and 30+ AWS services without extensive DevOps knowledge while maintaining full control and AWS flexibility.

## Writing rules

Be extremely concise. Sacrifice grammar for the sake of concision.

## Code Rules

- Only use comments when absolutely necessary. Let the code be self-explanatory.
- The project is built using bun. Always use bun and bun-native functionality.
- To import packages, always use import only part of the package, e.g. `import { myFunc } from 'package-name'`
- Prefer using inline types to type functions, e.g. `const myFunc = ({ property }:{ property: string }) => { ... }`
- To write helper functions, prefer arrow functions, e.g. `const myFunc = () => {}`
- Only use classes when necessary. Prefer writing procedural/functional code. E.g. just write 3 arrow functions, instead of a class with 3 methods.
- Prefer typescript types over interfaces.
- Use ESLint config from eslint.config.ts (based on @antfu/eslint-config with prettier integration)
- Unused variables should be prefixed with `_` (e.g., `const _unusedVar = ...`)

## Terminal Rules

- Always use `bun`. Not `node`, not `npm`, not `yarn`.
- To run scripts in `package.json` always use `bun run <<script:name>>`.
- To run scripts not in `package.json` use `bun run <<script-name.ts>>`.
- Always run scripts from root project directory
- If you want to install or remove a package, always use `bun`, not `npm`

## High-Level Architecture

### Layered Structure

```
Entry Points (src/api/)
  ├─ CLI (src/api/cli) - Command-line interface
  ├─ SDK (src/api/npm/sdk) - Node.js programmatic API
  └─ TypeScript Config (src/api/npm/ts) - Type-safe resource definitions
      ↓
Application Layer (src/app/)
  ├─ GlobalStateManager - Command context & AWS credentials
  ├─ ApplicationManager - Lifecycle & error handling
  ├─ EventManager - Event tracking & audit trails
  ├─ AnnouncementsManager - Update notifications
  └─ StacktapeTrpcApiManager - Stub implementation (no-op)
      ↓
Command Layer (src/commands/)
  34+ commands: deploy, delete, rollback, dev, logs, init, etc.
      ↓
Domain Layer (src/domain/)
  17+ managers: ConfigManager, TemplateManager, PackagingManager,
  CloudformationStackManager, DeploymentArtifactManager, VpcManager, etc.
      ↓
Utilities & Shared (src/utils/ + shared/)
  AWS SDK, CLI parsing, error handling, printer, naming, decorators
```

### Key Components

**src/domain/** - Core business logic with specialized managers:

- `ConfigManager` - Parses and resolves Stacktape YAML config with directives
- `TemplateManager` - Builds CloudFormation JSON templates
- `CalculatedStackOverviewManager` - Transforms config into CloudFormation resources (300+ resource types)
- `DeployedStackOverviewManager` - Analyzes deployed stacks and calculates diffs
- `CloudformationStackManager` - Executes CloudFormation operations via AWS SDK
- `PackagingManager` - Builds Lambda functions and containers (esbuild, buildpacks)
- `DeploymentArtifactManager` - Uploads artifacts to S3/ECR with deduplication
- `VpcManager`, `CloudfrontManager`, `EC2Manager`, etc. - Service-specific managers

**src/commands/** - CLI commands that orchestrate domain managers:

- Each command is standalone module with specific purpose
- Commands follow initialization pattern using `initializeAllStackServices()`
- Examples: deploy, delete, rollback, dev, logs, stack:info, init, secret:\*, domain:add

**src/utils/** - Cross-cutting utilities:

- AWS SDK wrapper (`awsSdkManager`)
- CLI argument parsing
- Error handling (ExpectedError vs UnexpectedError)
- Console output formatting (`printer`)
- Naming conventions (CloudFormation logical names, resource names)
- Decorators (@memoizeGetters, @cancelablePublicMethods, @skipInitIfInitialized)

**shared/** - Reusable infrastructure code:

- `aws/` - S3 utilities, CloudWatch logs, SDK manager
- `naming/` - Naming conventions for stacks, resources, paths
- `packaging/` - Bundlers for ES/Go/Python/Java
- `utils/` - Docker, Git, hashing, file operations, dependency installers
- `config-gen/` - AI-powered configuration generation

**helper-lambdas/** - Lambda functions deployed to every stack:

- `stacktapeServiceLambda` - Custom resources handler, alarm notifications, ECS maintenance
  - Note: `default-domain` and `default-domain-cert` resolvers are stubbed (require external service)
- `cdnOriginRequestLambda` - CloudFront edge request transformation
- `cdnOriginResponseLambda` - CloudFront edge response transformation
- `batchJobTriggerLambda` - Batch job scheduling

### Path Aliases (tsconfig.json)

```typescript
@utils/*         → ./src/utils/*
@cloudform/*     → ./@generated/cloudform/*
@schemas/*       → ./@generated/schemas/*
@domain-services/* → ./src/domain/*
@application-services/* → ./src/app/*
@config          → ./src/config/random.ts
@cli-config      → ./src/config/cli.ts
@errors          → ./src/config/error-messages.ts
@api/*           → ./src/api/*
@helper-lambdas/* → ./helper-lambdas/*
@shared/*        → ./shared/*
```

### Important Patterns

**Manager Pattern**: Every major service is a singleton manager with:

- `init()` - Async initialization
- `reset()` - Clean state for next command
- Decorated methods for interrupt handling and caching
- Composed using `basic-compose` library

**Service Initialization**: Commands use consistent initialization pattern:

```typescript
await initializeAllStackServices({
  commandRequiresDeployedStack: boolean,
  commandModifiesStack: boolean,
  loadGlobalConfig: boolean,
  requiresSubscription: boolean
});
```

**Error Handling**: Two-tier system:

- `ExpectedError` - User-facing errors with helpful messages
- `UnexpectedError` - Unexpected failures logged to Sentry

**Naming Conventions**:

- Stack names: `{projectName}-{stage}` (max 128 chars)
- CloudFormation logical names: 64 chars max, kebab-case
- Resource names: Prefixed with `stp` + resource type + hash

**Configuration Directives**: Dynamic config values:

- `$Secret('name')` - Reference secrets
- `$Param('name')` - Stack parameters
- `$EnvVar('NAME')` - Environment variables
- `$OutputReference(...)` - Cross-stack references

### Build & Compilation Process

**Schema Generation** (`bun gen:schema`):

1. Fetches AWS CloudFormation resource specs
2. Generates TypeScript types for 300+ resource types
3. Creates JSON schemas for validation
4. Generates Ajv validation code

**CloudFormation Generation** (`bun gen:cloudform`):

1. Downloads CloudFormation resource specs
2. Generates `@generated/cloudform/` TypeScript definitions

**CLI Binary Compilation** (`bun build:cli:bin`):

1. Compiles TypeScript using esbuild
2. Bundles dependencies and helper-lambdas
3. Creates standalone binaries using @yao-pkg/pkg

**SDK/NPM Builds** (`bun build:npm`, `bun build:npm:sdk`):

1. Transpiles TypeScript to JavaScript
2. Generates type definitions (.d.ts)
3. Exports ESM and CommonJS modules

### Generated Files & Artifacts

**During Development:**

- `./@generated/cloudform/` - CloudFormation resource types (auto-generated)
- `./@generated/schemas/` - JSON schemas for config validation
- `.stacktape/` - Temporary build folder per CLI invocation

**During Release:**

- `__release-npm/` - NPM package artifacts
- `__binary-dist/stacktape` - Compiled binaries
- `.starter-project.json` - Starter project metadata

### Deployment Workflow (deploy command)

1. **Prepare** - Load config, validate, register CF types
2. **Build** - Package Lambda functions and containers
3. **Template** - Generate CloudFormation template
4. **Diff** - Compare with deployed template, check hot-swap
5. **Execute** - Hot-swap (fast) or full CloudFormation deployment
6. **Post-Deploy** - Run scripts, send notifications, cleanup

### Stub Implementations

Some features that required external service integration have been stubbed:

**StacktapeTrpcApiManager** (`src/app/stacktape-trpc-api-manager/`):

- Provides no-op implementations for API client methods
- Methods like `recordStackOperation`, `canDeploy`, `deleteUndeployedStage` are stubbed
- Allows core functionality to run without external API dependencies

**Default Domain Custom Resources** (`helper-lambdas/stacktapeServiceLambda/custom-resources/resolvers/`):

- `default-domain.ts` - Stub that logs warning about disabled feature
- `default-domain-cert.ts` - Certificate management without automatic DNS validation
- Users must manually validate certificates via DNS

## Key Technologies

- Runtime: Node.js 22+, TypeScript 5.9+, Bun
- AWS SDK: @aws-sdk/\* v3.188+ (modular)
- CloudFormation: AWS CDK CloudFormation diff
- Bundling: esbuild, Docker
- CLI: yargs-parser, prompts, kleur (colors)
- Validation: Zod, AJV
- Observability: Sentry, Mixpanel
- Package Manager: @yao-pkg/pkg (for binaries)

## Important Notes

- All scripts use `bun` to run and check `import.meta.main` to determine if they're the entry point
- Helper lambdas are compiled separately and packaged into deployment artifacts
- The codebase supports dual distribution: CLI binary + Node.js SDK
- Event-driven architecture tracks all operations for audit trails
- Hot-swap optimization enables sub-second deployments without full CF updates
- Type-safe config system with IDE autocomplete via TypeScript classes
- Some features requiring external services have stub implementations (TRPC API, default domains)
