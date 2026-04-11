# Stacktape Docs Structure Plan

This file captures the agreed documentation information architecture for Stacktape so the work can be resumed later without relying on chat history.

## Purpose

The current docs structure in `docs/docs/` and `docs/_new-docs/` is outdated and no longer reflects the current Stacktape product surface.

This plan defines:

- the top-level navigation topology
- how content should be grouped into categories
- which topics deserve dedicated pages vs. sections inside larger pages
- how Stacktape Console features fit into the docs
- the structural decisions already agreed on

This is a docs structure plan, not a writing plan. Content generation strategy will be designed separately.

## Core Principles

1. The docs should be organized by user goal, not internal implementation.
2. Top-level categories should be expandable in the sidebar.
3. `Introduction` is a standalone page before `Getting Started`.
4. `Getting Started` is a real section with multiple pages, not a single quick-start page.
5. Console features should be documented where users look for them by intent, not shoved into one giant "Console" bucket.
6. Cross-cutting topics like packaging and triggers should have their own sections instead of being repeated inside many resource pages.
7. SSR frameworks should have separate pages in navigation, but shared content should be authored from reusable partials/components instead of copy-paste.
8. SDK documentation should not be part of the new structure because the SDK no longer exists.

## Agreed Top-Level Navigation

1. Introduction
2. Getting Started
3. Core Concepts
4. Resources
5. Packaging
6. Events & Triggers
7. Deployment & Lifecycle
8. Local Development
9. Stacktape Console
10. CI/CD & GitOps
11. Monitoring & Observability
12. Cost Management
13. Governance
14. Using with AI
15. Recipes
16. Troubleshooting
17. Reference

## Why This Structure

### Introduction before Getting Started

`Introduction` should explain what Stacktape is, who it is for, why teams use it, and what makes it different. It is a framing page.

`Getting Started` should then focus on getting the reader from zero to first success.

Keeping `Introduction` separate makes the docs easier to scan and lets the first page be more marketing-aware without overloading the setup/tutorial flow.

### Goal-based Console placement

A user looking for alarms, budgets, or issues is trying to solve a monitoring or cost problem, not looking for a generic "Console" chapter. For that reason:

- alarms, issues, notifications, logs, metrics go under `Monitoring & Observability`
- budgets and cost dashboards go under `Cost Management`
- guardrails go under `Governance`
- GitOps and runners go under `CI/CD & GitOps`

The `Stacktape Console` section should focus on the Console-specific surface area and workflows, such as account setup, project/stage navigation, config editor, API keys, team management, and billing.

### Cross-cutting topics need dedicated sections

Packaging and triggers apply across multiple resource types.

Examples:

- packaging is shared by functions, services, and batch jobs
- triggers are shared by functions, batch jobs, and some container workloads
- `connectTo` is shared by many resources

These should not be explained separately on each resource page from scratch.

## Section-by-Section Plan

## 1. Introduction

Single standalone page before `Getting Started`.

Purpose:

- explain what Stacktape is
- explain who it is for
- explain the core value proposition
- set expectations for the rest of the docs

Likely content:

- what Stacktape does
- why use it instead of raw AWS / CloudFormation / lower-level IaC
- how Stacktape relates to AWS, the CLI, and the Console
- what types of apps it is best suited for

## 2. Getting Started

This should be a substantial section with roughly 5-8 pages.

Purpose:

- help new users succeed quickly
- stay scannable and practical
- keep a light marketing tone without becoming fluffy
- bridge from product understanding to first deployment

Detailed page list is intentionally left open for a later discussion.

Constraints already agreed:

- it should be somewhat similar in spirit to `docs/_new-docs/getting-started/`
- it should be better structured than the current version
- it should include a strong quick-start experience inside the section

## 3. Core Concepts

Purpose:

- explain the mental model required to understand Stacktape
- define the common concepts that are referenced from the rest of the docs

Planned pages:

1. Configuration file
2. Resources
3. Stages & environments
4. Connecting resources
5. Directives
6. Variables & reuse
7. Hooks & scripts
8. Overrides & escape hatches

Notes:

- `Configuration file` should cover YAML vs TypeScript config and how to choose between them
- `Overrides & escape hatches` should cover `overrides`, raw CloudFormation resources, and possibly link out to advanced extensibility pages

## 4. Resources

Purpose:

- provide the main product-surface documentation
- organize resources by the reader's domain/problem area

Agreed subcategories:

1. Compute
2. Frontend
3. Databases
4. Storage
5. Networking
6. Messaging
7. Orchestration
8. Security
9. Advanced

### 4.1 Compute

Pages:

1. Choosing compute
2. Lambda function
3. Web service
4. Private service
5. Worker service
6. Multi-container workload
7. Batch job
8. Edge function

