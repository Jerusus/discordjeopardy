const { Command } = require('discord-akairo');
const { get } = require('snekfetch');
const stringSimilarity = require('string-similarity');
const constants = require('../constants');

class JeopardyCommand extends Command {
  constructor() {
    super('jeopardy', {
      aliases: ['jeopardy', 'quiz', 'trivia'],
      channelRestriction: 'guild',
      cooldown: constants.jeopardyCooldown
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

    // TODO get rid of this, you cheater
    console.log(answer);

    const finish = await new Promise((resolve, reject) => {
      const collector = message.channel.createMessageCollector(
        m => m.author.username != 'JeopardyBot',
        {
          time: constants.roundTime
        }
      );
      collector.on('collect', m => {
        const triggers = [''];
        if (m == 'quit') {
          collector.stop(1);
        } else if (
          m.toString().startsWith(constants.prefix) &&
          ['jeopardy', 'quiz', 'trivia'].indexOf(m.toString() > -1)
        ) {
          // trying to start a new round
          collector.stop(2);
        } else if (isQuestionFormat(m)) {
          if (isAnswerCorrect(m, answer)) {
            // TODO update score and text below
            message.channel.send(
              `That is correct, ${
                m.author.username
              }! Your score is now +$${value} (TBD)`
            );
            collector.stop(3);
          } else {
            // TODO update score and text below
            message.channel.send(
              `That is incorrect, ${
                m.author.username
              }. Your score is now -$${value} (TBD)`
            );
          }
        }
      });
      collector.on('end', (m, reason) => {
        // 0: quit
        // 1: timeout
        // 2: start a new round before current one is over
        // 3: correct answer
        if (reason == 1 || reason == 2) {
          message.channel.send(
            `Time's up! The correct answer was \`${answer}\`.`
          );
        }
        console.log(reason);
        return resolve(reason);
      });
    });

    // TODO logic depending on the value of 'finish', from resolve
    return message.reply('done');
  }
}

function isAnswerCorrect(message, answer) {
  let text = message
    .toString()
    .replace(/[^\w\s]/i, '')
    .replace(
      /^(what is|what are|whats|where is|where are|wheres|who is|who are|whos) /i,
      ''
    )
    .toLowerCase();
  var similarity = stringSimilarity.compareTwoStrings(
    text,
    answer.toLowerCase()
  );
  if (similarity > constants.similarityThreshold) {
    return true;
  } else {
    return false;
  }
}

// strip punctuation and crude check for question format
// returns truthy value if it is
function isQuestionFormat(message) {
  let text = message.toString();
  return text
    .replace(/[^\w\s]/i, '')
    .match(
      /^(what is|what are|whats|where is|where are|wheres|who is|who are|whos) /i
    );
}

module.exports = JeopardyCommand;
