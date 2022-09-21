module.exports = class Logic {
    constructor(sequelize, client) {
        this.sequelize = sequelize;
        this.client = client;
    };

    sequelizeErr() {
        throw TypeError('Sequelize is required as a class parameter; None was provided');
    }
    clientErr() {
        throw TypeError('The Discord client object is required as a class parameter; None was provided');
    }
};