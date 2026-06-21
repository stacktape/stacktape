export default async (event: { input?: unknown }) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      tool: 'describe-tool',
      input: event.input ?? event
    })
  };
};
