- **bot** - [Lambda function](https://docs.stacktape.com/compute-resources/lambda-functions/) that processes incoming
  Telegram webhook updates. Has a
  [Lambda URL](https://docs.stacktape.com/compute-resources/lambda-functions/#lambda-url) enabled so Telegram can send
  updates directly to it.
- **$Secret('telegram-bot-token')** - Stores the Telegram bot token obtained from [@BotFather](https://t.me/BotFather).
  Referenced securely as an environment variable.
