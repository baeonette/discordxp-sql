var { Sequelize } = require('sequelize');
function syncLevelDB(sequelize) {
    const LevelDB = sequelize.define('levels', {
        xp: {
            type: Sequelize.INTEGER
        },
        level: {
            type: Sequelize.INTEGER
        },
        userId: {
            type: Sequelize.STRING
        },
        guildId: {
            type: Sequelize.STRING
        },
        username: {
            type: Sequelize.STRING
        },
        discriminator: {
            type: Sequelize.STRING
        }
    });

    LevelDB.sync();
}

module.exports = syncLevelDB;