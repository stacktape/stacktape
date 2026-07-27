- Get a presigned upload URL:
  ```bash
  curl "<API_GATEWAY_URL>/upload-url?filename=hello.txt"
  ```

- Upload a file using the presigned URL:
  ```bash
  curl -X PUT "<PRESIGNED_URL>" -d "Hello, World!"
  ```

- List all files:
  ```bash
  curl <API_GATEWAY_URL>/files
  ```
