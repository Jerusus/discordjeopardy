const { Command } = require('discord-akairo');

class JoinCommand extends Command {
  constructor() {
    super('join', {
      aliases: ['join'],
    });
  }

  exec(message) {
    message.channel.send('https://discord.gg/zMmvVq5');
  }
}

module.exports = JoinCommand;
