const handler = async (event: { data?: string; items?: unknown[] }) => {
  console.log('Validating input:', JSON.stringify(event));

  const valid = Boolean(event.data || event.items?.length);

  return {
    ...event,
    valid,
    validatedAt: new Date().toISOString()
  };
};

export default handler;
