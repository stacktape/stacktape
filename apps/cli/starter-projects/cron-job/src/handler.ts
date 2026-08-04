const handler = async (event: unknown) => {
  const now = new Date().toISOString();
  console.log(`[${now}] Scheduled task executed`);

  // Your scheduled task logic goes here.
  // Common use cases:
  // - Send digest emails
  // - Clean up old database records
  // - Generate reports
  // - Sync data between services
  // - Check service health

  const result = {
    executedAt: now,
    status: 'success',
    message: 'Scheduled task completed'
  };

  console.log(JSON.stringify(result));
  return result;
};

export default handler;
