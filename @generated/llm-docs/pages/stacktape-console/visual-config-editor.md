# Visual Config Editor

The Stacktape Console includes a browser-based config editor for creating and editing Stacktape configurations. Built on Monaco (the engine behind VS Code), it provides IntelliSense with hover documentation, autocompletion, preset templates, and AI-powered config generation from Git repositories — so you can build infrastructure configurations without leaving the browser.


> Screenshot: Stacktape Console's visual config editor showing a Stacktape configuration with IntelliSense autocompletion suggestions for resource properties Caption: The config editor provides IntelliSense with hover docs and autocompletion for Stacktape configuration properties.


## When to use the config editor

The config editor is most valuable in three scenarios:

- **Getting started with Stacktape** — preset templates and AI generation produce a working config faster than writing one from scratch. You get IntelliSense and a CloudFormation preview without installing anything locally.
- **Prototyping infrastructure changes** — iterate on config changes in the browser with instant feedback. The CloudFormation template and tree views let you inspect what AWS resources Stacktape will create before you commit anything to your project.
- **Team collaboration in the Console** — share named templates across team members who work primarily in the Stacktape Console rather than the CLI.

## When NOT to use the config editor

For mature projects where the Stacktape config lives in version control, most teams edit `stacktape.ts` directly in their IDE (VS Code, Cursor, or similar). The `stacktape` npm package provides the same IntelliSense locally, and you get the full benefits of TypeScript — variables, conditionals, loops, and IDE refactoring tools. The config editor is a drafting tool, not a replacement for source-controlled configuration.

## What the config editor does

The visual config editor is a Monaco-powered editing environment for Stacktape configurations. Open the config editor page in the Stacktape Console to start writing or editing configs. The editor loads a selected template and provides language-aware features — hover over any property to see its documentation (type, defaults, allowed values) and use autocompletion to discover available properties and resource types.

The editor provides three views for inspecting your configuration from different angles: the main editor, a compiled CloudFormation template preview, and a tree view of the compiled resources. A preset menu lets you start from ready-made configurations for common project types, and AI generation can produce a full config from an existing Git repository.

Configurations are stored as **templates** — named configs managed in the Console. Think of templates as saved drafts: you write and refine your config in the editor, then copy it into your project as a `stacktape.ts` or `stacktape.yaml` file for use with the [CLI](/cli/deploy) or [GitOps](/ci-cd-and-gitops/gitops-with-console).

## Editor views

The config editor provides three views, each showing a different representation of your configuration.

### Editor

The main editing view where you write and modify your Stacktape config. Hover over any property to see its documentation, including type information, defaults, and allowed values. If autocompletion suggestions don't appear automatically, trigger them manually with `Ctrl+Space` on Windows/Linux or `Cmd+Space` on Mac.

The editor also includes a preset menu for populating the editor with ready-made configurations for common project types. Selecting a preset replaces the editor contents with a working configuration that you can then customize — change resource names, adjust packaging paths, set environment variables, and modify other properties to match your project. Presets are the fastest way to go from an empty editor to a deployable config.

### CloudFormation template

A read-only view showing your Stacktape config statically compiled into an AWS CloudFormation template. Use this to inspect what AWS resources Stacktape creates from your configuration — security groups, IAM roles, ECS services, Lambda functions, and other infrastructure. This view is an approximation: some values are only resolved during actual deployment, so the output is not 100% accurate. Deploy-time values like [secret](/configuration/secrets) references and [resource parameters](/configuration/referenceable-parameters) appear as placeholders.

The CloudFormation preview is useful for understanding your stack's structure, verifying IAM permissions, and debugging deployment issues before running [`stacktape deploy`](/cli/deploy).

### Tree view

A hierarchical tree view of the compiled CloudFormation resources. Like the CloudFormation template view, this representation is approximate and some values are only known at deploy time. The tree view is useful for navigating large configurations and understanding the relationships between compiled resources without reading raw CloudFormation JSON.

## Templates

The config editor page includes a template selector for choosing which saved template to load into the editor. Select a template to load its contents, where you can modify and save it. Templates are named configurations stored in the Stacktape Console — they serve as a drafting space for building infrastructure configs before copying them into your project repository.

When you edit a template's contents and save, the updated config is persisted back to the same template. Templates are tied to your organization, so team members with access can view and work with the same set of templates.


> **Info:** Templates created for a specific project stage (via "Add new stage" in the Console) appear as read-only in the config editor. The editor shows a link to the stage's configuration page where you can edit them. This prevents accidental edits to configs that are actively used by the deployment pipeline.


