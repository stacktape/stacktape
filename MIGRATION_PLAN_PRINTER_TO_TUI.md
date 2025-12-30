# Migration Plan: Printer to TUI

This document outlines the plan to migrate from the legacy `printer` system to the new `TuiManager` system, enabling us to delete the printer module entirely.

---

## Overview

### Current State
- **Printer** (`src/utils/printer/index.ts`): Legacy logging system with spinners, used in 70+ files
- **TuiManager** (`src/utils/tui/index.ts`): New React/Ink-based TUI for deployment phases

### Target State
- Single unified `TuiManager` that handles ALL CLI output
- Named message types for every output (`tui.write('message-name', data)`)
- React components for specialized output (tables, errors, etc.)
- Full TTY/non-TTY support

---

## Phase 1: Extend TuiManager API

### 1.1 Add Named Message System

Add a generic write method that accepts named message types:

```typescript
// New methods to add to TuiManager
write(messageName: string, message: string, data?: Record<string, any>): void
writeError(messageName: string, message: string, data?: Record<string, any>): void
writeLog(messageName: string, message: string, data?: Record<string, any>): void
```

This allows:
- Semantic naming of all output (for future customization, filtering)
- Data attachment for structured logging
- Consistent handling of TTY vs non-TTY

### 1.2 Add Formatting Helpers

Move these from printer to TuiManager:

```typescript
// Formatting methods to add
getLink(link: keyof LinksMap, placeholder: string): string
prettyCommand(command: StacktapeCommand): string
prettyOption(option: StacktapeCliArg): string
prettyResourceName(resourceName: string): string
prettyStackName(stackName: string): string
prettyResourceParamName(param: string): string
prettyConfigProperty(property: string): string
prettyResourceType(type: string): string
prettyFilePath(filePath: string): string
```

### 1.3 Add Error Handling

Add comprehensive error output method:

```typescript
error(error: ExpectedError | UnexpectedError): void
```

This should:
- Format error messages with hints
- Handle stack traces
- Support sentry event IDs
- Work in both TTY and non-TTY modes

### 1.4 Add Announcement Support

```typescript
announcement(message: string, highlight?: boolean): void
```

---

## Phase 2: Add React Components for Specialized Output

### 2.1 Table Component

Create `src/utils/tui/components/Table.tsx`:

```typescript
type TableProps = {
  header: string[];
  rows: string[][];
  // Optional styling options
};
```

Features:
- Pretty borders (ASCII for non-TTY, box-drawing for TTY)
- Column alignment
- Color support for cells

### 2.2 Stack List Component

Create `src/utils/tui/components/StackList.tsx`:

Specialized table for `stack-list` command output with:
- Stack name, stage, status columns
- Color-coded status
- Monthly spend display

### 2.3 Error Component

Create `src/utils/tui/components/Error.tsx`:

For displaying complex errors with:
- Error type header
- Multi-line message support
- Hints section
- Sentry event ID

### 2.4 Generic Message Component

Create `src/utils/tui/components/Message.tsx`:

For info/warn/success/debug/hint messages with:
- Consistent prefix formatting
- Color support
- Log level filtering

---

## Phase 3: Add Non-Phase Mode Support

Currently TUI only works with phases (deploy, delete, etc.). Need to support "simple" mode for commands like:

- `version` - just prints version
- `help` - prints help text
- `stack-list` - prints table
- `stack-info` - prints stack details
- `secret-get` - prints secret value
- etc.

### 3.1 Add Simple Mode to TuiManager

```typescript
// New mode that doesn't require phases
startSimpleMode(): void
stopSimpleMode(): void
```

### 3.2 Update Non-TTY Renderer

Ensure `nonTTYRenderer` handles messages outside of phase context.

---

## Phase 4: Migration by Category

### 4.1 Commands with Phases (Already Using TUI Events)

These commands already use the event system, need minimal changes:

| Command | Files | Changes Needed |
|---------|-------|----------------|
| deploy | `src/commands/deploy/index.ts` | Replace printer.* with tui.* |
| delete | `src/commands/delete/index.ts` | Replace printer.* with tui.* |
| codebuild-deploy | `src/commands/codebuild-deploy/index.ts` | Replace printer.* with tui.* |

### 4.2 Commands Without Phases (Need Simple Mode)

| Command | Files | Changes Needed |
|---------|-------|----------------|
| version | `src/commands/version/index.ts` | `tui.write('version-info', ...)` |
| help | `src/commands/help/index.ts` | `tui.write('help-text', ...)` |
| stack-list | `src/commands/stack-list/index.ts` | Use new Table component |
| stack-info | `src/commands/stack-info/index.ts` | `tui.write('stack-info', ...)` |
| secret-get | `src/commands/secret-get/index.ts` | `tui.write('secret-value', ...)` |
| secret-create | `src/commands/secret-create/index.ts` | `tui.write/success(...)` |
| secret-delete | `src/commands/secret-delete/index.ts` | `tui.success(...)` |
| param-get | `src/commands/param-get/index.ts` | `tui.write(...)` |
| logs | `src/commands/logs/index.ts` | `tui.write('log-entry', ...)` |
| upgrade | `src/commands/upgrade/index.ts` | `tui.write/success(...)` |
| login | `src/commands/login/index.ts` | `tui.write/success(...)` |
| logout | `src/commands/logout/index.ts` | `tui.success(...)` |
| aws-profile-* | Various | `tui.success(...)` |
| defaults-* | Various | `tui.write/success(...)` |
| domain-add | `src/commands/domain-add/index.ts` | `tui.write(...)` |
| bucket-sync | `src/commands/bucket-sync/index.ts` | `tui.write(...)` |
| bastion-tunnel | `src/commands/bastion-tunnel/index.ts` | `tui.write(...)` |
| container-session | `src/commands/container-session/index.ts` | `tui.write(...)` |

