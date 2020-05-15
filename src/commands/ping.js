const { Command } = require('discord-akairo');

class PingCommand extends Command {
  constructor() {
    super('ping', {
      aliases: ['ping'],
      channelRestriction: 'guild',
    });
  }

  exec(message) {
    message.channel.send('pong');
    return;
  }
}

module.exports = PingCommand;
