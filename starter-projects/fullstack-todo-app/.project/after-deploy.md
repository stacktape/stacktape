- Open the **frontend** URL in your browser to use the todo app.

- You can also use the API directly:
  ```bash
  curl <API_GATEWAY_URL>/todos
  curl -X POST <API_GATEWAY_URL>/todos -H "Content-Type: application/json" -d '{"title": "Buy groceries"}'
  ```
