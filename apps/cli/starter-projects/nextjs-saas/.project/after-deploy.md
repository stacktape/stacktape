- Open the **CDN URL** printed to the terminal after deploy to see your app.
- The auth pool is provisioned with email-based registration. Users can be managed via the AWS Cognito console.
- Test the posts API:
  ```bash
  curl -X POST <CDN_URL>/api/posts \
    -H "Content-Type: application/json" \
    -d '{"title": "Hello", "content": "First post", "authorEmail": "test@example.com", "authorName": "Test"}'
  ```
