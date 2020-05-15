const { Command } = require('discord-akairo');
const constants = require('../constants');

class DailyCommand extends Command {
  constructor() {
    super('daily', {
      aliases: constants.dailyAliases,
      channelRestriction: 'guild',
    });
  }

  exec(message) {
    message.channel.send(
      `You can vote every 12 hours to earn $1,000 towards your score. Earn double on weekends! <https://top.gg/bot/400786664861204481/vote>`
    );
    return;
  }
}

module.exports = DailyCommand;
