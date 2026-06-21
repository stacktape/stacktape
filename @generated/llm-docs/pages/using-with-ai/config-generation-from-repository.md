# AI Config Generation


> **Info:** The Console's AI config generator is in active development. The workflow described below reflects the current implementation, but details may change as the feature evolves.


The Stacktape Console includes an AI config generator that creates a starting Stacktape configuration from an existing Git repository. Select a repository and branch, run the generator, and then save the resulting configuration to a template in the [visual config editor](/stacktape-console/visual-config-editor) for review and editing.


> **Info:** This page covers the Console's AI config generator. Stacktape also integrates with AI coding assistants through the [MCP server](/using-with-ai/mcp-server-setup) and supports [Claude Code, Cursor, Windsurf, and other tools](/using-with-ai/ai-coding-assistant-integrations). See the [AI workflows overview](/using-with-ai/overview) for a comparison of all AI-assisted paths.


## When to use

AI Config Generation gives you a starting Stacktape config from an existing codebase, so you can review and edit instead of writing one from scratch. Use it when:

- **You have an existing project** and want Stacktape to infer the right resources rather than writing a config from scratch.
- **You're evaluating Stacktape** and want to see what a real config looks like for your codebase, not for a generic starter project.
- **Your project has multiple services** (an API, a frontend, a background worker) and you want them identified and wired together in one pass.

## When NOT to use

AI Config Generation is not the right fit for every project. Skip it when the overhead of reviewing a generated config outweighs writing one directly.

- **Starting from scratch** — if you don't have a codebase yet, use [`stacktape init`](/cli/init) to scaffold from a starter project instead. Starters come with both code and a matching config.
- **Simple single-function projects** — writing a config for one Lambda function takes less time than running the generator. See the [configuration guide](/getting-started/configure-your-stack).
- **You need full control from the start** — the generator produces a starting point. If you already know your exact infrastructure requirements, writing the config directly gives you precise control without a review step.

## How it works

When you start generation, the Console creates a temporary project for the selected repository and branch, then invokes the AI generation pipeline. Input controls are disabled while the pipeline is running. Once generation completes, the temporary project is deleted automatically. You can then save the resulting configuration to the selected template in the config editor.

## Using the generator

AI Config Generation runs inside the Config Editor page in the Stacktape Console. The steps below walk through selecting a repository, choosing a branch, and starting a generation run.

### Open the generation modal

Navigate to the **Config Editor** page in the [Stacktape Console](/stacktape-console/console-overview). After selecting a template, the page renders the config editor with AI generation controls. Use these controls to open the generation modal.

### Select a repository type

Inside the generation interface, choose whether to generate from a **public** or **private** repository using the toggle at the top.

**Public repositories** — enter the full Git URL directly into the "Repository URL" field (e.g., `https://github.com/your-org/your-repo`). No Git provider connection is needed.

**Private repositories** — select from repositories available through your connected Git provider installations. If no providers are connected, the dropdown shows "You need to connect a Git provider first." Click **Connect new Git provider** in the Console to set up a Git provider integration. Once connected, your repositories appear in the dropdown.

### Select a branch

Pick the branch you want to generate from using the **Branch** dropdown. When the branch list contains a default branch, the Console auto-selects it. Choose a feature branch if it contains infrastructure changes you want reflected in the generated config. The dropdown shows "Please select a git repository first" until a repository is provided.

### Start generation

Start the generation process. The start control is disabled until both a repository and a branch are selected — the tooltip reads "Please select Git repository and branch to generate config from." Once generation starts, all input controls (repository type, URL, branch) are disabled while the pipeline runs.

### Review and save

When generation finishes, you can edit the resulting configuration in the config editor and save it to the selected template.


> **Info:** The generated config is a starting point for review, not a deployment-ready config. Review resource types, add secrets, configure domains, and adjust sizing before deploying.


## After generation

Treat any generated config as a starting point. Before deploying, review and extend it following general Stacktape deployment best practices:

1. **Review resource types** — confirm each resource maps to the correct Stacktape resource type. For example, verify that an API is a [Lambda function](/resources/compute/lambda-function) vs. a [web service](/resources/compute/web-service), or that a frontend uses the right SSR resource ([Next.js](/resources/frontend/nextjs), [Nuxt](/resources/frontend/nuxt), [Astro](/resources/frontend/astro), etc.).

