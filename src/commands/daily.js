const { Command } = require('discord-akairo');
const constants = require('../constants');
const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

class DailyCommand extends Command {
  constructor() {
    super('daily', {
      aliases: constants.dailyAliases,
      channelRestriction: 'guild',
    });
  }

  exec(message) {
    console.log(message);
    this.dbl.getBot('400786664861204481').then((bot) => {
      console.log(bot.username);
    });
  }
}

module.exports = DailyCommand;
