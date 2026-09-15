# Maintainer documentation

Use the document that owns the decision or procedure. Keep these guides current when their behavior changes.

| Need                                                                 | Document                                                                                                       |
| -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Repository boundaries and ownership                                  | [Architecture](architecture.md)                                                                                |
| Local tools, applications and development commands                   | [Development](development.md)                                                                                  |
| Choosing tests, live AWS ownership and reporting results             | [Testing](testing.md)                                                                                          |
| Publishing CLI binaries, npm packages and installers                 | [Releasing](releasing.md)                                                                                      |
| Generated files and their source of truth                            | [Generated files](generated-files.md)                                                                          |
| Credential storage and handling                                      | [Secrets](secrets.md)                                                                                          |
| Testing imports and packaging against real projects                  | [Project qualification](project-qualification.md) and its [hardening workflow](hardening-work-instructions.md) |
| Console browser identities, reusable fixtures and live test commands | [Console E2E setup](../apps/console/e2e/README.md) (private)                                                   |

## Internal v4 planning

These documents live in the optional private Console repository because they contain internal launch planning for the
whole product. They are not required to build or test a public clone.

- [V4 launch readiness](../apps/console/documents/releases/v4-readiness.md): agents maintain concrete production
  migration, configuration, publication and cutover actions discovered during their work.
- [Owner's v4 checklist](../apps/console/documents/releases/v4-product-checklist.md): the owner writes the remaining
  product, documentation, website and UX priorities.

## Where task results belong

Keep reusable tests and fixtures in source control, and operational procedures beside the code that owns them. Put
per-run logs, screenshots where permitted, resource IDs and recovery state in ignored `.stacktape/` task files or CI
artifacts. Summarize the outcome and limitations in the task handoff or commit/PR description. If another task needs
that evidence, supply its location and source/artifact revision; an unavailable local file is not proof of a pass.

Do not add a new committed session diary, completed acceptance checklist or continuation document for each task. Move an
outstanding v4 launch action into the shared launch checklist, and move a reusable lesson into its existing guide.
Historical task documents can be recovered from Git when needed; they do not define today's release requirements.
