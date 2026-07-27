- Create a post:
  ```bash
  curl -X POST <API_GATEWAY_URL>/posts \
    -H "Content-Type: application/json" \
    -d '{"title": "Hello World", "content": "My first post"}'
  ```
- List posts:
  ```bash
  curl <API_GATEWAY_URL>/posts
  ```
