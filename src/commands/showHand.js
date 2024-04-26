const { SlashCommandBuilder } = require("@discordjs/builders");
const { Player } = require('../database/Database');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('show-hand')
    .setDescription('Look at your hand in blackjack!'),
  async execute(interaction) {
    if(!config.POOPCOIN_SETTINGS.BJ_ENABLED) return interaction.reply({ content: 'Blackjack is currently disabled.', ephemeral: true });
    //get data
    const player = await Player.findOne({ where: { user: interaction.user.id } });

    //defer reply to buy time for code to run
    await interaction.deferReply({ ephemeral: true });
    
    try {
        //check to see if player is in game
        if (!player) {
          return await interaction.editReply({ content: 'You are not currently playing a blackjack game.', ephemeral: true });
        }

        //get score
        const playerScore = calculateHandValue([...player.hand]);

        //define dealerHandString
        const dealerHandString = `**${player.dealerHand[0].rank}${player.dealerHand[0].suit}** and one hidden card`;

        //show hand
        return await interaction.editReply({ content: `Your hand: ${handToString([...player.hand])} | Thats: **${playerScore}!**\nDealer's hand: ${dealerHandString} and one hidden card\nType /hit or /stand`});
    } catch (error) {
        console.error('Error with /hit command:', error);
        return await interaction.editReply({ content: 'An error occurred while processing your command. Please try again later.', ephemeral: true });
    }
  }
}

//calculateHandValue function
function calculateHandValue(hand) {
    let value = 0;
    let numAces = 0;
    for (const card of hand) {
      if (card.rank === 'A') {
        numAces++;
      } else if (['J', 'Q', 'K'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank);
      }
    }
    for (let i = 0; i < numAces; i++) {
      if (value + 11 <= 21) {
        value += 11;
      } else {
        value += 1;
      }
    }
    return value;
}

//hand toString function
function handToString(hand) {
  return hand.map(card => `**${card.rank}${card.suit}**`).join(', ');
}