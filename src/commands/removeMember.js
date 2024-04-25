const  discord = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-member')
    .setDescription('Remove a member from the coin list')
    .addUserOption(option => option.setName('user').setDescription('The user that will be removed from the coin list').setRequired(true)),
    async execute(interaction) {
    //check for enabled and required role
    if(!config.POOPCOIN_SETTINGS.ENABLED) return await interaction.reply({ content: 'This command is disabled.', ephemeral: true});
    if(config.POOPCOIN_SETTINGS.REQUIRED_ROLE && !config.POOPCOIN_SETTINGS.REQUIRED_ROLE.find(id => interaction.member.roles.cache.has(id))) return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });    

    //get data
    const target = interaction.options.getUser('user');
    const receiver = interaction.guild.members.cache.get(target.id)

    try {
      //attempt to get user
      const existingUser = await List.findOne({ where: { user: receiver.id } });

      //check if user is not in the list
      if (!existingUser) {
        return interaction.reply({ content: 'This user is not on the list.', ephemeral: true });
      }

      //get roles
      const homelessRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.HOMELESS_ROLE);
      const poorRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.POOR_ROLE);
      const lowMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.LOW_MIDDLE_ROLE);
      const midRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.MIDDLE_ROLE);
      const highMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.UP_MIDDLE_ROLE);
      const richRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.RICH_ROLE);
      const bezosRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.BEZOS_ROLE);
      const roleToAdd =interaction.guild.roles.cache.get(config.BOT_SETTINGS.DEFAULT_ROLE_ID);
      let rolesToRemove = [ homelessRole, poorRole, lowMidRole, midRole, highMidRole, richRole, bezosRole];

      //check for default role
      if(!roleToAdd) {
        return await interaction.reply({ content: 'Role invalid! Check config!', ephemeral: true });
      }
      
      //remove all roles
      await receiver.roles.remove(rolesToRemove);

      //add default role
      await receiver.roles.add(roleToAdd);
      
      //remove user from list
      await List.destroy({ where: { user: receiver.id }});

      const channel = interaction.guild.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_ANNOUNCEMENTS_CHANNEL_ID);
      
      //send announcement
      await channel.send(`<@!${receiver.id}> has been removed remove the poopcoin bank!`);
      
      //reply
      return interaction.reply({ content: `User <@!${receiver.id}> has been removed from the Poopcoin bank!`, ephemeral: true });

    } catch (error) {
      await interaction.reply({ content: 'Something went wrong with removing a user.', ephemeral: true });
      return console.log(error);
    }
  }
}