## AI config generation

The config editor can generate a Stacktape configuration from an existing Git repository. This feature analyzes your codebase and produces a configuration tailored to your project's structure, framework, and dependencies — detecting whether you're running a Next.js app, a Python API, a containerized service, or something else.

### Starting a generation

Open the AI generation dialog in the editor. The flow walks you through three steps:

1. **Choose repository type** — **Private** or **Public**.
   - **Private**: select a repository from your connected Git provider installations. The repository dropdown lists all repositories accessible through your connected providers. If no repositories appear, the dropdown shows "No repositories available" (when you have installations but none match) or "You need to connect a Git provider first" (when no providers are connected). A link to the Git integrations page in the Console lets you connect GitHub, GitLab, or other providers.
   - **Public**: paste any public Git repository URL into the "Repository URL" field.
2. **Select a branch**. The editor auto-selects the default branch when available. You can choose a different branch from the dropdown.
3. **Start generation**. The start button is disabled until both a repository and branch are selected — hovering shows "Please select Git repository and branch to generate config from." The editor creates a temporary project for the generation process and removes it automatically when generation completes, regardless of whether it succeeds or fails.

Once complete, the generated config appears in the editor. Review and customize it before deploying. See [AI config generation](/using-with-ai/config-generation-from-repository) for more detail on how the repository analysis works.


> **Warning:** AI-generated configs are a starting point, not a finished product. Always review the generated resources, packaging paths, and environment variables before deploying.


## Common tasks

### Using IntelliSense

As you type, the editor provides autocompletion suggestions for property names, resource types, and valid values. If suggestions don't appear automatically, press `Ctrl+Space` on Windows/Linux or `Cmd+Space` on Mac to trigger them manually. Hover over any property name to see its documentation, including the expected type, default value, and allowed values.

IntelliSense is especially useful when configuring resources with many options — database engines, container packaging modes, scaling settings, and similar. The hover documentation surfaces the same type information available in the `stacktape` npm package, so you get a comparable experience to editing a `stacktape.ts` file locally.

### Saving changes

When you modify the config, save your changes to persist them to the current template. The editor tracks changes by comparing the current content against the last saved version, so you can tell at a glance whether you have unsaved work.

### Starting from a preset

The editor includes a preset menu with ready-made configurations for common project types — web frameworks, backend APIs, background workers, and similar. Selecting a preset populates the editor with a working configuration. From there, customize resource names, packaging paths, environment variables, and other properties to match your project. Presets are the fastest path from an empty editor to a deployable config without writing everything from scratch.

### Copying your config to a project

Copy the config from the editor and paste it into a `stacktape.ts` or `stacktape.yaml` file in your project directory. The `stacktape.ts` format gives you the same IntelliSense locally via the `stacktape` npm package, plus the ability to use TypeScript variables, conditionals, and loops. Use the config with [`stacktape deploy`](/cli/deploy) to deploy your stack, or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) for automatic deployments on push.

### Editing a stage-linked config

When a template was created for a specific project stage in the Console, it appears as read-only in the config editor. The editor displays a message: "This config can only be edited on the stage configuration page" with a direct link. Navigate there to make changes. This separation prevents accidental edits to configs that are actively used by the deployment pipeline for a specific stage.

## Troubleshooting

### IntelliSense not appearing

If autocompletion doesn't trigger automatically, press `Ctrl+Space` on Windows/Linux or `Cmd+Space` on Mac to invoke it manually. The editor loads language features (type definitions, schema) when it first opens — if IntelliSense is not yet available, wait a moment for the loading to complete.

### CloudFormation preview shows placeholder values

The CloudFormation template view is a static compilation. Values that depend on deploy-time information — such as resolved [secrets](/configuration/secrets), [resource parameters](/configuration/referenceable-parameters), or stage-specific values — appear as placeholders. This is expected behavior. The actual deployment resolves all values correctly.

### Config linked to a stage is read-only

Templates created for a specific project stage (via "Add new stage" in the Console) appear as read-only in the config editor. This is by design — edit them on the stage's own configuration page instead. The editor shows a direct link to navigate there.

### AI generation button is disabled

The generation button requires both a repository and a branch to be selected before you can start. For private repositories, you also need at least one connected Git provider installation. If the repository dropdown shows "No repositories available" or "You need to connect a Git provider first", connect a provider from the Git integrations page in the Stacktape Console.

### No repositories available for AI generation

For private repository generation, the editor pulls repositories from your connected Git provider installations. If the dropdown is empty despite having installations, check that the installation has access to the repository you need. The editor shows how many Git provider installations you have and provides a link to connect additional providers.

