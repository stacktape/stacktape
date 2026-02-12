# Phase 1: AI Docs Corpus Generation + Local Lexical Index

Generate a structured, frontmatter-tagged docs corpus optimized for lexical retrieval. This corpus is the data source
for the `stacktape_docs` MCP tool.

## Background

### Existing assets

- **Config type definitions** (`types/stacktape-config/*.d.ts`): 50 files with rich JSDoc documentation per property.
  These are the canonical source for config reference.
- **Curated docs** (`docs/_curated-docs/`): 23 manually written mdx files across 4 categories (concepts,
  getting-started, recipes, troubleshooting). All have `title` + `order` frontmatter. Content is mostly correct but not
  finished.
- **CLI commands/options** (`src/config/cli/commands.ts`, `src/config/cli/options.ts`): full command definitions with
  descriptions, args, and required args.
- **Existing generation script** (`scripts/generate-ai-docs.ts`): processes old mdx docs from `docs/docs/` and type
  files. Splits resource pages into numbered sections. Adds api-reference sections with TypeScript types. No frontmatter
  tagging.

### What changes

We replace the existing generation script with a new one that:

1. Uses curated docs as primary prose source (not old `docs/docs/`).
2. Generates config-ref directly from `.d.ts` files (not embedded in prose pages).
3. Generates CLI ref from `commands.ts` + `options.ts`.
4. Adds standardized frontmatter to every output file.
5. Produces a manifest (`index.json`) for the lexical indexer.

## Output structure

```
@generated/ai-docs/
├── index.json                              # manifest for indexer
├── config-ref/
│   ├── _root.md                            # StacktapeConfig top-level
│   ├── function.md                         # LambdaFunction
│   ├── web-service.md                      # WebService
│   ├── worker-service.md                   # WorkerService
│   ├── private-service.md                  # PrivateService
│   ├── batch-job.md                        # BatchJob
│   ├── multi-container-workload.md         # MultiContainerWorkload
│   ├── nextjs-web.md                       # NextjsWeb
│   ├── relational-database.md              # RelationalDatabase
│   ├── dynamo-db-table.md                  # DynamoDbTable
│   ├── redis-cluster.md                    # RedisCluster
│   ├── bucket.md                           # Bucket
│   ├── hosting-bucket.md                   # HostingBucket
│   ├── http-api-gateway.md                 # HttpApiGateway
│   ├── application-load-balancer.md        # ApplicationLoadBalancer
│   ├── cdn.md                              # Cdn
│   ├── user-auth-pool.md                   # UserAuthPool
│   ├── ... (one per resource type)
│   └── events.md                           # Event/integration types
├── cli-ref/
│   ├── deploy.md
│   ├── dev.md
│   ├── delete.md
│   ├── preview-changes.md
│   ├── debug-logs.md
│   ├── ... (one per command)
│   └── _options.md                         # shared options reference
├── concept/
│   ├── connecting-resources.md
│   ├── directives.md
│   ├── stages-and-environments.md
│   ├── typescript-config.md
│   ├── yaml-config.md
│   ├── overrides-and-transforms.md
│   └── extending-cloudformation.md
├── recipe/
│   ├── rest-api-with-database.md
│   ├── static-website.md
│   ├── nextjs-full-stack.md
│   ├── background-jobs.md
│   ├── scheduled-tasks.md
│   ├── database-migrations.md
│   ├── monorepo-setup.md
│   └── graphql-api.md
├── troubleshooting/
│   └── cloudformation-stack-states.md
└── getting-started/
    ├── intro.md
    ├── workflow.md
    ├── dev-mode.md
    ├── deployment.md
    ├── using-with-ai.md
    ├── console.md
    └── how-it-works.md
```

## Frontmatter schema

Every generated file has this frontmatter:

```yaml
---
docType: config-ref | cli-ref | concept | recipe | troubleshooting | getting-started
title: "Human-readable title"
resourceType: "function" # only for config-ref, optional for others
tags: # aliases and synonyms for retrieval
  - lambda
  - serverless
  - faas
source: "types/stacktape-config/functions.d.ts" # where generated from
priority: 1 # 1=high, 2=medium, 3=low (affects ranking)
---
```

### Priority rules

- `config-ref`: priority 1 (most common agent queries)
- `recipe`: priority 1
- `concept`: priority 1
- `troubleshooting`: priority 2
- `getting-started`: priority 2
- `cli-ref`: priority 3 (MCP is primary action path, CLI ref is fallback)

## Generation rules per doc type

### config-ref (generated from `.d.ts` files)

For each resource type file in `types/stacktape-config/`:

1. Parse the outer interface (e.g. `LambdaFunction`) and its JSDoc.
2. Parse the props interface (e.g. `LambdaFunctionProps`) and all property JSDoc.
3. Output as markdown:
   - Title from outer interface JSDoc `#### ...` heading.
   - Resource `type` value (e.g. `'function'`).
   - Full TypeScript type block (the raw `.d.ts` content for this resource, cleaned of internal `Stp*` types).
