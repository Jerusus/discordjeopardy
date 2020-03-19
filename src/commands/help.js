const { Command } = require('discord-akairo');
const constants = require('../constants');

class HelpCommand extends Command {
  constructor() {
    super('help', {
      aliases: ['help']
    });
  }

  exec(message) {
    let jeopardyCommands = [];
    for (let alias of constants.jeopardyAliases) {
      jeopardyCommands.push('`' + constants.prefix + alias + '`');
    }
    let leaderboardCommands = [];
    for (let alias of constants.leaderboardAliases) {
      leaderboardCommands.push('`' + constants.prefix + alias + '`');
    }
    message.channel.send(
      `Start a Jeopardy! round by typing ${jeopardyCommands.join('|')}.`
    );
    message.channel.send(
      'Answers must be in the form of a question, e.g. "who is..." or "where are...".'
    );
    message.channel.send(
      `Use \`quit\` or \`${constants.prefix}quit\` to end the round.`
    );
    // message.channel.send(
    //   `See the leaderboard by typing ${leaderboardCommands.join('|')}.`
    // );
    return;
  }
}

module.exports = HelpCommand;
