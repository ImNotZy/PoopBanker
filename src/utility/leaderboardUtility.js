const {  EmbedBuilder } = require("@discordjs/builders");
const { List } = require('../database/Database');

async function displayLeaderboard() {
  const topCoins = await List.findAll({ 
    order: [['coin', 'DESC']],
    limit: 10
  });

  if (topCoins.length === 0) {
    return null;
  }
  
  const embed = new EmbedBuilder()
  .setTitle('Poopcoin Leaderboard')
  .setDescription('Top performers based on coins')
  .setColor(8736259)
  .setFooter({ text: 'Last Updated' })
  .setTimestamp();
  
  topCoins.forEach((user, index) => {
    embed.addFields({ 
      name: `Top ${index + 1}`, 
      value: `User: **${user.username}** | Coins: **${user.coin}** | Rank: **${user.rank}**`
    })
  });

  return embed;
}

function editMessage(message, embed) {
  message.edit({ embeds: [embed] });
}

module.exports = {
  displayLeaderboard,
  editMessage
}