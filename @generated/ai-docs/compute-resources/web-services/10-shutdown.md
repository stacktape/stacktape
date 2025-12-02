# Shutdown

When a service instance is shut down (for example, during a deployment or when the stack is deleted), all of its containers receive a `SIGTERM` signal. This gives your application a chance to shut down gracefully.

By default, the application has 2 seconds to clean up before it's forcefully stopped with a `SIGKILL` signal. You can change this with the `stopTimeout` property (from 2 to 120 seconds).

```typescript
process.on('SIGTERM', () => {
  console.info('Received SIGTERM signal. Cleaning up and exiting process...');

  // Finish any outstanding requests, or close a database connection...

  process.exit(0);
});
```

> Example of a cleanup function that runs before the container shuts down.