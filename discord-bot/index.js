require('dotenv').config();
const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// 🔒 CHANNEL RESTRICTIONS
const PASSWORD_CHANNELS = [
    '1400309463268724746' // Only allows !password here
];

const QUOTE_CHANNELS = [
    '1400309463268724746',
    '1407383980134760468',  // Only allows !quote here (add more IDs separated by commas if needed)
    '1397146952033894461'
];

// --- PASSWORD GENERATOR ---
const generateDailyPassword = () => {
    const localTimeString = new Date().toLocaleString("en-US", { timeZone: "Asia/Makassar" });
    const date = new Date(localTimeString);
    const seed = (date.getFullYear() * 10000) + ((date.getMonth() + 1) * 100) + date.getDate();
    const words = ['Carrot', 'Derby', 'Turf', 'Paca', 'Aoharu', 'URA', 'Spica', 'Sirius', 'G1'];
    const word = words[seed % words.length];
    return `${word}${seed % 99}`;
};

// --- QUOTE GENERATOR ---
const getDailyQuote = () => {
    const quotes = [
        "\"I'll become the best Umamusume in Japan!\" — Special Week",
        "\"You're too slow!\" — Silence Suzuka",
        "\"I'm burning up!\" — Tokai Teio",
        "\"Gold Ship dropkick approaching!\" — Gold Ship",
        "\"Baku baku baku!\" — Sakura Bakushin O",
        "\"Let's enjoy the ultimate sports entertainment!\" — Symboli Rudolf"
    ];
    
    // Selects a completely random index between 0 and the length of the list every time it's called
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
};

// --- BOT EVENTS ---
client.once('ready', () => {
    console.log(`🤖 Logged in as ${client.user.tag}!`);
});

client.on('messageCreate', (message) => {
    // Ignore other bots
    if (message.author.bot) return;

    // 🔑 COMMAND: !password (Only runs if used in a designated password channel)
    if (message.content === '!password') {
        if (PASSWORD_CHANNELS.includes(message.channel.id)) {
            const todayPassword = generateDailyPassword();
            message.reply(`🔑 **Password of the Day:** \`${todayPassword}\``);
        }
    }

    // 💬 COMMAND: !quote (Only runs if used in a designated quote channel)
    if (message.content === '!quote') {
        if (QUOTE_CHANNELS.includes(message.channel.id)) {
            const todayQuote = getDailyQuote();
            message.reply(`💬 *"Uma Quote of the Day"*\n> ${todayQuote}`);
        }
    }
});

client.login(process.env.DISCORD_TOKEN);