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
    const reply = await chat(message.content);
    message.reply(reply);
  } catch (err) {
    console.error("Friendli API error:", err);
    message.reply("😵 Something went wrong talking to the brain.");
  }
});

client.login(process.env.DISCORD_TOKEN);

async function chat(msg = "How are you?") {
	const endpoint = "https://api.friendli.ai/dedicated/v1/completions";
	const model = process.env.FRIENDLI_ID!;
	const token = process.env.FRIENDLI_TOKEN!;

	try {
		const res = await fetch(endpoint, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Authorization": `Bearer ${token}`,
			},
			body: JSON.stringify({
				model,
				prompt: msg,
			}),
		});

		if (!res.ok) {
			const errText = await res.text();
			console.error("Friendli Error:", res.status, errText);
			throw new Error(`Friendli API error: ${res.status}`);
		}

		const data = await res.json();
		const reply = data.choices?.[0]?.text;

		if (!reply) {
			console.warn("No content returned from Friendli");
			return "🤖 ...no response from model.";
		}

		return reply.trim();

	} catch (err) {
		console.error("chat() failed:", err);
		return "⚠️ Something went wrong talking to Friendli.";
	}
}