import { Client, GatewayIntentBits, Events } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
});

client.once(Events.ClientReady, (c) => {
  console.log(`Bot logged in as ${c.user.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === '!ping') {
    await message.reply(`Pong! Latency: ${client.ws.ping}ms`);
  }

  if (message.content === '!time') {
    await message.reply(`Current UTC time: ${new Date().toISOString()}`);
  }

  if (message.content === '!help') {
    await message.reply(
      'Available commands:\n`!ping` - Check bot latency\n`!time` - Get current time\n`!help` - Show this message'
    );
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
