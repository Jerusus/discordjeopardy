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
      jeopardyCommands.push('`' + constants.flag + alias + '`');
    }
    let jeopardyAutoCommands = [];
    for (let alias of constants.jeopardyAutoAliases) {
      jeopardyAutoCommands.push('`' + constants.flag + alias + '`');
    }
    let leaderboardCommands = [];
    for (let alias of constants.leaderboardAliases) {
      leaderboardCommands.push('`' + constants.flag + alias + '`');
    }
    let dailyCommands = [];
    for (let alias of constants.dailyAliases) {
      dailyCommands.push('`' + constants.flag + alias + '`');
    }
    message.channel.send(
      `Start a Jeopardy! round by typing ${jeopardyCommands.join('|')}.
Turn on endless jeopardy for your channel by typing ${jeopardyAutoCommands.join(
        '|'
      )}. Skip questions using \`skip\` or \`t.skip\`.
Answers must be in the form of a question, e.g. "who is..." or "where are...".
Use \`quit\` or \`${
        constants.flag
      }quit\` to end the round or turn off endless jeopardy.
See the leaderboard by typing ${leaderboardCommands.join('|')}.
Vote daily by typing ${dailyCommands.join(
        '|'
      )} to earn $1,000 towards your score.
To invite this bot to your server, visit this link: <https://top.gg/bot/400786664861204481>`
    );
  }
}

module.exports = HelpCommand;
