const { SlashCommandBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-member')
    .setDescription('Add a member to the coin list')
    .addUserOption(option => option.setName('user').setDescription('The user that will be added to the coin list').setRequired(true)),
    async execute(interaction) {
    //check for enabled and required role
    if(!config.POOPCOIN_SETTINGS.ENABLED) return await interaction.reply({ content: 'This command is disabled.', ephemeral: true});
    if(config.POOPCOIN_SETTINGS.REQUIRED_ROLE && !config.POOPCOIN_SETTINGS.REQUIRED_ROLE.find(id => interaction.member.roles.cache.has(id))) return await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });    

    //get user
    const receiver = interaction.options.getUser('user');
    const roleMember = interaction.guild.members.cache.get(receiver.id);

    //check if in guild
    if(!roleMember) {
      return await interaction.reply({ content: 'This user was not found in the guild.', ephemeral: true });
    }

    try {
      //get existing user
      const existingUser = await List.findOne({ where: { user: receiver.id } });
      
      //check to see if user exists in database
      if (existingUser) {
        return await interaction.reply({ content: 'This user is already in the database.', ephemeral: true });
      }

      //define roles, take away any roles, add defualt role
      const target = interaction.guild.members.cache.get(receiver.id);
      const channel = interaction.guild.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_ANNOUNCEMENTS_CHANNEL_ID);
      const poorRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.POOR_ROLE);
      const roleToRemove = interaction.guild.roles.cache.get(config.BOT_SETTINGS.DEFAULT_ROLE_ID);

      //check if role is valid
      if(!poorRole) {
        return await interaction.reply({ content: 'Role invalid! Check config!', ephemeral: true });
      }
       
      //remove role
      await target.roles.remove(roleToRemove);

      //add role
      await target.roles.add(poorRole);
      
      //create a new member in the database
      const newUser = await List.create({
        user: receiver.id,
        username: roleMember.user.globalName,
        coin: 25,
        rank: poorRole.name,
        plays: 0
      });

      //send the message to the channel
      await channel.send(`<@!${receiver.id}> has been added to the poopcoin bank! They have a balance of **${newUser.coin}** poopcoin.`);
    
      //reply to the command
      return await interaction.reply({ content: `User <@!${receiver.id}> has been added to the Poopcoin bank!`, ephemeral: true });
      
    } catch (error) {
      await interaction.reply({ content: 'Something went wrong with adding a user.', ephemeral: true });
      return console.log(error);
    }
  }
}