2. **Add secrets** — use [`$Secret()`](/configuration/directives) directives to reference secrets stored in the [Stacktape Console](/configuration/secrets). Never hard-code sensitive values in the config.

3. **Configure custom domains** — add [custom domains](/resources/networking/custom-domains) for production-facing services.

4. **Adjust resource sizing** — review memory, CPU, timeout, and scaling settings for each resource. Defaults may not match your workload requirements.

5. **Set up CI/CD** — connect [GitOps](/ci-cd-and-gitops/gitops-with-console) for automated deployments on push and PR previews.

6. **Production hardening** — add alarms, budgets, and guardrails. See [Going to production](/getting-started/going-to-production) for the full checklist.

## Tips for better results

Well-structured repositories give the generator more useful signals to work with:

- **Include a `.env.example` file** — clear variable names (like `DATABASE_URL`, `REDIS_URL`, `S3_BUCKET`) help the generator infer what infrastructure your project requires.
- **Use standard project conventions** — conventional file names and directory structures (`next.config.js`, `prisma/schema.prisma`, `Dockerfile`, standard entry points) are easier for the generator to interpret.
- **Keep dependency files current** — `package.json`, `requirements.txt`, `go.mod`, and similar files signal your project's runtime and infrastructure needs. Make sure they reflect what the project actually uses.
- **Keep Dockerfiles in the project** — if your services use containers, Dockerfiles help the generator understand build steps and service configuration.

## FAQ

### How is this different from `stacktape init`?

[`stacktape init`](/cli/init) scaffolds a new project from a predefined starter template — it creates boilerplate code and a matching config. AI Config Generation analyzes an **existing** codebase and produces a config tailored to what's already in the repository. Use `init` when starting fresh; use AI Config Generation when you already have code to deploy.

### Do I need to connect a Git provider for public repositories?

No. For public repositories, paste the Git URL directly into the URL input field. A Git provider connection is only required for private repositories where authentication is needed to clone the code.

### Can I edit the generated config before deploying?

Yes. You can edit the generated config in the [visual config editor](/stacktape-console/visual-config-editor) and save it to the selected template. Edit any aspect of the config before deploying.

### Can I re-run generation on the same repository?

Yes. Start a new generation at any time from the config editor. Each generation run is independent — a temporary project is created for each run and cleaned up afterward. Saving writes the editor content to the currently selected template.

### What does the generator produce?

The Console starts an AI generation run for the selected repository and branch, then produces a Stacktape configuration. Review the resulting config carefully before saving or deploying — confirm that each resource maps to the correct type and that the wiring between resources matches your project's actual architecture.

### What if generation fails?

If initialization fails, the Console shows "Failed to initialize AI config generation." Check that the repository URL, selected repository, and branch are correct, then try again.

### Is my repository data safe?

The generation pipeline runs on Stacktape's infrastructure. A temporary project is created for the selected repository and branch, then deleted automatically after generation completes. For details on data handling, refer to the [Stacktape Console](/stacktape-console/console-overview) documentation or contact support.

### How does this compare to the MCP server?

AI Config Generation runs in the [Stacktape Console](/stacktape-console/console-overview) and focuses on one task: producing an initial config from a Git repository. Stacktape also has a separate [MCP server](/using-with-ai/mcp-server-setup) for AI coding assistants — see the [MCP server setup page](/using-with-ai/mcp-server-setup) for current capabilities. They solve different problems — use AI Config Generation for the initial config, then use the MCP server or [coding assistant integrations](/using-with-ai/ai-coding-assistant-integrations) for day-to-day development.

### Does the generator produce a production-ready config?

No. Treat any generated config as a starting point: review resource choices, secrets, domains, sizing, alarms, budgets, and CI/CD before deploying. See [Going to production](/getting-started/going-to-production) for the complete production-readiness checklist.

### When should I write a config manually instead?

Write a config manually when you have a simple project (one or two resources), when you already know your exact infrastructure requirements, or when your project uses non-standard patterns that a code analyzer is unlikely to interpret correctly. The [configuration guide](/getting-started/configure-your-stack) and the [visual config editor](/stacktape-console/visual-config-editor) with IntelliSense make manual authoring straightforward.
