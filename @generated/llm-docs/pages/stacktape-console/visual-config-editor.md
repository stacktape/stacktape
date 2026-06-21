# Visual Config Editor

The Stacktape Console includes a browser-based config editor for selecting, editing, and saving Stacktape configuration templates. It provides hover documentation and autocompletion shortcuts for Stacktape configuration properties, includes a preset menu, and can start AI config generation from a Git repository — so you can build infrastructure configurations without leaving the browser.


> Screenshot: Stacktape Console's visual config editor showing a Stacktape configuration with autocompletion suggestions for resource properties Caption: The config editor provides hover documentation and autocompletion for Stacktape configuration properties.


## When to use the config editor

The config editor is most valuable in three scenarios:

- **Getting started with Stacktape** — the editor includes a preset menu and can start AI config generation from a Git repository, so you can get started without writing a config from scratch. You get hover docs and a CloudFormation preview without installing anything locally.
- **Prototyping infrastructure changes** — iterate on config changes in the browser. The CloudFormation template and tree views let you inspect the compiled CloudFormation resources generated from your Stacktape config.
- **Working in the Console** — manage named configuration templates for the selected organization directly in the Console.

## When NOT to use the config editor

For mature projects where the Stacktape config lives in version control, most teams edit `stacktape.ts` directly in their IDE (VS Code, Cursor, or similar). A local [TypeScript config](/configuration/configuration-files) gives you variables, conditionals, loops, and IDE refactoring tools. The config editor is a tool for working with Console-managed templates, not a replacement for source-controlled configuration.

## Editor views

The config editor provides three views, each showing a different representation of your configuration.

### Editor

The main editing view where you write and modify your Stacktape config. Hover over any property to see its documentation. Trigger autocompletion with `Ctrl+Space` on Windows/Linux or `Cmd+Space` on Mac.

The editor also exposes a preset menu for starting from a ready-made configuration.

### CloudFormation template

A read-only view showing your Stacktape config statically compiled into an AWS CloudFormation template. Use this to inspect the compiled CloudFormation resources generated from your configuration. The template is statically compiled and is not 100% accurate because some information is known only during deployment.

### Tree view

A hierarchical tree view of the compiled CloudFormation resources. Like the CloudFormation template view, this representation is not 100% accurate because some information is known only during deployment. The tree view is useful for navigating large configurations and understanding the relationships between compiled resources without reading raw CloudFormation JSON.

## Templates

The config editor page includes a template selector for choosing which saved template to load into the editor. Selecting a template loads its content into the editor, where you can modify and save it. Saving updates that template for the selected organization.


> **Info:** Templates marked as created in the Console for a new stage are read-only in the config editor. The editor displays: "This config can only be edited on the stage configuration page" with a link to that page.


## AI config generation

The config editor can start AI config generation from a selected public or private Git repository and branch. See [AI config generation](/using-with-ai/config-generation-from-repository) for details on how the repository analysis works.

### Starting a generation

Open the AI generation dialog in the editor. To start AI config generation, choose a repository type, provide or select a repository, choose a branch, then start generation:

1. **Choose repository type** — **Private** or **Public**.
   - **Private**: select a repository from your connected Git provider installations. The repository dropdown lists all repositories accessible through your connected providers. If no repositories appear, the dropdown shows "No repositories available" (when you have installations but none match) or "You need to connect a Git provider first" (when no providers are connected). The editor provides a "Connect new Git provider" link to set up a [Git provider integration](/ci-cd-and-gitops/gitops-with-console).
   - **Public**: paste a public Git repository URL into the "Repository URL" field.
2. **Select a branch**. The editor auto-selects the default branch when available. You can choose a different branch from the dropdown.
3. **Start generation**. The start control is disabled until both a repository and branch are selected. The configured disabled text is: "Please select Git repository and branch to generate config from." The editor passes a cleanup callback that deletes the temporary AI-generation project.

The editor starts AI config generation for the selected repository and branch. See [AI config generation](/using-with-ai/config-generation-from-repository) for details on the generation process and reviewing the result.


> **Warning:** AI-generated configs are a starting point, not a finished product. Always review the generated resources, packaging paths, and environment variables before deploying.


## Common tasks

### Saving changes

When you modify the config, save your changes to persist them to the current template. Saving updates the template content for the selected organization.

### Using the config in a project

When moving to a local project, create a `stacktape.ts` file (recommended) or `stacktape.yaml` in your project, then run [`stacktape deploy`](/cli/deploy) to deploy your stack, or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) for automatic deployments on push. Use [`stacktape init`](/cli/init) when you're starting a new local project.

## Troubleshooting

### Autocompletion not appearing

Trigger autocompletion with `Ctrl+Space` on Windows/Linux or `Cmd+Space` on Mac.

### CloudFormation preview shows approximate values

