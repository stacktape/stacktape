# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Next.js documentation site for Stacktape, a cloud deployment platform. More about Stacktape is in
[about-stacktape](./about-stacktape.md). The site uses MDX for content, TypeScript for the codebase, and runs on port
9001 in development. It features dynamic documentation generation from YAML code snippets and schema files.

## Architecture

### Content Structure

- **docs/**: Primary MDX documentation files organized by category
  - **getting-started/**: Introduction and setup guides
  - **compute-resources/**: Lambda functions, web services, batch jobs
  - **database-resources/**: DynamoDB, RDS, Redis, OpenSearch
  - **other-resources/**: Load balancers, CDNs, buckets, etc.
  - **security-resources/**: Authentication, firewalls, bastions
  - **3rd-party-resources/**: MongoDB Atlas, Upstash integrations
  - **configuration/**: Deployment config, hooks, overrides
  - **cli/**: CLI command documentation
  - **sdk/**: SDK method documentation
  - **user-guides/**: How-to guides and tutorials

- **code-snippets/**: YAML configuration examples referenced by docs
- **intermediate-mdx/**: MD files generated from this documentation for Context7 integration (irrelevant for this
  project itself)
- **@generated/**: Stacktape core project exports JSON schema for Stacktape configuration, CLI commands and SDK methods.
  From those, certain parts of this documentation are generated. This directory includes the exported schemas.

## Documentation navigation groups

The documentation pages are grouped into groups:

- **Getting Started** - (/getting-started)
- **CLI** - (/cli)
- **SDK** - (/sdk)
- **Compute resources** - (/compute-resources)
- **Database resources** - (/database-resources)
- **Security resources** - (/security-resources)
- **Other Resources** - (/other-resources)
- **3rd party resources** - (/3rd-party-resources)
- **Extending Stacktape** - (/extending)
- **User Guides** - (/user-guides)
- **Configuration** - (/configuration)
- **Migration guides** - (/migration-guides)

### Key Components

- **Dynamic routing**: Uses `[[...slug]].tsx` for catch-all documentation routes
- **MDX processing**: Custom remark/rehype plugins for code embedding

### Auto-generation scripts

- **generate-cli-pages.ts**: Auto-generates CLI command documentation from CLI commands JSON schema
- **generate-sdk-pages.ts**: Auto-generates SDK method documentation from SDK methods JSON schema
- **generate-yaml-examples/**: Generates YAML examples API reference. For example, Web Service API docs to
  [web-service](./docs/compute-resources/api-reference/web-service.mdx)

### MDX components

This project uses many different custom MDX components. They are defined in **src/components/Mdx/index.ts**. Some of
them might need an explanation:

- **Jargon** - words (terms), delimited by `_`, e.g. `_Term that users my not understand_` are rendered as <Jargon />
  component. When user hovers over them, it shows their description (explanation). These descriptions are defined in
  **docs/jargon.yml**
- **PropertiesTable**, e.g. `<PropertiesTable definitionName="..." searchForReferencesInDefinition="..." />` expandable
  table that show multiple properties of the specified definition from the Stacktape config schema (in
  @generated/current-config-schema.json)
- **PropDescription**, e.g. `<PropDescription definitionName="..." propertyName="..." descType="ld or sd" />` simple
  text extracting description from JSON schema field from the Stacktape config schema (in
  @generated/current-config-schema.json)
- **Referenced code snippets**, e.g. `embed:lambda-functions/event-schedule.stp.yml` these use the same <CodeBlock>
  component to render the as inline snippets, but take their content from the **code-snippets/** directory.

## Code rules

- To interact with file system, always use `fs-extra` package
- To import packages, always use import only part of the package, e.g. `import { readFile } from 'fs-extra'`
- React component should use function keyword, e.g. `function MyComponent() {}`
- Prefer using inline types to type functions, e.g. `const myFunc = ({ property }:{ property: string }) => { ... }`
- To write helper functions, prefer arrow functions, e.g. `const myFunc = () => {}`
- Only use classes when necessary. Prefer writhing procedural/functional code. E.g. just write 3 arrow functions,
  instead of a class with 3 methods.
- Prefer typescript types over interfaces.
- Always use emotion css-in-js for styling in React components. Use css prop with object-based styles, e.g.
  `<div css={{ color: 'red' }}></div>`
- Use emotion even for global styles, e.g. `<Global styles={{ color: 'red' }} />`

## Terminal rules

- Always use `bun` to run scripts. Not `node`, not `npm`, not `yarn`.
- To run scripts in `package.json` always use `bun run <<script:name>>`.
- To run scripts not in `package.json` use `bun run <<script-name.ts>>`.
- Always run scripts from root project directory
