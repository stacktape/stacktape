---
docType: config-ref
title: Event Bus
resourceType: event-bus
tags:
  - event-bus
  - eventbridge
  - events
source: types/stacktape-config/event-buses.d.ts
priority: 1
---

# Event Bus

Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.

Use to build event-driven architectures where producers and consumers are independent.
Functions, batch jobs, and other resources can subscribe to specific event patterns.

Resource type: `event-bus`

## TypeScript Definition

```typescript
/**
 * #### Central event bus for decoupling services. Publish events and trigger functions, queues, or batch jobs.
 *
 * ---
 *
 * Use to build event-driven architectures where producers and consumers are independent.
 * Functions, batch jobs, and other resources can subscribe to specific event patterns.
 */
interface EventBus {
  type: 'event-bus';
  properties?: EventBusProps;
  overrides?: ResourceOverrides;
}

interface EventBusProps {
  /**
   * #### Partner event source name. Only needed for receiving events from third-party SaaS integrations.
   */
  eventSourceName?: string;
  /**
   * #### Archive events to store and replay them later. Useful for debugging, testing, or error recovery.
   */
  archivation?: EventBusArchivation;
}

interface EventBusArchivation {
  /**
   * #### Enable event archiving. Disabling deletes the archive.
   * @default false
   */
  enabled: boolean;
  /**
   * #### Days to keep archived events. Omit to keep indefinitely.
   */
  retentionDays?: number;
}

type EventBusReferencableParam = 'arn' | 'archiveArn';
```
