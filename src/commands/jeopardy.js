const { Command } = require('discord-akairo');
const constants = require('../constants');
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
    if (util.getChannelState(message.channel.id)) return;

    console.log(`Game started by ${message.author.tag}`);
    await util.startJeopardyOnDemand(message.channel);
  }
}

module.exports = JeopardyCommand;
