- Visit the **User Auth Pool Hosted UI URL** to sign up and sign in (printed to the terminal after deploy).
- Test the public endpoint: `GET <API_GATEWAY_URL>/`
- Test the protected endpoint (use the access token from sign-in):
  ```bash
  curl <API_GATEWAY_URL>/me -H "Authorization: Bearer <ACCESS_TOKEN>"
  ```
