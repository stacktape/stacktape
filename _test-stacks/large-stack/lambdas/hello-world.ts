export default async (_event: any) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello, World!'
    })
  };
};
