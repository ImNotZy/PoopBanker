const { SlashCommandBuilder, EmbedBuilder, ModalBuilder, TextInputBuilder } = require("@discordjs/builders");
const config = require('../../config.json');
const { List, Player } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stand')
    .setDescription('Stand in a game of blackjack.'),
    async execute(interaction) {
    if(!config.POOPCOIN_SETTINGS.BJ_ENABLED) return interaction.reply({ content: 'Blackjack is currently disabled.', ephemeral: true });

    //defer reply to buy time for code to run
    await interaction.deferReply();

    try {
      //get user and player data
      const player = await Player.findOne({ where: { user: interaction.user.id } });
      const user = await List.findOne({ where: { user: interaction.user.id } });
      
      //check if user is in game
      if (!player) {
        return await interaction.editReply({ content: 'You are not currently playing a blackjack game.', ephemeral: true });
      }

      //calculate scores 
      let playerScore = calculateHandValue([...player.hand]);
      let dealerScore = calculateHandValue([...player.dealerHand]);

      //check dealerHand before drawing another card
      if (dealerScore == playerScore) {
        await player.destroy();
        changeRole(interaction, user);
        await user.update({ coin: user.coin + player.bet });
        return await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nStandoff! You get your bet back!` });
        //if the dealerscore is greater than 21, update coins, destroy the player, run changeRole, add doubled bet amount to user.coins
      } else if (dealerScore > 21) {
        await user.update({ coin: user.coin + (player.bet * 2)});
        await player.destroy();
        changeRole(interaction, user);
        return await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nDealer busts! You win: **${player.bet * 2}** Poopcoin!`});
        //if dealerScore is greater than playerScore, destroy player, runChangeRole, take away bet amount 
      } else if (dealerScore > playerScore) {
        await player.destroy();
        changeRole(interaction, user);
        return await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nDealer wins! You lose: **${player.bet}** Poopcoin!`});
      } else {
        //loop drawing cards until dealer either wins, loses, or standoff
        while (true) {
          //draw a new card and calcualte the value of the hand
          const newCard = drawCard();
          player.dealerHand.push(newCard);
          dealerScore += calculateHandValue([newCard]);
      
          //if the dealerScore and playerScore are the same destroy player run changeRole, do not take any money
          if (dealerScore == playerScore) {
            await player.destroy();
            changeRole(interaction, user);
            await user.update({ coin: user.coin + player.bet });
            await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nStandoff! You get your bet back!` });
            break;
            //if the dealerscore is greater than 21, update coins, destroy the player, run changeRole, add doubled bet amount to user.coins
          } else if (dealerScore > 21) {
            await user.update({ coin: user.coin + (player.bet * 2)});
            await player.destroy();
            changeRole(interaction, user);
            await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nDealer busts! You win: **${player.bet * 2}** Poopcoin!`});
            break;
            //if dealerScore is greater than playerScore, destroy player, runChangeRole, take away bet amount 
          } else if (dealerScore > playerScore) {
            await player.destroy();
            changeRole(interaction, user);
            await interaction.editReply({ content: `Dealers Hand: ${handToString([...player.dealerHand])} | Thats: **${dealerScore}!**\nDealer wins! You lose: **${player.bet}** Poopcoin!`});
            break;
          }
        }
      }
    } catch (error) {
      console.log(error);
      return await interaction.editReply({ content: 'Something went wrong when standing the hand.', ephemeral: true });
    }
  }
}

//drawCard function
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

//handToString function
function handToString(hand) {
  return hand.map(card => `**${card.rank}${card.suit}**`).join(', ');
}

//change role function
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