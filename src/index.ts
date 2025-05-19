import { Client, GatewayIntentBits, Message } from 'discord.js';
import dotenv from 'dotenv';
dotenv.config();

type Payload = {
  msg: string;
  sender: string;
  direct: boolean;
  history?: ChatEntry[];
};

type ChatEntry = {
  author: string;
  content: string;
};

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const history: ChatEntry[] = [];

client.once('ready', () => {
  console.log(`Logged in as ${client.user?.tag}`);
});

client.on("messageCreate", async (message: Message) => {
  if (message.author.bot || !message.guild) return;

  history.push({ author: message.author.username, content: message.content });
  if (history.length > 20) history.shift();

  const isMentioned = message.mentions.has(client.user!);
  const isEveryone = message.content.includes("@everyone") || message.content.includes("@here");
  const shouldRespond = isMentioned || isEveryone || Math.random() < 0.1;

  if (!shouldRespond) return;

  try {
    const reply = await chat({
      msg: message.content,
      sender: message.author.username,
      direct: isMentioned || isEveryone,
      history,
    });
    await message.reply(reply);
  } catch (err) {
    console.error("Friendli API error:", err);
    await message.reply("😵 Something went wrong talking to the brain.");
  }
});

client.login(process.env.DISCORD_TOKEN);

// Prompt builder
async function getPrompt({ msg, sender, direct, history = [] }: Payload): Promise<string> {
  const systemPrompt = `
<|im_start|>system
You are a sarcastic but kind Discord bot in a group chat of middle-aged high school friends.
You reply like a chill dude who's up to date on internet culture but not annoying about it.
Keep your responses short (under 1800 characters), usually 1-4 sentences.
Always respond directly to the latest message.
Don't make things up or drift too far off-topic.

${direct ? `You were tagged in the latest message by ${sender}` : ''}

Here's the chat history:
${history
    .map(entry => `${entry.author}: ${entry.content}`)
    .join("\n")}
<|im_end|>
<|im_start|>What would be your reply?<|im_end|>
<|im_start|>assistant
`;

	return systemPrompt;
}

// Call Friendli API
async function chat(args: Payload): Promise<string> {
  const prompt = await getPrompt(args);
	console.log("Prompt:", prompt);
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
        prompt,
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Friendli Error:", res.status, errText);
      throw new Error(`Friendli API error: ${res.status}`);
    }

    const data = await res.json();
    let reply = data.choices?.[0]?.text?.trim() ?? "";

    if (reply.length > 1800) {
      reply = reply.slice(0, 1797) + "...";
    }

    return reply;
  } catch (err) {
    console.error("chat() failed:", err);
    return "⚠️ Something went wrong talking to Friendli.";
  }
}

if (process.env.NODE_ENV !== "production") {
	const mockPayload: Payload = {
		msg: "Hello, friendli!",
		sender: "John",
		direct: false,
		history: [
			{ author: "Alice", content: "Hi there!" },
			{ author: "Bob", content: "How are you?" },
			{ author: "Charlie", content: "I'm good, thanks!" },
		],
	}
  chat(mockPayload).then(console.log).catch(console.error);
}