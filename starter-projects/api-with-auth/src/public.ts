const handler = async () => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'This is a public endpoint. No authentication required.',
      timestamp: new Date().toISOString()
    })
  };
};

export default handler;
