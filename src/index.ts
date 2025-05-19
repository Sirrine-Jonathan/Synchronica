import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  try {
    const res = await fetch(process.env.FRIENDLI_ENDPOINT!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.FRIENDLI_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          { role: "user", content: message.content }
        ],
      }),
    });

    const data = await res.json();
		console.log(data);
    const reply = data.reply || data.choices?.[0]?.message?.content || "🤖 I'm speechless.";
    message.reply(reply);
  } catch (err) {
    console.error("Friendli API error:", err);
    message.reply("😵 Something went wrong talking to the brain.");
  }
});

client.login(process.env.DISCORD_TOKEN);