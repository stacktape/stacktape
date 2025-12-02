# Shutdown

When a container instance is shut down, all containers receive a `SIGTERM` signal, giving them a chance to clean up gracefully. By default, they have 2 seconds before a `SIGKILL` signal is sent. You can adjust this with the `stopTimeout` property.

```typescript
process.on('SIGTERM', () => {
  console.info('Received SIGTERM signal. Cleaning up and exiting process...');

  // Finish any outstanding requests, or close a database connection...

  process.exit(0);
});
```

> Example of cleaning up before container shutdown.