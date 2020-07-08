const { Command } = require('discord-akairo');
const { get } = require('snekfetch');
const constants = require('../constants');
const AWS = require('aws-sdk');
const util = require('../util/jeopardy');

class JeopardyCommand extends Command {
  constructor() {
    super('jeopardy', {
      aliases: constants.jeopardyAliases,
      channelRestriction: 'guild',
      cooldown: constants.jeopardyCooldown,
    });
  }

  async exec(message) {
    console.log(`Jeopardy game started by ${message.author.tag}`);

    await util.startJeopardyInChannel(message.channel);
  }
}

module.exports = JeopardyCommand;
