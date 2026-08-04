const handler = async (event: { data?: string; items?: unknown[]; valid: boolean; validatedAt: string }) => {
  console.log('Processing data:', JSON.stringify(event));

  const processed = event.data ? event.data.toUpperCase() : `${event.items?.length || 0} items`;

  return {
    ...event,
    processed,
    processedAt: new Date().toISOString()
  };
};

export default handler;
