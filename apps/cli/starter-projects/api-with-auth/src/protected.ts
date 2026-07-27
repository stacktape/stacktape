const handler = async (event: any) => {
  // The JWT claims are automatically available in the request context
  // after validation by the Cognito authorizer.
  const claims = event.requestContext?.authorizer?.jwt?.claims || {};

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'This is a protected endpoint. You are authenticated!',
      user: {
        sub: claims.sub,
        email: claims.email,
        emailVerified: claims.email_verified
      }
    })
  };
};

export default handler;
