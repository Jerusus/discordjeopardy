const { Command } = require('discord-akairo');
const constants = require('../constants');

class HelpCommand extends Command {
  constructor() {
    super('help', {
      aliases: ['help']
    });
  }

  exec(message) {
    let commands = [];
    for (let alias of constants.jeopardyAliases) {
      commands.push('`' + constants.prefix + alias + '`');
    }
    message.channel.send(
      `Start a Jeopardy! round by using ${commands.join('|')}.`
    );
    message.channel.send(
      'Answers must be in the form of a question, e.g. "who is..." or "where are...".'
    );
    message.channel.send(
      `Use \`quit\` or \`${constants.prefix}quit\` to end the round.`
    );
    return;
  }
}

module.exports = HelpCommand;
