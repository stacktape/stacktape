# ReleaseCommand API Reference

A command that runs once on each deploy, before any workload gets the new code.

## TypeScript definition

```typescript
type ReleaseCommand = {
  /** The shell command to run, for example `npx prisma migrate deploy`. */
  command: string;
  /** The container to run the command in. */
  container?: string;
  /** Run the command only when these files or directories changed. */
  runWhenChanged?: Array<string>;
  /** How long the command can run, in seconds. The deploy fails and the task stops when it runs longer. */
  timeout?: number;
};
```

## Property: `command`

- Required: yes
- Type: `string`

The shell command to run, for example `npx prisma migrate deploy`.

It runs through `/bin/sh -c` in place of the image's entry point. If the image needs its entry point, call it in the
command. An image without a shell cannot run a release command.

## Property: `container`

- Required: no
- Type: `string`

The container to run the command in.

Required for a `multi-container-workload` with several containers. On other services, it runs in the main container.

## Property: `runWhenChanged`

- Required: no
- Type: `Array<string>`

Run the command only when these files or directories changed.

Paths are relative to the project root and must exist. A deploy that changes none of them skips the command and can
stay on the fast path. Without this option, the command runs on each deploy that changes the image.

## Property: `timeout`

- Required: no
- Type: `number`
- Default: `3300`

How long the command can run, in seconds. The deploy fails and the task stops when it runs longer.
