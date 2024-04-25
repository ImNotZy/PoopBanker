const  discord = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('trade')
    .setDescription('Trade poopcoin to anyone!')
    .addUserOption(option => option.setName('user').setDescription('The user that will recieve the poopcoin!').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('The amount of poopcoin you want to send!')),
    async execute(interaction) {
    //Get User
    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');

    //get target and user
    const receiver = List.findOne({ where: { user: target.id }});
    const user = List.findOne({ where: { user: interaction.user.id }});

    try {
      //check if reciever is on the list
      if(!receiver) {
        return await interaction.reply({ content: `<@!${target.id}> is not on the list.`, ephemeral: true });
      }

      //check if user is on the list
      if(!user) {
        return await interaction.reply({ content: 'You must be apart of the poopbank to use this command.', ephemeral: true });
      }

      //check if amount is less than 0
      if(amount < 0) {
        return await interaction.reply({ content: 'You cannot send negative amounts!', ephemeral: true });
      }

      //check to see if user has enough coin
      if(amount > user.coin) {
        return await interaction.reply({ content: 'You do not have enough coin to make this trade!', ephemeral: true });
      }

      //remove coin from user
      user.update({ coin: user.coin - amount });
  
      //add coin to reciever
      receiver.update({ coin: target.coin + amount });

      //get channel and roles
      const channel = interaction.guild.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_ANNOUNCEMENTS_CHANNEL_ID);
      const homelessRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.HOMELESS_ROLE);
      const poorRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.POOR_ROLE);
      const lowMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.LOW_MIDDLE_ROLE);
      const midRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.MIDDLE_ROLE);
      const highMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.UP_MIDDLE_ROLE);
      const richRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.RICH_ROLE);
      const bezosRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.BEZOS_ROLE);
      const member = interaction.guild.members.cache.get(interaction.user.id)
      let role;
  
      //calculate proper role
      if(user.coin < 1) {
        role = homelessRole;
      } else if(user.coin >= 1 && user.coin <= 19) {
        role = homelessRole;
      } else if(user.coin >= 20 && user.coin <= 39) {
        role = poorRole;
      } else if(user.coin >= 40 && user.coin <= 59) {
        role = lowMidRole;
      } else if(user.coin >= 60 && user.coin <= 79) {
        role = midRole;
      } else if(user.coin >= 80 && user.coin <= 99) {
        role = highMidRole;
      } else if(user.coin >= 100 && user.coin <= 399) {
        role = richRole
      } else if(user.coin >= 400) {
        role = bezosRole;
      }
  
      //remove any old role
      await member.roles.remove([homelessRole, poorRole, lowMidRole, midRole, highMidRole, richRole, bezosRole]);

      //add new role
      await member.roles.add(role);

      //update rank in list
      await user.update({ rank: role.name });

      //send message to channel
      await channel.send(`<@!${target.id}> just recieved **${amount}** poopcoins from <@!${interaction.user.id}>! How nice! This makes them: ` + '`' + receiver.rank + '`!' );

      //send success message
      return interaction.reply({ content: `Success! You send **${amount}** poopcoin to <@!${target.id}>!`});
    } catch (error) {
      await interaction.reply({ content: 'Something went wrong with adding a user.', ephemeral: true });
      return console.log(error);
    }
  }
}