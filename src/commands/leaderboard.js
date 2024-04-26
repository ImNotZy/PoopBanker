const { SlashCommandBuilder, EmbedBuilder } = require("@discordjs/builders");
const { List } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('coin-leaderboard')
    .setDescription('View who is on top of the coin leaderboard!'),
  async execute(interaction) {
    
    //defer reply to buy time for code to run
    await interaction.deferReply({ ephemeral: true });
    
    try {
      //get all users coins and order them in decending order
      const topCoins = await List.findAll({ 
        order: [['coin', 'DESC']],
        limit: 10
      });

      //create embed with basic info
      const embed = new EmbedBuilder()
      .setTitle('Poopcoin Leaderboard')
      .setDescription('Top performers based on coins')
      .setColor(8012805);

      //add a field per person pulled from list
      topCoins.forEach((user, index) => {
        embed.addFields({ 
          name: `Top ${index + 1}`, 
          value: `User: **${user.username}** | Coins: **${user.coin}** | Rank: **${user.rank}**`
        });
      });

      //reply with the embed
      await interaction.editReply({ embeds: [embed], ephemeral: true }); 

    } catch (error) {
      console.error('Error fetching leaderboard:', error);
      await interaction.editReply({ content: 'Error fetching leaderboard.', ephemeral: true });
    }
  }
};
