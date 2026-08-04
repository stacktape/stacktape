- After deploying, register the webhook with Telegram:
  ```bash
  curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=<FUNCTION_URL>"
  ```
  Replace `<YOUR_BOT_TOKEN>` with your bot token from [@BotFather](https://t.me/BotFather) and `<FUNCTION_URL>` with the
  Function URL printed after deploy.
- Send a message to your bot on Telegram to test it.
