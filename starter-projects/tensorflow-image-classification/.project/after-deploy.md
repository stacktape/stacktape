- Upload a `.zip` file containing images to the **input bucket** (bucket name is printed after deploy). You can use the
  included `pictures/test-pictures.zip` or your own images.
  ```bash
  aws s3 cp pictures/test-pictures.zip s3://<INPUT_BUCKET_NAME>/test-pictures.zip
  ```
- The batch job triggers automatically on upload. Classified images appear in the **output bucket**, organized into
  folders by predicted class.
- Monitor job progress in the [AWS Batch console](https://console.aws.amazon.com/batch/) or CloudWatch Logs.