### 4.2 Frontend

Pages:

1. Choosing a frontend resource
2. Static hosting
3. Next.js
4. Astro
5. Nuxt
6. SvelteKit
7. SolidStart
8. TanStack Start
9. Remix

Important implementation note:

- Each SSR framework gets its own page in nav.
- Shared content should come from reusable MDX partials/components/includes, not from manual copy-paste.
- The framework pages should stay distinct from a reader perspective even if some source content is shared.

### 4.3 Databases

Pages:

1. Choosing a database
2. Relational database
3. DynamoDB
4. Redis
5. MongoDB Atlas
6. Upstash Redis
7. OpenSearch

### 4.4 Storage

Pages:

1. S3 bucket
2. EFS filesystem

### 4.5 Networking

Pages:

1. HTTP API Gateway
2. Application Load Balancer
3. Network Load Balancer
4. CDN
5. Custom domains

### 4.6 Messaging

Pages:

1. Event bus
2. SQS queue
3. SNS topic
4. Kinesis stream

### 4.7 Orchestration

Pages:

1. State machine

### 4.8 Security

Pages:

1. User authentication pool
2. Web Application Firewall
3. Bastion host

### 4.9 Advanced

Pages:

1. Custom resources
2. Deployment scripts
3. AWS CDK constructs
4. Raw CloudFormation resources

## 5. Packaging

Purpose:

- centralize packaging/build/deployment artifact concepts shared by multiple resource types

Planned pages:

1. Packaging overview
2. Stacktape buildpack for Lambda
3. Stacktape buildpack for containers
4. Custom Dockerfile
5. Prebuilt image
6. Nixpacks
7. External buildpack
8. Custom artifact
9. Language-specific config

Possible subsections inside `Language-specific config`:

- JavaScript & TypeScript
- Python
- Java
- Go
- Ruby
- PHP
- .NET

## 6. Events & Triggers

Purpose:

- document event sources in one place instead of scattering them across workload pages

Planned pages:

1. Overview
2. HTTP triggers
3. Schedule triggers
4. S3 events
5. SQS events
6. SNS events
7. DynamoDB streams
8. Kinesis events
9. Event bus events
10. CloudWatch logs
11. Alarms as triggers
12. Kafka topics

## 7. Deployment & Lifecycle

Purpose:

- explain the deployment model from packaging through rollback/deletion

Planned pages:

1. Deploying stacks
2. Previewing changes
3. Gradual deployments
4. Rollbacks
5. Destroying stacks
6. Deployment scripts & hooks
7. Multi-region deployments
8. Deploy-time parameters

## 8. Local Development

Purpose:

- explain `stacktape dev`, local emulation, debugging, and the development loop

Planned pages:

1. Dev mode overview
2. Local databases
3. Debugging Lambda functions
4. Debugging containers
5. Dev mode with AI
6. Debug commands reference

## 9. Stacktape Console

Purpose:

- explain the Console itself: how it is organized, how users move through it, and which workflows live there
- avoid turning this into a dumping ground for all features accessible through the Console

Planned pages:

1. Console overview
2. Connecting your AWS account
3. Organizations, projects & stages
4. Visual config editor
5. AI config generation
6. API keys
7. Team & access control
8. Billing & subscription

Notes:

- Some Console-only workflows are documented elsewhere by user intent.
- Example: alarm rules belong under `Monitoring & Observability`, not here.

## 10. CI/CD & GitOps

Purpose:

- document git-driven deployment workflows and deployment automation

Planned pages:

1. Overview
2. GitOps with Console
3. Build runners
4. Self-hosted GitHub Actions runners
5. Custom CI/CD
6. Stacks per git branch pattern

Expected scope:

- push-to-branch deployments
- PR preview environments
- EC2 vs CodeBuild runners
- remote deployment flow

## 11. Monitoring & Observability

Purpose:

- document how users monitor running systems, inspect failures, and send alerts

Planned pages:

1. Overview
2. Logs
3. Metrics
4. Alarms
5. Issues
6. Alert channels
7. Notifications
8. Alert history
9. Log forwarding

Notes:

- this section should cover both Stacktape capabilities and relevant Console workflows
- this is intentionally not under `Stacktape Console`

## 12. Cost Management

Purpose:

- document how users understand and control spend

Planned pages:

1. Cost dashboards
2. Budgets
3. Cost per project, stage, and resource
4. Cost optimization tips

Important note:

- old `budgetControl` config should not reappear in docs; budgets are now Console/server-side

## 13. Governance

Purpose:

- document organization-level policies and restrictions

Planned pages:

