const BOT_TOKEN = process.env.BOT_TOKEN!;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

const handler = async (event: any) => {
  try {
    const body = JSON.parse(event.body || '{}');
    const message = body.message;

    if (!message?.text) {
      return { statusCode: 200, body: 'ok' };
    }

    const chatId = message.chat.id;
    const text = message.text;
    const userName = message.from?.first_name || 'there';

    let reply: string;

    if (text === '/start') {
      reply = `Hi ${userName}! I'm running on AWS Lambda. Send me any message and I'll echo it back.`;
    } else if (text === '/help') {
      reply =
        'Available commands:\n/start - Start the bot\n/help - Show this help\n/time - Get current time\n\nOr send any message to echo it.';
    } else if (text === '/time') {
      reply = `Current UTC time: ${new Date().toISOString()}`;
    } else {
      reply = `You said: ${text}`;
    }

    await sendMessage(chatId, reply);
  } catch (error) {
    console.error('Error processing update:', error);
  }

  return { statusCode: 200, body: 'ok' };
};

const sendMessage = async (chatId: number, text: string) => {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text })
  });
};

export default handler;
