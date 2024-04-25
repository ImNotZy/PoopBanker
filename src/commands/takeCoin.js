const discord = require('discord.js');
const { SlashCommandBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('take-coin')
    .setDescription('take coins from a member')
    .addUserOption(option => option.setName('user').setDescription('The user that will lose a coin').setRequired(true))
    .addIntegerOption(option => option.setName('amount').setDescription('The amount of coin the user will lose').setRequired(true)),
  async execute(interaction) {
    //Check for enabled and required role
    if (!config.POOPCOIN_SETTINGS.ENABLED) return await interaction.reply({ content: 'This command is disabled.', ephemeral: true });
    if (config.POOPCOIN_SETTINGS.REQUIRED_ROLE && !config.POOPCOIN_SETTINGS.REQUIRED_ROLE.find(id => interaction.member.roles.cache.has(id))) return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });

    //get data
    const receiver = interaction.options.getUser('user');
    const coinsToRemove = interaction.options.getInteger('amount');
    const roleMember = interaction.guild.members.cache.get(receiver.id);

    try {
      //check for user
      const user = await List.findOne({ where: { user: receiver.id } });

      //make sure user is in the database
      if (!user) {
        return interaction.reply({ content: `<@!${receiver.id}> is not a part of the poopbank.`, ephemeral: true });
      }

      //define all roles
      const homelessRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.HOMELESS_ROLE);
      const poorRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.POOR_ROLE);
      const lowMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.LOW_MIDDLE_ROLE);
      const midRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.MIDDLE_ROLE);
      const highMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.UP_MIDDLE_ROLE);
      const richRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.RICH_ROLE);
      const bezosRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.BEZOS_ROLE);
      let role = bezosRole;

      //get channel
      const channel = interaction.guild.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_ANNOUNCEMENTS_CHANNEL_ID);

      //calculate updated coin count
      const updatedCoinCount = user.coin - coinsToRemove;
      
      //check coin count to see what role they deserve
      if(updatedCoinCount < 1) {
        role = homelessRole;
      } else if(updatedCoinCount >= 1 && updatedCoinCount <= 19) {
        role = homelessRole;
      } else if(updatedCoinCount >= 20 && updatedCoinCount <= 39) {
        role = poorRole;
      } else if(updatedCoinCount >= 40 && updatedCoinCount <= 59) {
        role = lowMidRole;
      } else if(updatedCoinCount >= 60 && updatedCoinCount <= 79) {
        role = midRole;
      } else if(updatedCoinCount >= 80 && updatedCoinCount <= 99) {
        role = highMidRole;
      } else if(updatedCoinCount >= 100 && updatedCoinCount <= 399) {
        role = richRole
      } else if(updatedCoinCount >= 400) {
        role = bezosRole;
      }

      //update new coin count
      await user.update({ coin: updatedCoinCount, rank: role.name });

      //remove old role and add a new one
      await roleMember.roles.remove([homelessRole, poorRole, lowMidRole, midRole, highMidRole, richRole, bezosRole]);
      await roleMember.roles.add(role);

      // update rank for user
      await user.update({ rank: role.name });

      //send message and reply to command
      await channel.send(`<@!${receiver.id}> has lost poopcoin. They now have **${updatedCoinCount}** coins! This makes them: ` + '`' + role.name  + '`!' );
      await interaction.reply({ content: `<@!${receiver.id}> has lost **${coinsToRemove}** poopcoin.`, ephemeral: true });
    } catch (error) {
      console.error('Error adding coin:', error);
      return interaction.reply({ content: 'Something went wrong with adding a coin.', ephemeral: true });
    }
  }
}