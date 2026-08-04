- Before deploying, enable **Amazon Titan Embed** and **Claude** models in
  [Amazon Bedrock](https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html).
- Ingest a document:
  ```bash
  curl -X POST <API_GATEWAY_URL>/ingest \
    -H "Content-Type: application/json" \
    -d '{"text": "Stacktape is a developer tool for deploying apps to AWS. It supports Lambda, containers, databases, and more.", "documentId": "doc-1"}'
  ```
- Ask a question:
  ```bash
  curl -X POST <API_GATEWAY_URL>/ask \
    -H "Content-Type: application/json" \
    -d '{"question": "What does Stacktape support?"}'
  ```
