const { Command } = require('discord-akairo');
const constants = require('../constants');
const util = require('../util/jeopardy');

class JeopardyAutoCommand extends Command {
  constructor() {
    super('jeopardyAuto', {
      aliases: constants.jeopardyAutoAliases,
      channelRestriction: 'guild',
    });
  }

  async exec(message) {
    if (util.getChannelState(message.channel.id)) return;

    console.log(`Auto game started by ${message.author.tag}`);
    util.setChannelState(message.channel.id, true);
    message.channel.send('**--ENDLESS JEOPARDY ON--**');
    let val = await util.startJeopardyAuto(message.channel);
    util.setChannelState(message.channel.id, val);
  }
}

module.exports = JeopardyAutoCommand;