1. Guardrails overview
2. Deployment guardrails
3. Security & data protection guardrails
4. Resource limit guardrails
5. Database guardrails

## 14. Using with AI

Purpose:

- document the product's AI-facing capabilities in one discoverable place

Planned pages:

1. Overview
2. MCP server setup
3. Agent mode in dev
4. Config generation from repository
5. AI coding assistant integrations

## 15. Recipes

Purpose:

- provide end-to-end examples and common patterns

Planned pages:

1. REST API + database
2. GraphQL API
3. Next.js full-stack app
4. Background job processing
5. Scheduled tasks
6. Static website
7. Monorepo setup
8. Database migrations
9. Multi-tenant setup
10. PR preview environments

## 16. Troubleshooting

Purpose:

- help users recover from common failure modes quickly

Planned pages:

1. Common deployment errors
2. CloudFormation stack states
3. Dev mode issues
4. Permission errors
5. Getting help

## 17. Reference

Purpose:

- hold dense lookup-style material that is useful but not ideal as narrative docs

Planned pages:

1. CLI commands
2. Configuration schema
3. Directives reference
4. Referenceable parameters
5. Environment variables injected by `connectTo`
6. AWS permissions needed

CLI documentation should use one page per command.

## Page Boundary Rules

Use these rules when deciding whether something deserves its own page or should remain a section inside another page.

Create a dedicated page when the topic:

1. has a distinct user intent or search intent
2. is likely to grow significantly over time
3. has enough complexity to require examples, tradeoffs, and multiple sections
4. applies across multiple resource types or product surfaces
5. represents a first-class product feature in navigation or UI

Keep it as a section when the topic:

1. is only meaningful in the context of a single resource or workflow
2. is too small to justify its own page
3. would create a low-value thin page with little standalone usefulness

Examples:

- `Custom domains` deserves its own page because it spans multiple resources.
- `CORS on web-service` should be a section inside the `Web service` page.
- `Packaging` deserves its own section because it applies across multiple workloads.
- `AWS account connection` belongs in `Stacktape Console` because it is a distinct workflow with enough detail and UI-specific context.

## Notable Product-Surface Reminders

These are easy to miss and should be considered when writing or validating the eventual docs:

- Stacktape Console now covers significant functionality: projects, stages, config editor, GitOps, runners, alarms, budgets, issues, alert channels, notifications, guardrails, team management, billing, domains, secrets, SSM params, AWS account connection, and 3rd-party providers.
- `budgetControl` root config was removed; budgets are Console/server-side.
- new AI/MCP workflows exist and deserve first-class docs.
- issues tracking and grouped runtime errors are now product features.
- grouped CLI pages are preferred over one-page-per-command docs.

## Open Items For Later Discussion

1. Exact page list and ordering inside `Getting Started`
2. Exact page templates per section type
3. How to implement reusable content for SSR framework pages
4. Which sections should be expanded by default in the sidebar
5. Which reference material should be generated automatically vs hand-authored
6. How to tailor docs for different audiences without fragmenting the nav

## Page Backbones

These are soft backbones, not rigid schemas.

The writer should treat them as the default anchor structure for a page type, but may:

- add any additional sections that improve the page
- omit a backbone section if it would be genuinely low-value for that page

### Resource page backbone

1. `When to Use`
2. `Basic Example`
3. `Key Configuration Areas`
4. `How It Works`
5. `API Reference`

Common optional additions:

- `Connecting to Other Resources`
- `Development Notes`
- `Production Notes`
- `Pricing`
- `Referenceable Parameters`
- `Common Pitfalls`
- `Related Pages`

### Choosing page backbone

1. `Quick Recommendation`
2. `Comparison Table`
3. `When to Choose Each Option`
4. `Cost and Operational Tradeoffs`
5. `Related Pages`

Common optional additions:

- `Common Decision Patterns`
- `Migration Notes`
- `Team Fit`

### Recipe page backbone

1. `What You’ll Build`
2. `Stacktape Configuration`
3. `Application Code`
4. `How It Works`
5. `Deploy`
6. `Next Steps`

Common optional additions:

- `Final Architecture`
- `Project Structure`
- `Develop Locally`
- `Variations`

### Console workflow page backbone

1. `What This Part of the Console Does`
2. `Walkthrough`
3. `Common Tasks`
4. `Troubleshooting`
5. `Related Features`

Common optional additions:

- `When You’ll Use It`
- `Key Concepts`
- `Permissions`
- `Tips`
- `Screenshots`

### CLI command page backbone

1. `What It Does`
2. `Usage`
3. `Important Flags`
4. `Examples`
5. `Related Commands`

Common optional additions:

- `When to Use It`
- `How It Works`
- `Common Workflows`
- `Gotchas`
