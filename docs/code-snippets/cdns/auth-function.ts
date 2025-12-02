const validateAuthorizationToken = (token) => {
  // perform some validation
  return true;
};

export default async (event) => {
  const { request } = event.Records[0].cf;
  const { headers } = request;

  const authorizationToken = headers.authorization?.[0]?.value;

  const userAuthorized = validateAuthorizationToken(authorizationToken);

  // if user is not authorized, redirect him to login page
  if (!userAuthorized) {
    return {
      status: '302',
      headers: {
        location: [
          {
            key: 'Location',
            value: '/login'
          }
        ],
        'cache-control': [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, max-age=0, must-revalidate'
          }
        ]
      }
    };
  }

  // after we validated that user is authorized, we can return the request
  // request will be forwarded to origin
  return request;
};
