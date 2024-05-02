const discord = require('discord.js');
const config = require('../../config.json');
const chalk = require('chalk');
const { REST } = require('@discordjs/rest');
const { readdirSync } = require("fs");
const { Routes } = require('discord-api-types/v10');
const { List } = require('../database/Database');
const { displayLeaderboard, editMessage } = require('../utility/leaderboardUtility');

//#region Initialize Bot
const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds, discord.GatewayIntentBits.MessageContent, discord.GatewayIntentBits.GuildMembers, discord.GatewayIntentBits.GuildMessages ] });
client.commands = new discord.Collection();

const rest = new REST({ version: '10' }).setToken(config.BOT_SETTINGS.BOT_TOKEN);

const commands = [];
readdirSync('./src/commands').forEach(async file => {const command = require(`../commands/${file}`);
    commands.push(command.data.toJSON());
    client.commands.set(command.data.name, command);
});

client.on('ready', async () => {
    try {
        await rest.put(
            Routes.applicationGuildCommands(client.user.id, config.BOT_SETTINGS.GUILD_ID),
            { body: commands },
        );
    } catch (error) {
        console.error(error);
    }

    List.sync();

    console.log(`[ ${chalk.red(client.user.tag)} ] has successfully gone online!`);
})

client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Error executing ${interaction.commandName}`);
            console.error(error);
        }
    } else if (interaction.isButton()) {     
        //respont to button
    } else if (interaction.isStringSelectMenu()) {
        // respond to the select menu
    }
});

client.login(config.BOT_SETTINGS.BOT_TOKEN);
//#endregion

//#region autoRoles
client.on('guildMemberAdd', async (member) => {
    try {
        //get role
        const role =  member.guild.roles.cache.get(config.BOT_SETTINGS.DEFAULT_ROLE_ID);

        if(!role) {
            return console.log('AutoRoles: Role not found! Check config!');
        }

        await member.roles.add(role);
    } catch(err) {
        console.log('There was an error adding a role to a new member: ' + err);
    }
});

client.on('ready', async () => {
    
    if(config.POOPCOIN_SETTINGS.AUTOMATIC_LEADERBOARD_ENABLED) {

        try {
            // Get channel
            const channel = client.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_LEADERBOARD_CHANNEL_ID);
    
            // Function to send the leaderboard message
            const sendMessage = async () => {
                // Get embed
                const embed = await displayLeaderboard();
    
                // Check if embed is null (no data to display)
                if (!embed) {
                    console.log("No data to display.");
                    return;
                }
    
                // Send message and store it
                let message = await channel.send({ embeds: [embed] });
    
                // Return the message
                return message;
            };
    
            // Function to recursively update message
            const updateMessage = async () => {
                // Get updated embed
                const updatedEmbed = await displayLeaderboard();
    
                // Check if updated embed is null (no data to display)
                if (!updatedEmbed) {
                    console.log("No data to display.");
                    return;
                }
    
                try {
                    // Get the message if it exists
                    let message = await channel.messages.fetch({ limit: 1 });
    
                    // If there's a message in the channel
                    if (message && message.first()) {
                        // Edit the message with the updated embed
                        await editMessage(message.first(), updatedEmbed);
                    } else {
                        // Send a new message if there's no existing message
                        message = await sendMessage();
                    }
                } catch (error) {
                    console.error('Error updating message:', error);
                } finally {
                    // Schedule the next update after 5 seconds
                    setTimeout(updateMessage, 1000 * 60 * 30);
                }
            };
    
            // Start the initial send
            await sendMessage();
    
            // Start updating the message recursively
            updateMessage();
        } catch (err) {
            console.log('There was an error updating the leaderboard: ' + err);
        }
    }
});