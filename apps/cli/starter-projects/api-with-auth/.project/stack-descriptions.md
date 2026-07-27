## apiGateway

HTTP API Gateway that routes incoming requests to Lambda functions. Configured with CORS enabled and a Cognito JWT
authorizer that validates access tokens issued by the auth pool.

## authPool

Cognito User Auth Pool providing email-based sign-up and sign-in with email verification codes. Includes a hosted UI
with a custom domain prefix for OAuth authorization code flow, allowing users to sign up, sign in, and obtain JWT tokens
without building a custom auth UI.

## publicEndpoint

Lambda function serving the `GET /` route. This endpoint requires no authentication and returns a public response,
demonstrating an unprotected API route.

## protectedEndpoint

Lambda function serving the `GET /me` route. Protected by the Cognito JWT authorizer — only requests with a valid
`Authorization: Bearer <token>` header are allowed through. Returns the authenticated user's profile information
extracted from the JWT claims.
