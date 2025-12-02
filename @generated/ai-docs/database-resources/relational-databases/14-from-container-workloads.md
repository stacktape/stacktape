# From container workloads

When connecting from a container, you should close the connection before the container exits. You can do this by listening for the `SIGTERM` signal.

```typescript
const connectionPool = createConnectionPool();

// remember to close the connection even on errors
process
  .on('uncaughtException', () => {
    connectionPool.close();
    process.exit(1);
  })
  .on('unhandledRejection', () => {
    connectionPool.close();
    process.exit(1);
  });

process.on('SIGTERM', () => {
  connectionPool.close();
  process.exit(0);
});
```