## Related features

- [Configuration files](/configuration/configuration-files) — Understand YAML vs TypeScript config formats and the `defineConfig` pattern.
- [AI config generation](/using-with-ai/config-generation-from-repository) — Deep dive into how the AI generator analyzes your repository.
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — Auto-deploy configs when you push to your repository.
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — How projects and stages relate to configs.
- [Secrets](/configuration/secrets) — Reference secrets in your config with the `$Secret()` directive.
- [Connecting resources](/configuration/connecting-resources) — Use `connectTo` to wire resources together.

## FAQ

### Can I use the config editor without deploying?

Yes. The config editor is a standalone tool for writing and managing Stacktape configurations as templates. You can create, edit, and save templates without triggering any deployment. When you're ready, copy the config to your project and run [`stacktape deploy`](/cli/deploy), or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) to deploy automatically on push. The editor is useful for prototyping infrastructure configurations before committing them to your repository.

### Should I use the visual config editor or my local IDE?

Both work well, and many teams use both at different stages. The config editor is best for getting started — presets and AI generation help you build a working config quickly without installing anything. Once your project matures and the config lives in version control, most teams edit `stacktape.ts` directly in their IDE using the [TypeScript config](/configuration/configuration-files) format, which gives you the same IntelliSense locally via the `stacktape` npm package. The config editor remains useful for quick prototyping and exploring new resource types.

### Can I generate a config from a private repository?

Yes. Choose the **Private** repository type in the AI generation dialog. The dropdown lists repositories from your connected Git provider installations (GitHub, GitLab, or other providers). If no repositories appear, you need to connect a Git provider first — the editor provides a link to the Git integrations page in the Console where you can set up the connection.

### What is the difference between templates and config files?

Templates are named configurations stored in the Stacktape Console. They exist in the browser-based editor for drafting and iterating. Config files (`stacktape.ts` or `stacktape.yaml`) live in your project repository and are what the [CLI](/cli/deploy) and [GitOps](/ci-cd-and-gitops/gitops-with-console) system use for deployments. You can copy a template's contents into a config file, or edit config files directly in your IDE with the same TypeScript IntelliSense provided by the `stacktape` npm package.

### Is the CloudFormation preview the exact template that gets deployed?

The CloudFormation preview is a static approximation. It shows what AWS resources Stacktape creates from your configuration, but some values are only resolved during actual deployment. Deploy-time values like [secret](/configuration/secrets) references, [resource parameters](/configuration/referenceable-parameters), and stage-specific substitutions appear as placeholders. The preview is useful for understanding your stack's structure and catching configuration errors early, but the exact template used during deployment may differ in these dynamic values.

### Can I edit a stage-linked config in the editor?

No — templates created for a specific project stage appear as read-only in the config editor. This prevents accidental changes to configs that are actively used by the deployment pipeline. The editor shows a direct link to the stage's configuration page where you can make edits. See [organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) for more on how stages relate to configs.

### What happens if AI config generation fails?

The generation process creates a temporary project in the Console, runs the analysis, and cleans up the temporary project automatically — regardless of whether generation succeeds or fails. If generation fails, check that the repository URL is correct and the branch exists. For private repositories, verify that your Git provider installation has access to the repository. You can retry immediately from the same dialog.

### Does the editor work with both TypeScript and YAML?

Stacktape supports both `stacktape.ts` (TypeScript) and `stacktape.yaml` config formats. The config editor provides IntelliSense for writing configurations. When you copy a config from the editor to your project, save it as whichever format your team prefers. TypeScript configs offer richer type checking and the ability to use variables and logic; YAML configs are simpler for straightforward setups. See [configuration files](/configuration/configuration-files) for details on both formats.

### What is the CloudFormation template view useful for?

The CloudFormation template view lets you see which AWS resources Stacktape generates from your config — IAM roles, ECS services, Lambda functions, security groups, and other infrastructure. This is useful for understanding what your stack looks like under the hood, verifying permissions, and debugging deployment issues. Keep in mind that deploy-time values appear as placeholders, so the preview shows structure, not exact runtime values.

### Config editor vs stacktape init — when to use which?

[`stacktape init`](/cli/init) scaffolds a new Stacktape project locally from a starter template and writes the config file directly to disk. The config editor in the Console lets you draft configs in the browser with IntelliSense, presets, and AI generation. Use `stacktape init` when you want a project scaffold (including application code, not just config). Use the config editor when you want to explore resource types, try different configurations, or generate a config from an existing repository without touching your local environment.
