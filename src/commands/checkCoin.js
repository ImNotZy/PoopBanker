const  discord = require('discord.js');
const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('check-coin')
    .setDescription('Check coin balance of anyone.')
    .addUserOption(option => option.setName('user').setDescription('The user that will be added to the coin list').setRequired(true)),
    async execute(interaction) {

    //define data
    const receiver = interaction.options.getUser('user');
    const member = interaction.guild.members.cache.get(receiver.id);

    //defer reply to buy time for code to run
    await interaction.deferReply();

    try {
      //get user
      const user = await List.findOne({ where: { user: receiver.id }});

      //check to see if user is in database
      if (!user) {
        return interaction.editReply({ content: 'This user is not on the list.', ephemeral: true });
      }

      //reply
      return interaction.editReply({ content: `User <@!${receiver.id}> has **${user.coin}** Poopcoins!` });
    } catch (error) {
      await interaction.editReply({ content: 'Something went wrong with adding a user.', ephemeral: true });
      return console.log(error);
    }
  }
}

