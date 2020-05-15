const { Command } = require('discord-akairo');
const constants = require('../constants');

class HelpCommand extends Command {
  constructor() {
    super('help', {
      aliases: ['help'],
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
    let dailyCommands = [];
    for (let alias of constants.dailyAliases) {
      dailyCommands.push('`' + constants.prefix + alias + '`');
    }
    message.channel.send(
      `Start a Jeopardy! round by typing ${jeopardyCommands.join('|')}.
Answers must be in the form of a question, e.g. "who is..." or "where are...".
Use \`quit\` or \`${constants.prefix}quit\` to end the round.
See the leaderboard by typing ${leaderboardCommands.join('|')}.
Vote daily by typing ${dailyCommands.join(
        '|'
      )} to earn $1,000 towards your score.
To invite this bot to your server, visit this link: https://top.gg/bot/400786664861204481`
    );
  }
}

module.exports = HelpCommand;
