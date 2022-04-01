export default async (event, context) => {
  console.info(event, context);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Hello!' }),
  };
};
