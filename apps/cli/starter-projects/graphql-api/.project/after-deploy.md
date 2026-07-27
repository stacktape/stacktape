- Create a post:
  ```bash
  curl -X POST <API_GATEWAY_URL>/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"mutation { createPost(title: \"Hello\", content: \"World\") { id title } }"}'
  ```

- List all posts:
  ```bash
  curl -X POST <API_GATEWAY_URL>/graphql \
    -H "Content-Type: application/json" \
    -d '{"query":"{ posts { id title content createdAt } }"}'
  ```
