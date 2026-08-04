- [Telegram bot](https://core.telegram.org/bots) running serverlessly in
  [AWS Lambda](https://docs.stacktape.com/compute-resources/lambda-functions/) with
  [Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url).
- Uses Telegram's webhook mode — no polling needed. Lambda is invoked only when messages arrive.
- Pay only for messages your bot processes. Zero cost when idle.
