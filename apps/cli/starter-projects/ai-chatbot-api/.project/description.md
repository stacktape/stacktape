- AI chatbot with real-time streaming responses, built with the [Vercel AI SDK](https://sdk.vercel.ai/) and
  [Amazon Bedrock](https://aws.amazon.com/bedrock/) (Claude).
- Runs serverlessly in [AWS Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/) with
  [Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) and response streaming
  enabled. Responses stream token-by-token to the browser.
- Includes a minimal web UI for testing. Pay only for requests you receive.
