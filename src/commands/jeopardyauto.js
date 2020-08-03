const { Command } = require('discord-akairo');
const constants = require('../constants');
const util = require('../util/jeopardy');

class JeopardyAutoCommand extends Command {
  constructor() {
    super('jeopardyAuto', {
      aliases: constants.jeopardyAutoAliases,
      channel: 'guild',
    });
  }

  async exec(message) {
    if (util.getChannelState(message.channel.id)) return;

    console.log(`Auto game started by ${message.author.tag}`);
    message.channel.send('```diff\n+ ENDLESS JEOPARDY ON\n```');
    await util.startJeopardyAuto(message.channel);
  }
}

module.exports = JeopardyAutoCommand;