4. Tags: include resource type name + known synonyms from synonym map.

Example output (`config-ref/function.md`):

````markdown
---
docType: config-ref
title: "Lambda Function"
resourceType: "function"
tags: [lambda, serverless, faas, function]
source: "types/stacktape-config/functions.d.ts"
priority: 1
---

# Lambda Function

A serverless compute resource that runs your code in response to events. Lambda functions are short-lived, stateless,
and scale automatically. You only pay for the compute time you consume.

Resource type: `function`

## TypeScript Definition

\```typescript interface LambdaFunction { type: 'function'; properties: LambdaFunctionProps; overrides?:
ResourceOverrides; }

interface LambdaFunctionProps extends ResourceAccessProps { /** How your code is built and packaged for deployment. ...
\*/ packaging: LambdaPackaging; /** What triggers this function ... \*/ events?: (...event types...)[]; // ... all
properties with their JSDoc } \```
````

### cli-ref (generated from `commands.ts` + `options.ts`)

For each command in `commandDefinitions`:

1. Extract command name, description, args, required args.
2. Output as markdown with command usage, description, args table.
3. Mark with priority 3.

### concept, recipe, troubleshooting, getting-started (from curated docs)

For each file in `docs/_curated-docs/`:

1. Read existing mdx content.
2. Strip JSX components and image references (reuse existing cleaning logic).
3. Add/update frontmatter with `docType`, `title` (from existing frontmatter), `tags`, `source`, `priority`.
4. Convert `.mdx` to `.md` output.
5. Keep content mostly as-is (these are human-curated).

## Manifest (`index.json`)

```json
{
  "generatedAt": "2026-02-12T10:00:00Z",
  "version": "1.0",
  "files": [
    {
      "path": "config-ref/function.md",
      "docType": "config-ref",
      "title": "Lambda Function",
      "resourceType": "function",
      "tags": ["lambda", "serverless", "faas", "function"],
      "priority": 1
    },
    ...
  ]
}
```

## Synonym map (for tags and retrieval)

```typescript
const SYNONYM_MAP: Record<string, string[]> = {
  function: ["lambda", "serverless", "faas"],
  "web-service": ["container", "docker", "ecs", "fargate", "http-service"],
  "worker-service": ["background", "worker", "async-worker"],
  "private-service": ["internal-service", "vpc-service"],
  "batch-job": ["batch", "job", "scheduled-job"],
  "multi-container-workload": ["multi-container", "sidecar"],
  "nextjs-web": ["nextjs", "next.js", "next", "ssr"],
  "relational-database": ["rds", "postgres", "postgresql", "mysql", "database", "db", "sql"],
  "dynamo-db-table": ["dynamodb", "nosql", "document-db"],
  "redis-cluster": ["elasticache", "redis", "cache"],
  bucket: ["s3", "storage", "object-storage"],
  "hosting-bucket": ["static-site", "static-website", "spa"],
  "http-api-gateway": ["api-gateway", "apigateway", "gateway", "api"],
  "application-load-balancer": ["alb", "load-balancer"],
  "network-load-balancer": ["nlb"],
  cdn: ["cloudfront", "distribution"],
  "user-auth-pool": ["cognito", "auth", "authentication"],
  "event-bus": ["eventbridge", "events"],
  "sns-topic": ["sns", "notification", "pubsub"],
  "sqs-queue": ["sqs", "queue", "message-queue"],
  "state-machine": ["step-functions", "stepfunctions", "workflow"],
  "efs-filesystem": ["efs", "filesystem", "persistent-storage"],
  bastion: ["jump-host", "ssh"],
  "web-app-firewall": ["waf", "firewall"],
  "mongo-db-atlas-cluster": ["mongodb", "mongo"],
  "upstash-redis": ["upstash"],
  "open-search": ["opensearch", "elasticsearch", "elastic"],
  "custom-resource": ["cloudformation-custom"],
  "deployment-script": ["deploy-script", "migration-script"]
};
```

## Implementation steps

1. Create `scripts/generate-ai-docs-v2.ts` (new file, don't modify existing script).
2. Add `gen:ai-docs-v2` script to `package.json`.
3. Implement config-ref generator (parse `.d.ts`, emit markdown + frontmatter).
4. Implement cli-ref generator (parse `commands.ts`/`options.ts`, emit markdown).
5. Implement curated-docs copier (read `_curated-docs`, add frontmatter, emit markdown).
6. Implement manifest generator (`index.json`).
7. Run and verify output structure.

## Exit criteria

- `@generated/ai-docs/` contains all 5 doc types with correct frontmatter.
- `index.json` manifest is complete and parseable.
- Config-ref files include full TypeScript definitions (cleaned of internal types).
- CLI-ref files cover all commands.
- Curated docs are copied with frontmatter added.
- Tags include synonym expansions for resource types.
