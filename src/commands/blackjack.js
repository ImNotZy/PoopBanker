const config = require('../../config.json');
const { SlashCommandBuilder } = require("@discordjs/builders");
const { List, Player, LastPlay } = require('../database/Database');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a game of blackjack.')
    .addIntegerOption(option => option.setName('bet').setDescription('The amount you will bet.').setRequired(true)),
    async execute(interaction) {
    //check for enbaled
    if(!config.POOPCOIN_SETTINGS.BJ_ENABLED) return interaction.reply({ content: 'Blackjack is currently disabled.', ephemeral: true });
      
    //get bet amount
    const betAmount = interaction.options.getInteger('bet');

    //defer reply to buy time for code to run
    await interaction.deferReply();

    try {
      //sync data
      await Player.sync();
      await LastPlay.sync();
    
      //get user
      const user = await List.findOne({ where: { user: interaction.user.id } });
      
      //check for user in database
      if (!user) {
        return await interaction.editReply({ content: 'You must be apart of the poop bank to play!', ephemeral: true });
      }

      //check to see if user has bet any coin
      if(betAmount == 0) {
        return await interaction.editReply({ content: 'You need to bet atleast 1 poopcoin to play!', ephemeral: true });
      }

      //check if negative bet
      if(betAmount < 0) {
        return await interaction.editReply({ content: 'You cannot bet negative amounts!', ephemeral: true });
      }

      //check if user has enough for bet
      if(betAmount > user.coin) {
        return await interaction.editReply({ content: 'You cannot bet more than you have!', ephemeral: true });
      }

      //find user in last play database
      const playCheck = await LastPlay.findOne({ where: { user: interaction.user.id }});

      //check for timer set
      if(playCheck) {
        const now = new Date();
        let hourLater = playCheck.time;
        hourLater.setHours(hourLater.getHours() + 1);
        //check to see if user is at max plays
        if(user.plays >= config.POOPCOIN_SETTINGS.MAX_BJ_PLAYS_PER_HR) {
          //check if hour has passed, if so destroy last plays and reset user.plays to 0
          if(now.getTime() >= hourLater.getTime()) {
            playCheck.destroy();
            await user.update({ plays: 0 });
            return await interaction.editReply({ content: `Your time has passed! You can now play backjack!`, ephemeral: true });
          } else {
            return await interaction.editReply({ content: `You have reached your maximum plays this hour! You can play again at: **${hourLater.toLocaleTimeString('en-US')}!**`, ephemeral: true });
          }
        } else {
          //increment user plays
          await user.update({ plays: user.plays + 1 });
        }
      } else {
        //if no timer set create one
        const now = new Date();
        await LastPlay.create({ user: interaction.user.id, time: now }); 
      }

      //check for user in player database
      const player = await Player.findOne({ where: { user: interaction.user.id } });

      //check to see if player already has active game
      if(player) { 
        return await interaction.editReply({ content: 'You already have an active game!', ephemeral: true })
      }

      //take away coin for bet from user
      await user.update({ coin: user.coin - betAmount });

      //draw player and dealer hand
      const playerHand = drawCards();
      const dealerHand = drawCards();

      //create new player
      await Player.create({ user: interaction.user.id, bet: betAmount, hand: playerHand, dealerHand: dealerHand });

      //get player score
      const playerScore = calculateHandValue(playerHand);

      //if player draws 21 then end the game else display both hands and options
      if(playerScore == 21) {
        const playerHandString = handToString(playerHand);
        const reply = `You bet: **${betAmount}** Poopcoin!\nYou have **${config.POOPCOIN_SETTINGS.MAX_BJ_PLAYS_PER_HR - user.plays}** games remaining!\nYour hand: ${playerHandString} | Thats: **${playerScore}!**\nBlackjack! You win **${betAmount * 2}** Poopcoin!`;
        await user.update({ coin: user.coin + player.bet * 2 });
        player.destroy();
        changeRole(interaction, user);
        return await interaction.editReply({ content: reply });
      } else {
        const playerHandString = handToString(playerHand);
        const dealerHandString = `**${dealerHand[0].rank}${dealerHand[0].suit}** and one hidden card`;
        const reply = `You bet: **${betAmount}** Poopcoin!\nYou have **${config.POOPCOIN_SETTINGS.MAX_BJ_PLAYS_PER_HR - user.plays}** games remaining!\nYour hand: ${playerHandString} | Thats: **${playerScore}!**\nDealer's hand: ${dealerHandString}\n*In the future, if your hand does not show, use /show-hand*\n**Type /hit or /stand**`;
        return await interaction.editReply({ content: reply });
      }
    } catch (error) {      
      console.error('Error creating blackjack game:', error);
      return interaction.editReply({ content: 'Something went wrong creating a blackjack game.', ephemeral: true });
    }
  }
}

//draw single card function
function drawCard() {
  const suits = ['♠️', '♥️', '♦️', '♣️'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  const suit = suits[Math.floor(Math.random() * suits.length)];
  const rank = ranks[Math.floor(Math.random() * ranks.length)];

  return { rank, suit };
}

//draw 2 cards function
function drawCards(numCards = 2) {
  const cards = [];
  for (let i = 0; i < numCards; i++) {
    cards.push(drawCard());
  }
  return cards;
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