The CloudFormation template view is a static compilation. It is not 100% accurate because some information is known only during deployment. This is expected behavior — the actual deployed template resolves all values at deploy time.

### Config linked to a stage is read-only

Templates marked as created in the Console for a new stage are read-only in the config editor. The editor links to the stage's configuration page where you can make edits.

### AI generation button is disabled

The generation button requires both a repository and a branch to be selected before you can start. For private repositories, you also need at least one connected Git provider installation. If the repository dropdown shows "No repositories available" or "You need to connect a Git provider first", use the "Connect new Git provider" link in the editor to set up a [Git provider integration](/ci-cd-and-gitops/gitops-with-console).

### No repositories available for AI generation

For private repository generation, the editor pulls repositories from your connected Git provider installations. If the dropdown is empty despite having installations, check that the installation has access to the repository you need. The editor shows how many Git provider installations you have and provides a link to connect additional providers.

## Related features

- [Configuration files](/configuration/configuration-files) — TypeScript and YAML config formats and the `defineConfig` pattern.
- [AI config generation](/using-with-ai/config-generation-from-repository) — Deep dive into how the AI generator analyzes your repository.
- [GitOps with Console](/ci-cd-and-gitops/gitops-with-console) — Auto-deploy configs when you push to your repository.
- [Organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) — How projects and stages relate to configs.
- [Secrets](/configuration/secrets) — Reference secrets in your config with the `$Secret()` directive.
- [Connecting resources](/configuration/connecting-resources) — Use `connectTo` to wire resources together.

## FAQ

### Can I use the config editor without deploying?

Yes. The config editor is a standalone tool for working with Stacktape configuration templates in the Console. You can select, edit, and save templates without triggering any deployment. When you're ready, use a Stacktape config file such as `stacktape.ts` or `stacktape.yaml` in your project and run [`stacktape deploy`](/cli/deploy), or set up [GitOps](/ci-cd-and-gitops/gitops-with-console) to deploy automatically on push.

### Should I use the visual config editor or my local IDE?

Both work well at different stages. The config editor is convenient when you want to draft a config in the Console — for example, when starting from a preset or generating one from a Git repository. Once your project's config lives in version control, most teams edit `stacktape.ts` directly in their IDE using the [TypeScript config](/configuration/configuration-files) format, which gives you variables, conditionals, loops, and IDE refactoring tools.

### Can I generate a config from a private repository?

Yes. Choose the **Private** repository type in the AI generation dialog. The dropdown lists repositories from your connected Git provider installations. If no repositories appear, you need to connect a Git provider first — the editor provides a "Connect new Git provider" link to set up a [Git provider integration](/ci-cd-and-gitops/gitops-with-console).

### What is the difference between templates and config files?

Templates are named Stacktape configurations stored in the Console and edited in the visual config editor. A local project config file is either `stacktape.ts` or `stacktape.yaml`, used by the [CLI](/cli/deploy) for deployments. [GitOps](/ci-cd-and-gitops/gitops-with-console) is another deployment option that works from your repository. To move from a template to a deployable project, use the template content in a Stacktape config file in your project.

### Is the CloudFormation preview the exact template that gets deployed?

The CloudFormation preview is a static approximation. It shows what AWS resources Stacktape creates from your configuration, but it is not 100% accurate because some information is known only during deployment. The preview is useful for understanding your stack's structure before deployment, but the exact template used during deployment resolves all dynamic values.

### Can I edit a stage-linked config in the editor?

No — templates marked as created in the Console for a new stage are read-only in the config editor. The editor links to the stage's configuration page where you can make edits. See [organizations, projects, and stages](/stacktape-console/organizations-projects-and-stages) for more on how stages relate to configs.

### What happens if AI config generation fails?

The generation process creates a temporary project in the Console and runs the analysis. The editor passes a cleanup callback that deletes the temporary AI-generation project. If initialization fails, the Console shows "Failed to initialize AI config generation." Review your repository and branch selections before trying again.

### Can the resulting config be saved as TypeScript or YAML?

The local config file name is either `stacktape.ts` or `stacktape.yaml`. See [configuration files](/configuration/configuration-files) for details on both formats and the benefits of the TypeScript approach.

### What is the CloudFormation template view useful for?

The CloudFormation template view lets you inspect the compiled CloudFormation resources generated from your Stacktape config. This is useful for understanding what AWS infrastructure Stacktape will create before deploying. Keep in mind that it is not 100% accurate because some information is known only during deployment.

### Config editor vs stacktape init — when to use which?

[`stacktape init`](/cli/init) scaffolds a new Stacktape project locally. The config editor in the Console is where you draft and manage configuration templates separately from your local project. Use the config editor when you want to explore resource types, try different configurations, or generate a config from an existing repository; use `stacktape init` when you're starting a new local project from a starter.
