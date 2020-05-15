const { Command } = require('discord-akairo');
const DBL = require('dblapi.js');
const constants = require('../constants');
const AWS = require('aws-sdk');

AWS.config.update({
  region: 'us-west-2',
});

const docClient = new AWS.DynamoDB.DocumentClient();

// const dbl = new DBL(process.env.TOPGG_TOKEN, this.client);

class DailyCommand extends Command {
  constructor() {
    super('daily', {
      aliases: constants.dailyAliases,
      channelRestriction: 'guild',
    });
  }

  exec(message) {
    console.log('Daily...');
  }
}

module.exports = DailyCommand;
