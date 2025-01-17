const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const config = require('../config/config.json');
const emoji = require('../config/emojis.json');
// const { consoleLog, consoleError } = require('../debug.js');
const { downloadAndSaveImage, setClient } = require('../utils.js');
const { fetchUserListedData, client } = require('../nft_bot.js');

const prefix = config.prefix;
// const client = new Client({
//     intents: [
//         GatewayIntentBits.Guilds,
//         GatewayIntentBits.GuildMessages,
//         GatewayIntentBits.MessageContent,
//         GatewayIntentBits.GuildMessageReactions,
//     ],
// });

// Export the module
module.exports = {
    name: 'listed',
    description: 'Display the listed Nyano cats for a specific user.',
    setClient,

    // Execute function to handle 'listed' command
    async execute(message) {
        // Ignore messages from bots
        if (message.author.bot) return;

        // Check if the message starts with the 'listed' command
        if (message.content.startsWith(prefix + 'listed')) {
            const args = message.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            // Check if the command is 'listed'
            if (command === 'listed') {
                const username = args[0];

                // Check if a username is provided
                if (!username) {
                    return message.reply('Please provide a username.');
                }

                // Fetch listed Nyano cats data for the provided username
                const listedData = await fetchUserListedData(username, `askLowToHigh`);

                // Check if there are listed cats
                if (listedData.length > 0) {
                    // Find the cheapest listed asset
                    const cheapestAsset = listedData.reduce((min, asset) => (asset.bestAsk < min.bestAsk ? asset : min), listedData[0]);

                    // Download and save the image for the cheapest listed asset
                    const imageName = `${cheapestAsset.id.replace(' ', '').replace('#', '-')}.png`;
                    await downloadAndSaveImage(cheapestAsset.location, imageName);

                    // Create fields for the listed Nyano cats
                    const fields = listedData.slice(0, 20).map((cat, index) => {
                        const Link = `https://nanswap.com/art/assets/${cat.id}${config.referral}`;
                        const baseField = {
                            name: `${index + 1}. **\`${cat.name}\`**`,
                            value: `- ${emoji.Currency} **Price:** \`Ӿ${cat.bestAsk}\`\n- ${emoji.Bidder} **Best Bid:** ${cat.bestBid ? `\`Ӿ${cat.bestBid}\`` : '\`N/A\`'}`,
                            inline: true,
                        };

                        baseField.value += `\n- ${emoji.Lock} **Link:** [View](${Link})`;
                        return baseField;
                    });

                    // Create an Embed for the listed Nyano cats
                    const Embed = new EmbedBuilder()
                        .setColor(0x0099FF)
                        .setTitle(`${emoji.Project} Listed Cats for ${username} on Nanswap Art!`)
                        .setDescription(`${emoji.GeneralInfo} Here are ${username}'s 12 cheapest listed cats:`)
                        .addFields(fields)
                        .setURL(`https://nanswap.com/art/${username}${config.referral}`)
                        .setThumbnail(`attachment://${imageName}`)
                        //.setFooter({ text: 'Nyano Bot | Powered by Armour', iconURL: config.embedFooterImage })
                        .setTimestamp();

                    // Send the message with the Embed and attached image
                    message.reply({
                        content: `${message.author}, here are the 12 cheapest listed Nyano Cats in ${username}'s collection.`,
                        embeds: [Embed],
                        files: [{ attachment: imageName, name: imageName }],
                    });
                } else {
                    message.reply(`${message.author}, There are no listed cats found for the username: ${username}`);
                }
            }
        }
    },
};

// Login to the Discord client using the provided token
// client.login(config.token);