### 4.3 Domain Services

| Module | Files | Changes Needed |
|--------|-------|----------------|
| cloudformation-stack-manager | `src/domain/cloudformation-stack-manager/*.ts` | Replace printer.* |
| deployed-stack-overview-manager | `src/domain/deployed-stack-overview-manager/*.ts` | Replace printer.* |
| config-manager | `src/domain/config-manager/**/*.ts` | Replace printer.* |
| template-manager | `src/domain/template-manager/index.ts` | Replace printer.* |
| notification-manager | `src/domain/notification-manager/index.ts` | Replace printer.* |

### 4.4 Utilities

| Module | Files | Changes Needed |
|--------|-------|----------------|
| errors | `src/utils/errors.ts` | Replace printer.* |
| validator | `src/utils/validator.ts` | Replace formatting calls |
| validation-utils | `src/utils/validation-utils.ts` | Replace formatting calls |
| user-code-processing | `src/utils/user-code-processing.ts` | Replace printer.* |
| file-loaders | `src/utils/file-loaders.ts` | Replace printer.* |
| time | `src/utils/time.ts` | Replace printer.debug |
| ssm-session | `src/utils/ssm-session.ts` | Replace printer.debug |
| cloudwatch-logs | `src/utils/cloudwatch-logs.ts` | Replace printer.* |
| formatting | `src/utils/formatting.ts` | Replace printer.* |

### 4.5 Application Services

| Module | Files | Changes Needed |
|--------|-------|----------------|
| global-state-manager | `src/app/global-state-manager/index.ts` | Replace printer.* |
| event-manager | `src/app/event-manager/*.ts` | Replace printer.* |
| application-manager | `src/app/application-manager/index.ts` | Replace printer.* |
| stacktape-trpc-api-manager | `src/app/stacktape-trpc-api-manager/index.ts` | Replace printer.* |
| announcements-manager | `src/app/announcements-manager/index.ts` | Replace printer.* |

### 4.6 Shared Code

| Module | Files | Changes Needed |
|--------|-------|----------------|
| ecs-deployment-monitoring | `shared/aws/ecs-deployment-monitoring.ts` | Replace this.#printer.* |

---

## Phase 5: SDK Support

The printer has special handling for SDK mode via `printStacktapeLog`. Need to ensure TUI:

1. Supports `process.send()` for SDK communication
2. Maintains JSON log format support
3. Preserves structured log data for SDK consumers

---

## Phase 6: Cleanup

### 6.1 Files to Delete

After migration is complete:
- `src/utils/printer/index.ts`
- `src/utils/printer/spinnies.ts` (if exists)

### 6.2 Imports to Remove

Remove all:
```typescript
import { printer } from '@utils/printer';
```

### 6.3 Type Updates

Update any types that reference printer-specific types.

---

## Implementation Order

1. **Week 1**: Phase 1 - Extend TuiManager API
2. **Week 2**: Phase 2 - Add React components
3. **Week 3**: Phase 3 - Add non-phase mode
4. **Week 4-5**: Phase 4 - Migrate all files
5. **Week 6**: Phase 5 - SDK support verification
6. **Week 6**: Phase 6 - Cleanup

---

## Testing Strategy

1. **Unit tests** for new TuiManager methods
2. **Visual testing** for React components (TTY mode)
3. **Non-TTY testing** via `CI=true` or pipe to `more`
4. **SDK mode testing** to ensure structured logs work
5. **Integration testing** for each migrated command

---

## Risk Mitigation

1. **Gradual migration**: Migrate one category at a time
2. **Feature flags**: Add ability to fall back to printer if needed
3. **CI validation**: Ensure non-TTY output remains functional
4. **SDK compatibility**: Test SDK integration before removing printer

---

## Message Name Registry

To maintain consistency, create a registry of message names:

```typescript
// src/utils/tui/message-names.ts
export const MESSAGE_NAMES = {
  // Version command
  VERSION_INFO: 'version-info',

  // Stack commands
  STACK_LIST: 'stack-list',
  STACK_INFO: 'stack-info',
  STACK_DELETED: 'stack-deleted',

  // Secret commands
  SECRET_CREATED: 'secret-created',
  SECRET_DELETED: 'secret-deleted',
  SECRET_VALUE: 'secret-value',

  // Profile commands
  PROFILE_CREATED: 'profile-created',
  PROFILE_UPDATED: 'profile-updated',
  PROFILE_DELETED: 'profile-deleted',

  // Deployment
  DEPLOY_STARTED: 'deploy-started',
  DEPLOY_COMPLETED: 'deploy-completed',
  DEPLOY_FAILED: 'deploy-failed',

  // Errors
  VALIDATION_ERROR: 'validation-error',
  CONFIG_ERROR: 'config-error',
  AWS_ERROR: 'aws-error',

  // ... etc
} as const;
```

This enables:
- Consistent naming across codebase
- Easy filtering/searching
- Future UI customization per message type
