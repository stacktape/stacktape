export default async (event, context) => {
  return {
    statusCode: 200,
    statusDescription: '200 OK',
    isBase64Encoded: false,
    headers: {
      'Content-Type': 'text/plain',
      // {start-highlight}
      'Cache-Control': 'max-age=30'
      // {stop-highlight}
    },
    body: 'Hello !!!'
  };
};
