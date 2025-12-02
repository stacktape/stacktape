process.on('SIGTERM', () => {
  console.info('Received SIGTERM signal. Cleaning up and exiting process...');

  // Finish any outstanding requests, or close a database connection...

  process.exit(0);
});
