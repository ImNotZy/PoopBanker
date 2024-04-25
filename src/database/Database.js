const Squelize = require ('sequelize');

const sequelize = new Squelize('database', 'user', 'password', {
    dialect: 'sqlite',
    host: 'localhost',

    storage: 'PoopSocietyDatabase.sqlite',
    logging: false,
});

const List = sequelize.define('list', {
    user: Squelize.INTEGER,
    username: Squelize.STRING,
    coin: Squelize.INTEGER,
    rank: Squelize.STRING,
    plays: Squelize.INTEGER
});

const Player = sequelize.define('player', {
    user: Squelize.INTEGER,
    bet: Squelize.INTEGER,
    hand: Squelize.JSON,
    dealerHand: Squelize.JSON
}, {
    tableName: 'players'
});

const LastPlay = sequelize.define('lastPlays', {
    user: Squelize.INTEGER,
    time: Squelize.DATE
}, {
    tableName: 'lastPlays'
});

module.exports = {
    sequelize,
    List,
    Player,
    LastPlay
}