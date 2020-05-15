const { Command } = require('discord-akairo');
const constants = require('../constants');
const AWS = require('aws-sdk');
const { dbl } = require('../app');

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
    console.log('Daily...');
    dbl.getBot('400786664861204481').then((bot) => {
      console.log(bot.username);
    });
  }
}

module.exports = DailyCommand;
