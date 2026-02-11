- Get a presigned upload URL:
  ```bash
  curl <API_GATEWAY_URL>/upload-url?filename=photo.jpg
  ```

- Upload an image using the returned URL:
  ```bash
  curl -X PUT "<UPLOAD_URL>" -H "Content-Type: image/jpeg" --data-binary @photo.jpg
  ```

- List processed images (wait a few seconds for processing):
  ```bash
  curl <API_GATEWAY_URL>/images
  ```
