const Logic = require("./logic/logic");
const { Sequelize } = require('sequelize');
const syncLevelDB = require("./models/levels.model");

module.exports = class Leveling extends Logic {

    constructor({ client, path = 'database.db' }) {
        super();

        this.sequelize = new Sequelize({
            host: 'localhost',
            dialect: 'sqlite',
            logging: false,
            storage: path
        });

        this.client = client;
        this.levelUpMessage = '{user} has reached level {level}!';

        syncLevelDB(this.sequelize);
    };

    /**
     * Message level handler
     * 
     * @param {object} message Discord message object
     * @param {number} multiplier XP multiplier (Default = 3.7)
     * @returns State
     */
    async handleLevel(message, multiplier = 3.7) {

        if (!this.client) return super.clientErr();
        if (!this.sequelize) return super.sequelizeErr();

        if (message.author.bot) return;

        try {
            var user = await this.getUser(message.author.id, message.guild.id);

            var xp = Math.floor(
                (Math.random() * multiplier) // random number * multiplier
                + (message.content.length / 250) // Add message length buff
                + 7 // At least 7 XP per message
            );

            var oldLevel = this.levelFromXp(user.xp);
            user.xp += xp;
            user.level = this.levelFromXp(user.xp);

            await this.sequelize.query(`UPDATE levels SET level = ${user.level}, xp = ${user.xp}, discriminator = "${message.author.discriminator}", username = "${message.author.username}", updatedAt = "${new Date().toUTCString()}" WHERE guildId = "${message.guild.id}" AND userId = "${message.author.id}"`);

            if (oldLevel !== user.level) return user.level;

            return;
        } catch (err) {
            console.log(err);
        }
    };

    /**
     * Levelup message builder
     *
     * @param {string} message Message that will be sent when a user levels up. {user}, {username} and {level} are replaced with their respective values
     */
    setLevelUpMessage(message) {
        this.levelUpMessage = message;
        return this;
    }

    /**
     * Set level
     */
    async setLevel({
        level = Number,
        userId = String,
        guildId = String
    } = {}) {
        await this.createUserIfNoneExists({ guildId: guildId, userId: userId });
        var xp = this.xpFor(level);
        await this.sequelize.query(`UPDATE levels SET level=${level}, xp=${xp}  WHERE guildId = "${guildId}" AND userId = "${userId}"`);
        return this;
    };

    /**
     * Add XP to user
     */
    async addXp({
        amount = Number,
        userId = String,
        guildId = String
    } = {}) {
        await this.createUserIfNoneExists({ guildId: guildId, userId: userId });
        var user = await this.getUser(userId, guildId);

        user.xp += amount;
        user.level = this.levelFromXp(user.xp);

        if (user.xp < 0) user.xp = 0;
        if (user.level < 0) user.level = 0;
        await this.sequelize.query(`UPDATE levels SET xp=${user.xp}, level=${user.level} WHERE guildId = "${guildId}" AND userId = "${userId}"`);
        return this;
    };

    /**
     * Set level
     */
    async deleteGuild(guildId) {
        await this.sequelize.query(`DELETE FROM levels WHERE guildId = "${guildId}"`);
        return this;
    };

    /**
     * Add XP to user
     */
    async addXp({
        amount = Number,
        userId = String,
        guildId = String
    } = {}) {
        await this.createUserIfNoneExists({ guildId: guildId, userId: userId });
        var user = await this.getUser(userId, guildId);

        user.xp += amount;
        user.level = this.levelFromXp(user.xp);

        if (user.xp < 0) user.xp = 0;
        if (user.level < 0) user.level = 0;
        await this.sequelize.query(`UPDATE levels SET xp=${user.xp}, level=${user.level} WHERE guildId = "${guildId}" AND userId = "${userId}"`);
        return this;
    };

    /**
     * Subtract XP from user
     */
    async subXp({
        amount = Number,
        userId = String,
        guildId = String
    } = {}) {
        await this.createUserIfNoneExists({ guildId: guildId, userId: userId });
        var user = await this.getUser(userId, guildId);

        user.xp -= amount;
        user.level = this.levelFromXp(user.xp);

        if (user.xp < 0) user.xp = 0;
        if (user.level < 0) user.level = 0;

        await this.sequelize.query(`UPDATE levels SET xp=${user.xp}, level=${user.level} WHERE guildId = "${guildId}" AND userId = "${userId}"`);

        return this;
    };

    /**
     * Get the previous levels required XP
     * 
     * @param {number} level Users current level
     * @returns xp
     */
    xpForLast(level) {
        var xp = this.xpFor(level - 1);
        return xp;
    };

    /**
     * Get the current levels required XP
     * 
     * @param {number} level Users current level
     * @returns xp
     */
    xpFor(level) {
        var xp = level * level * 100;
        return xp;
    };

    /**
    * Get the current level based of users XP
    * 
    * @param {number} xp Users current XP
    * @returns level
    */
    levelFromXp(xp) {
        var level = Math.floor(0.1 * Math.sqrt(xp));
        return level;
    };

    /**
     * Get the next level of user
     * 
     * @param {number} level Users current level 
     * @returns xp
     */
    xpForNext(level) {
        var xp = this.xpFor(level + 1)
        return xp;
    };

    /**
     * Get user
     * 
     * @param {string} userId User ID
     * @param {string} guildId Guild ID
     * @param {boolean} fetchPosition Fetch users position. True by default
     * @returns user object
     */

    async getUser(userId, guildId, fetchPosition) {

        await this.createUserIfNoneExists({ guildId: guildId, userId: userId });

        var [user, meta] = await this.sequelize.query(`SELECT * FROM levels WHERE guildId = "${guildId}" AND userId = "${userId}"`);

        user = user[0];
        // clean XP for use with canvacord, current XP and goal
        user.cleanXp = user.xp - this.xpFor(user.level);
        user.cleanNextLevelXp = this.xpFor(user.level + 1) - this.xpFor(user.level);

        // Add username/desc
        var fetchUser = await this.client.guilds.cache.get(guildId).members.cache.get(user.userId);
        user.discriminator = fetchUser.user.discriminator;
        user.username = fetchUser.user.username;

        if (fetchPosition === true) {
            var lb = await this.leaderboard(guildId);
            user.position = lb.findIndex(i => i.userId === userId) + 1;
        }

        return user;
    };

    /**
     * Create user if none exists
     */
    async createUserIfNoneExists(
        {
            userId = String,
            guildId = String,
        } = {}) {

        var [doesExist, meta] = await this.sequelize.query(`SELECT * FROM levels WHERE guildId = "${guildId}" AND userId = "${userId}"`);

        await this.client.guilds.cache.get(guildId).members.fetch();
        var user = await this.client.guilds.cache.get(guildId).members.cache.get(userId);
        if (!doesExist.length) await this.sequelize.query(`INSERT INTO levels (xp, level, userId, guildId, discriminator, username, createdAt, updatedAt) VALUES(0, 0, "${userId}", "${guildId}", "${user.user.discriminator}", "${user.user.username}", "${new Date().toUTCString()}", "null")`)
    }

    /**
     * Get all users in guild
     * 
     * @param {string} guildId Guild ID
     * @param {number} page Returns 10 results; page 1 is top 10, page 2 is 11-21, etc. Default returns first page
     * @returns users array ranked by XP
     */
    async leaderboard(guildId, page = null) {
        var [users, meta] = await this.sequelize.query(`SELECT * FROM levels WHERE guildId = "${guildId}" ORDER BY xp DESC`);

        var leaderboard = [];

        var totalPages = Math.ceil(users.length / 10); // Total page count

        // Handle pages
        page === null
            ? page = 1
            : page = page;

        // If requested page does not exist; aka too high
        if (page > totalPages) page = totalPages;

        await this.client.guilds.cache.get(guildId).members.fetch();

        // Get page
        await users.forEach(async (user, i) => {
            if ((Math.ceil((i + 1) / 10)) !== page) return; // Only return 10 users per page
            user.position = i + 1;

            var fetchedUser = await this.client.guilds.cache.get(guildId).members.cache.get(user.userId);

            user.discriminator = fetchedUser.user.discriminator;
            user.username = fetchedUser.user.username;

            leaderboard.push(user);
        });

        return leaderboard;
    };

    /**
     * Convert number to shorthand
     * 
     * @param {number} number Number to convert to short hand
     * @returns Short hand number
     */
    format(number) {
        var formatter = Intl.NumberFormat('en', { notation: 'compact' })
        number = formatter.format(number);
        return number;
    }

    /**
     * Handles leveling up message
     * 
     * @param {number} level Users level
     * @param {message object} messageObject Discord message object
     * @returns state 
     */
    async levelUp(level, messageObject) {
        await messageObject.channel.send(this.levelUpMessage.replace(/{level}/g, level).replace(/{user}/g, messageObject.author).replace(/{username}/g, messageObject.author.username.replace(/_/g, '\\_')));

        return this;
    };

    /**
     * Handle role adding/removing. Adds roles that need to be added, and removed roles that need to be removed
     * 
     * @param {number} userLevel Users current level
     * @param {message object} message Discord message object
     * @param {object[]} roles Object array of roles. Example: [ { roleId: "1234567890", level: 2, sticky: false } ]
     * @returns state
     */
    async handleRoles(userLevel, message, roles) {
        try {

            var addRoles = [];

            await roles.find(r => { if (r.level === userLevel) addRoles.push(r); }); // Add roles with level to addRoles array

            if (!addRoles.length) return; // Keeps roles till next level role

            var guild = await this.client.guilds.cache.get(message.guild.id);
            var user = await guild.members.cache.get(message.author.id);

            addRoles.forEach(async (role) => {
                await user.roles.add(role.roleId);
            });

            // Removed previous roles
            var removeRoles = [];

            await roles.find(r => { r.level < (userLevel - 1); removeRoles.push(r) }); // Adds previous roles

            removeRoles.forEach(async (role) => {
                if (role.sticky) return;
                await user.roles.remove(role.roleId);
            });

            return this;
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * Caches image in a discord channel to allow for use in embeds
     * 
     * @param {AttachmentBuilder} img Discord attachment
     * @param {string} channelId Channel ID
     * @returns image URL
     */
    async cacheImg(img, channelId) {
        var image;
        await this.client.channels.cache.get(`${channelId}`).send({ files: [img] }).then((msg) => {
            image = msg.attachments.map((img) => img)[0];
        });

        return {
            url: image.url,
            name: image.name
        };
    }
};