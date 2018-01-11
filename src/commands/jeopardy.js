const { Command } = require('discord-akairo');
const { get } = require('snekfetch');

class JeopardyCommand extends Command {
  constructor() {
    super('jeopardy', {
      aliases: ['jeopardy', 'quiz', 'trivia'],
      channelRestriction: 'guild',
      cooldown: 2000
    });
  }

  async exec(message) {
    console.log(`Jeopardy game started by ${message.author.tag}`);

    // grab the jeopardy question and parse
    const url = 'http://www.jservice.io/api/random';
    let res = JSON.parse((await get(url)).text);
    if (res.error)
      return message.reply(
        `There was an error: ${res.error}. Status code: ${res.status}`
      );
    const { answer, question, value, category } = res[0];

    const prompt = `The category is \`${
      category.title
    }\` for $${value}: ${question}`;
    message.channel.send(prompt);

    console.log(question);
    console.log(answer);
    console.log(value);

    return;
  }
}

module.exports = JeopardyCommand;
