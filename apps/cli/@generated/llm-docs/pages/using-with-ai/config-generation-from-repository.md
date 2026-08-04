# AI Config Generation


> **Info:** The Console's AI config generator is in active development. The workflow described below reflects the current implementation, but details may change as the feature evolves.


The Stacktape Console includes an AI config generator that creates a starting Stacktape configuration from an existing Git repository. Select a repository and branch, run the generator, and then save the resulting configuration to a template in the [visual config editor](/stacktape-console/visual-config-editor) for review and editing.


> **Info:** This page covers the Console's AI config generator. Stacktape also integrates with AI coding assistants through the [MCP server](/using-with-ai/mcp-server-setup) and supports [Claude Code, Cursor, Windsurf, and other tools](/using-with-ai/ai-coding-assistant-integrations). See the [AI workflows overview](/using-with-ai/overview) for a comparison of all AI-assisted paths.


## When to use

AI Config Generation gives you a starting Stacktape config from an existing codebase, so you can review and edit instead of writing one from scratch. Use it when:

- **You have an existing project** and want Stacktape to infer the right resources rather than writing a config from scratch.
- **You're evaluating Stacktape** and want to see what a real config looks like for your codebase, not for a generic starter project.
- **You want a first config draft from an existing repository** — run the generator, then review the generated resources and wiring yourself rather than writing everything from scratch.

## When NOT to use

AI Config Generation is not the right fit for every project. Skip it when the overhead of reviewing a generated config outweighs writing one directly.

- **Starting from scratch** — if you don't have a codebase yet, use [`stacktape init`](/cli/init) to scaffold from a starter project instead. Starters come with both code and a matching config.
- **Simple single-function projects** — writing a config for one Lambda function takes less time than running the generator. See the [configuration guide](/getting-started/configure-your-stack).
- **You need full control from the start** — the generator produces a starting point. If you already know your exact infrastructure requirements, writing the config directly gives you precise control without a review step.

## How it works

When you start generation, the Console processes the selected repository and branch through its AI generation pipeline. Input controls are disabled while the pipeline is running. When generation completes, you can review the result and save it to the selected template in the config editor.

## Using the generator

AI Config Generation runs inside the Config Editor page in the [Stacktape Console](/stacktape-console/console-overview). You select a template, choose a repository type (public or private), provide a repository and branch, then start the generation run. The steps below walk through each part of this flow.

### Open the generation modal

Navigate to the **Config Editor** page in the [Stacktape Console](/stacktape-console/console-overview). After selecting a template, the Config Editor receives AI generation controls. The generator flow asks for a repository type, repository, and branch before it starts.

### Select a repository type

Inside the generation interface, choose whether to generate from a **public** or **private** repository using the toggle at the top.

**Public repositories** — enter the full Git URL directly into the "Repository URL" field (e.g., `https://github.com/your-org/your-repo`). No Git provider connection is needed.

**Private repositories** — select from repositories available through your connected Git provider installations. If no providers are connected, the dropdown shows "You need to connect a Git provider first." Click **Connect new Git provider** in the Console to set up a [Git provider integration](/ci-cd-and-gitops/gitops-with-console). Once a Git provider is connected, repositories available to Stacktape appear in the dropdown. If none are available, the dropdown shows "No repositories available."

### Select a branch

Pick the branch you want to generate from using the **Branch** dropdown. When the branch list contains a default branch, the Console auto-selects it. Choose a feature branch if it contains infrastructure changes you want reflected in the generated config. The dropdown shows "Please select a git repository first" until a repository is provided.

### Start generation

Start the generation process. The start control is disabled until both a repository and a branch are selected — the tooltip reads "Please select Git repository and branch to generate config from." Once generation starts, all input controls (repository type, URL, branch) are disabled while the pipeline runs.

### Review and save

When generation finishes, you can edit the resulting configuration in the config editor and save it to the selected template. Templates created for a new stage may be read-only in the Config Editor — if so, edit the config from the stage configuration page instead.


> **Info:** Treat generated output as a draft. Before deploying, review resource choices and add any project-specific settings such as secrets, domains, and sizing.


## After generation

The items below are general Stacktape deployment best practices — they are not specific to the AI generator, but they apply to any generated config you plan to deploy:

1. **Review resource types** — confirm each resource maps to the correct Stacktape resource type. For example, verify that an API is a [Lambda function](/resources/compute/lambda-function) vs. a [web service](/resources/compute/web-service), or that a frontend uses the right SSR resource ([Next.js](/resources/frontend/nextjs), [Nuxt](/resources/frontend/nuxt), [Astro](/resources/frontend/astro), etc.).

2. **Add secrets** — use [`$Secret()`](/configuration/directives) directives to reference secrets stored in the [Stacktape Console](/configuration/secrets). Never hard-code sensitive values in the config.

3. **Configure custom domains** — add [custom domains](/resources/networking/custom-domains) for production-facing services.

4. **Adjust resource sizing** — review memory, CPU, timeout, and scaling settings for each resource. Defaults may not match your workload requirements.

5. **Set up CI/CD** — connect [GitOps](/ci-cd-and-gitops/gitops-with-console) for automated deployments on push and PR previews.

6. **Production hardening** — add alarms, budgets, and guardrails. See [Going to production](/getting-started/going-to-production) for the full checklist.

## Tips for better results

Before running generation, make sure the selected branch contains the application code and build files you expect Stacktape to inspect. A clean, up-to-date branch gives the generator the best starting point — stale or incomplete code on the branch can lead to a config that doesn't reflect your project's current state.

## FAQ

### How is this different from `stacktape init`?

[`stacktape init`](/cli/init) scaffolds a new project from a predefined starter template — it creates boilerplate code and a matching config. AI Config Generation analyzes an **existing** codebase and produces a config tailored to what's already in the repository. Use `init` when starting fresh; use AI Config Generation when you already have code to deploy.

### Do I need to connect a Git provider for public repositories?

No. For public repositories, paste the Git URL directly into the URL input field. A Git provider connection is only required for private repositories where authentication is needed to clone the code.

### Why can't I edit the generated config in the editor?

You can normally edit the generated config in the [visual config editor](/stacktape-console/visual-config-editor) and save it to the selected template. However, templates created for a new stage may be read-only in the Config Editor — in that case, edit the config from the stage configuration page instead.

### What if generation fails?

If initialization fails, the Console shows "Failed to initialize AI config generation." Check that the repository URL, selected repository, and branch are correct, then try again.

### Is my repository data safe?

The generation pipeline runs on Stacktape's infrastructure, and private repositories require access through a connected Git provider. Do not commit secrets or production credentials to the repository. For current details about data handling and retention, consult Stacktape's privacy terms or contact support; this page does not make a retention guarantee.

### Does the generator produce a production-ready config?

No. Treat any generated config as a starting point: review resource choices, secrets, domains, sizing, alarms, budgets, and CI/CD before deploying. See [Going to production](/getting-started/going-to-production) for the complete production-readiness checklist.
