# Testing the Stacktape extension

## 1. Launch it

1. Open the monorepo root in VS Code.
2. Press F5 and choose one of the `VS Code extension` launch configurations.
3. Open `app.stacktape.yml` in the Extension Development Host.

## 2. Check the language features (in `app.stacktape.yml`)

| #   | Feature                   | What to press / do                                                                        | Expected result                                                         |
| --- | ------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 1   | **Language / precedence** | Look at the **bottom-right status bar**                                                   | Says **Stacktape** (not "YAML")                                         |
| 2   | **Reference validation**  | Look at `ghostTable`, `missingTable`, `nope` (and open Problems with **Ctrl+Shift+M**)    | Yellow squiggles: _Unknown resource/variable …_                         |
| 3   | **No false positives**    | Look at `postsTable` and `appName`                                                        | No "unknown" warning on them                                            |
| 4   | **Hover**                 | Hover the mouse over **`postsTable`** inside `$ResourceParam('postsTable', …)`            | Tooltip: _References resource **postsTable** of type `dynamo-db-table`_ |
| 5   | **Go to definition**      | Click **`postsTable`** in that directive, press **F12** (or Ctrl+Click)                   | Cursor jumps up to the `postsTable:` definition                         |
| 6   | **Completion**            | Put the cursor **between the empty quotes** in `$ResourceParam('')`, press **Ctrl+Space** | Suggests `postsTable`, `apiGateway`, `api`                              |
| 7   | **Schema hover/complete** | Hover a key like `type:`; or after `type: ` press **Ctrl+Space**                          | Schema docs / value suggestions (existing behavior still works)         |

## 3. Check the commands

With `app.stacktape.yml` open:

- **Editor title bar** (top-right of the editor): a **Deploy** (rocket) and **Preview** icon.
- **Right-click** in the editor → **Stacktape: …** entries.
- **Command Palette** (**Ctrl+Shift+P**) → type **Stacktape**.
- Run **Stacktape: Validate config** → it prompts for **stage**, then **region**, then opens a terminal running
  `stacktape validate --stage … --region … --configPath …`. _(If the Stacktape CLI isn't installed you'll see "command
  not found" — that still confirms the command is wired correctly.)_

Then open **`app.stacktape.ts`** → the same buttons/commands appear there too (the schema features intentionally don't
apply to `.ts`).

## 4. Check the settings

Open Settings (**Ctrl+,**) and search **stacktape**:

- Turn **Validate References** off → the _Unknown resource/variable_ squiggles disappear.
- Set **Trace: Server** = **verbose** → View ▸ Output ▸ choose the **Stacktape** channel → you'll see LSP traffic.

## 5. Server-only smoke test (no UI)

From the monorepo root:

```
pnpm --filter vscode-stacktape build
pnpm --filter vscode-stacktape test
```

The second command runs focused unit tests and a bundled LSP smoke test.
