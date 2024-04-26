const config = require('../../config.json');
const { SlashCommandBuilder } = require("@discordjs/builders");
const { List, Player } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hit')
    .setDescription('Take another card in blackjack.'),
  async execute(interaction) {
    if(!config.POOPCOIN_SETTINGS.BJ_ENABLED) return interaction.reply({ content: 'Blackjack is currently disabled.', ephemeral: true });
    //get data
    const player = await Player.findOne({ where: { user: interaction.user.id } });
    const user = await List.findOne({ where: { user: interaction.user.id } });

    //defer reply to buy time for code to run
    await interaction.deferReply();
    
    try {
      //check to see if player is in game
      if (!player) {
        return await interaction.editReply({ content: 'You are not currently playing a blackjack game.', ephemeral: true });
      }

      //draw a new card
      const newCard = drawCard();

      //update deck in database
      await player.update({ hand: [...player.hand, newCard] });

      //get score
      const playerScore = calculateHandValue([...player.hand]);

      //check if score is greater than 21 else display hand and ask again
      if (playerScore > 21) {
        await player.destroy();
        await interaction.editReply(`Busted! Your hand: ${handToString([...player.hand])} | Thats: **${playerScore}!**`);
        changeRole(interaction, user);
      } else {
        const dealerHandString = `**${player.dealerHand[0].rank}${player.dealerHand[0].suit}** and one hidden card`;
        await interaction.editReply({ content: `Your hand: ${handToString([...player.hand])} | Thats: **${playerScore}!**\nDealer's hand: ${dealerHandString} and one hidden card\nType /hit or /stand`});
      }
    } catch (error) {
      console.error('Error with /hit command:', error);
      await interaction.editReply({ content: 'An error occurred while processing your command. Please try again later.', ephemeral: true });
    }
  }
}

//draw card function
function drawCard() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];
  return { rank, suit };
}

//calculateHandValue function
function calculateHandValue(hand) {
  let value = 0;
  let numAces = 0;

  // Iterate through each card in the hand
  for (const card of hand) {
    // Face cards (J, Q, K) are worth 10
    if (['J', 'Q', 'K'].includes(card.rank)) {
      value += 10;
    } 
    // Ace can be 1 or 11 depending on the situation
    else if (card.rank === "A") {
      numAces++;
    } 
    // Number cards are worth their face value
    else {
      value += parseInt(card.rank);
    }
  }

  // Handle aces
  for (let i = 0; i < numAces; i++) {
    // If adding 11 doesn't bust, count Ace as 11
    if (value + 11 <= 21) {
      value += 11;
    } 
    // Otherwise, count Ace as 1
    else if(value + 11 > 21) {
      value += 1;
    }
  }

  return value;
}

//toString function
function handToString(hand) {
  return hand.map(card => `**${card.rank}${card.suit}**`).join(', ');
}

//changerole function
async function changeRole(interaction, user) {
  const homelessRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.HOMELESS_ROLE);
  const poorRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.POOR_ROLE);
  const lowMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.LOW_MIDDLE_ROLE);
  const midRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.MIDDLE_ROLE);
  const highMidRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.UP_MIDDLE_ROLE);
  const richRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.RICH_ROLE);
  const bezosRole = interaction.guild.roles.cache.get(config.POOPCOIN_SETTINGS.BEZOS_ROLE);
  const member = interaction.guild.members.cache.get(interaction.user.id)
  let role;
  
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
  
  await member.roles.remove([homelessRole, poorRole, lowMidRole, midRole, highMidRole, richRole, bezosRole]);

  await member.roles.add(role);

  await user.update({ rank: role.name });

  const channel = interaction.guild.channels.cache.get(config.POOPCOIN_SETTINGS.POOP_ANNOUNCEMENTS_CHANNEL_ID);

  await channel.send('`' + interaction.user.globalName + '`' + ` has been gambling poopcoin... They now have **${user.coin}** coins! This makes them: ` + '`' + role.name  + '`!' );
}