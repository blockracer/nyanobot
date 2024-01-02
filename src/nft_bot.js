const { getChannelToUpdate, getRoleId, getLastProcessedIds, setLastProcessedIds, updateNFTs } = require('./utils.js');
const { Client, GatewayIntentBits, EmbedBuilder  } = require('discord.js');
const axios = require('axios')
const fs = require('fs');
const config = require('./config.json');

// const fetch = require('node-fetch'); -- changed for "get"
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions
    ],
});
        
// Read last processed ID from file
const processedIdsFilePath = 'src/data/lastProcessedIds.txt'
// Load the channel ID from the file if it exists
const channelIdPath = 'src/data/channelId.txt';


// PERIODIC CHECKS
console.log('Before setInterval. Config:', config);

if (!config || !config.apiUrl || !config.token) {
    console.error('Invalid configuration. Please check your config.json file.');
    return;
}
lastProcessedIds = []; // global variable
// Fetch api data
const fetchApiData = async () => {
    try {
        const response = await fetch(config.apiUrl);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching API data:', error);
        throw error;
    }
};

async function downloadAndSaveImage(url, filename) {
    if (fs.existsSync(filename)){
        console.log("cache hit for " + filename)
        return
    }
    console.log("cache miss for " + filename)
    const response = await axios.get(url, { responseType: 'arraybuffer'});
    fs.writeFileSync(filename, Buffer.from(response.data, 'binary'));
}

async function postNewSales(){ 
// Fetch the channel ID from the file
    let channelsToUpdates = getChannelToUpdate(channelIdPath);
    console.log({ channelsToUpdates });

    try {
    
        // Ensure that config object is defined
        if (!config || !config.apiUrl) {
            console.error('Missing or invalid configuration. Please check your config.json file.');
            return;
        }

        // Fetch API data
        const apiData = await fetchApiData();

        // Fetches last processed _id from lastProcessedIds.txt
        // let lastProcessedIds = getLastProcessedIds(processedIdsFilePath);
        console.log(lastProcessedIds);


        // Extract unique asset IDs from the API data
        for (let i = 0; i < apiData.length; i++) {
        // for (let i = 0; i < 2; i++) {
            const saleElement = apiData[i];
            if (!lastProcessedIds.includes(saleElement._id)){ // we check if new _id is not included in lastProcessedIds
                const imageUrl = saleElement.assetId.location;
                const imageName = saleElement.assetId.name.replace(' ', '').replace('#', '-') + '.png'; // using the asset name to not confound the same image  good idea
                await downloadAndSaveImage(imageUrl, imageName);
                // const imageName = '1.png'; // using the asset name to not confound the same image  good idea
                let link = 'https://nanswap.com/art/assets/' + saleElement.assetId.id
                console.log(`NEW SALES: ${saleElement.assetId.name} ${saleElement.type} ${+saleElement.price} ${saleElement.assetId.location}`) // try now
                const exampleEmbed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`${saleElement.assetId.name}`)
                .setURL(link)
                // .setThumbnail(saleElement.assetId.location)
                .setImage('attachment://' + imageName)
                // .setDescription('**A New Nyano Cat has been sold!**') // too much info i think, we could even just remove the "type" fiel, like in any case, it is always a "sale"
                .addFields(
                    { name: '**Price:**', value: `${+saleElement.price} ${saleElement.priceTicker}`, inline: false}, 
                    { name: '**From:**', value: saleElement.fromUserId.username, inline: true },
                    { name: '**To:**', value: saleElement.toUserId.username, inline: true },
                    // { name: 'Type', value: saleElement.type, inline: true},
                    // { name: '**Sold At:**', value: new Date(saleElement.createdAt).toLocaleString(), inline: true},
                    { name: '**Link:**', value: `[${saleElement.assetId.name}](${link})`, inline: true}, // I'm just being picky lol

                    
                    )
                    .setFooter({ text: 'Nyano Bot | Powered by Armour', iconURL:  'https://media.discordapp.net/attachments/1189715753038000218/1191601666194161684/favicon.png?ex=65a60888&is=65939388&hm=9cd9d83645cae6172c44071d27ae56bedc0cdb20a562f9508206106f4a8a737b&=&format=webp&quality=lossless', url: 'https://discord.js.org' })
                    .setTimestamp()

                for (let i = 0; i < channelsToUpdates.length; i++) {
                    const channelIdToUpdate = channelsToUpdates[i].channelId
                    const guildid = channelsToUpdates[i].guildId
                    const roleId = getRoleId('src/data/roleIds.txt', guildid); 


                    console.log('Channel to update:', channelsToUpdates[i]);
                    console.log('Fetching channel ID from file:', channelIdPath);
                    let channel = await client.channels.cache.get(channelIdToUpdate)
                    let mention = roleId !== null ? `<@&${roleId}>` : ''
                    await channel.send( `${mention} **${saleElement.assetId.name} has been sold for ${+saleElement.price} ${saleElement.priceTicker}!**`)
                    await channel.send({ embeds: [exampleEmbed], files: [{attachment: imageName }]});

                lastProcessedIds.push(saleElement._id)

                }
            }

        }

    } catch (error) {
        console.error('Error fetching guild or channel:', error);
    }
}

client.on("ready", async () => {
    console.log("bot ready")
    // await postNewSales();
    
});
(async () => {
    let initialData = await fetchApiData();
     initialIds = initialData.map((elmt) => elmt._id);
    // initialIds = [] //for testing
    console.log(initialIds);
    lastProcessedIds = initialIds;

})();
setInterval(async () => {
    // check new sales every config.updateInterval
    console.log('Periodic update triggered.');
    await postNewSales();
    
}, config.updateInterval);

console.log('After setInterval.');

client.commands = new Map();

// Import all commands dynamically
const commandFiles = fs.readdirSync(`${__dirname}/commands`).filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
    const command = require(`${__dirname}/commands/${file}`);
    client.commands.set(command.name, command);
}

client.on('messageCreate', async (message) => {
    try {
        console.log('Received message:', message.content);

        // Check if the message starts with the bot's prefix and is not sent by another bot
        if (!message.content.startsWith(config.prefix) || message.author.bot) return;

        // Extract command name and arguments from the message
        const args = message.content.slice(config.prefix.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        console.log('Command name:', commandName);

        // Check if the command exists in the commands Map
        if (!client.commands.has(commandName)) return;

        // Execute the command
        const command = client.commands.get(commandName);
        console.log('Executing command:', command.name);
        command.execute(message, args, client, config);
    } catch (error) {
        console.error(error);
        message.reply('There was an error executing the command.');
    }
});

client.login(config.token);